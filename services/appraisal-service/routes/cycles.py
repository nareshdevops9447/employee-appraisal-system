from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models.appraisal_cycle import AppraisalCycle
from models.appraisal_question import AppraisalQuestion
from models.appraisal import Appraisal

cycles_bp = Blueprint('cycles', __name__)

# Helper: Auto-create appraisals for all active users
def _create_appraisals_for_active_users(cycle_id, criteria=None):
    import requests
    from utils.eligibility import is_eligible_for_cycle
    from datetime import date

    user_service_url = current_app.config.get('USER_SERVICE_URL')
    if not user_service_url:
        print("Error: USER_SERVICE_URL not set")
        return

    try:
        cycle = AppraisalCycle.query.get(cycle_id)
        if not cycle: return

        # 1. Construct User Service Query
        params = {
            'is_active': 'true',
            'per_page': 1000
        }
        
        # Apply strict filters to the API call if present
        if criteria:
            if criteria.get('department_id') and criteria.get('department_id') != 'all':
                params['department_id'] = criteria.get('department_id')
            if criteria.get('employment_type') and criteria.get('employment_type') != 'all':
                params['employment_type'] = criteria.get('employment_type')

        # Authentication for internal call
        headers = {}
        if request.headers.get('Authorization'):
            headers['Authorization'] = request.headers.get('Authorization')

        # 2. Fetch Users
        resp = requests.get(f"{user_service_url}/api/users", params=params, headers=headers, timeout=10)
        if resp.status_code != 200:
            print(f"Failed to fetch users: {resp.text}")
            return

        users = resp.json().get('users', [])
        
        # 3. Apply Date-Based Eligibility Logic (in-memory)
        eligibility_rule = criteria.get('eligibility_rule', 'auto') if criteria else 'auto'
        
        count = 0
        skipped = 0
        
        for user in users:
            # Parse user dates
            start_date_str = user.get('start_date')
            user_start_date = date.fromisoformat(start_date_str) if start_date_str else None
            
            # Check Eligibility
            is_eligible = is_eligible_for_cycle(
                user_start_date, 
                cycle.start_date, 
                cycle.end_date, 
                rule=eligibility_rule
            )
            
            if not is_eligible:
                skipped += 1
                continue

            # Check if appraisal already exists for this user in this cycle
            exists = Appraisal.query.filter_by(cycle_id=cycle_id, employee_id=user['id']).first()
            if not exists:
                appraisal = Appraisal(
                    cycle_id=cycle_id,
                    employee_id=user['id'],
                    manager_id=user.get('manager_id'), # Might be None for CEO
                    status='not_started'
                )
                db.session.add(appraisal)
                count += 1
        
        db.session.commit()
        print(f"Created {count} appraisals for cycle {cycle_id}. Skipped {skipped} ineligible users.")

    except Exception as e:
        print(f"Error creating appraisals: {e}")


@cycles_bp.route('/', methods=['POST'])
def create_cycle():
    data = request.get_json()
    
    # helper to parse date
    def parse_date(d): 
        if not d: return None
        # Handle 'Z' suffix for UTC, which fromisoformat might not like in older python
        d = d.replace('Z', '+00:00')
        return datetime.fromisoformat(d).date()

    cycle = AppraisalCycle(
        name=data['name'],
        description=data.get('description'),
        cycle_type=data.get('cycle_type', 'annual'),
        start_date=parse_date(data['start_date']),
        end_date=parse_date(data['end_date']),
        self_assessment_deadline=parse_date(data.get('self_assessment_deadline')),
        manager_review_deadline=parse_date(data.get('manager_review_deadline')),
        created_by=request.headers.get('X-User-Id', 'system'), # From Gateway
        status='draft'
    )
    db.session.add(cycle)
    db.session.commit()
    
    return jsonify(cycle.to_dict()), 201

@cycles_bp.route('/', methods=['GET'])
def list_cycles():
    # 1. Lazy Expiration Check
    active_cycles = AppraisalCycle.query.filter_by(status='active').all()
    today = datetime.now(timezone.utc).date()
    
    expired_count = 0
    for cycle in active_cycles:
        if cycle.end_date < today:
            cycle.status = 'completed'
            expired_count += 1
            
    if expired_count > 0:
        db.session.commit()
        print(f"Auto-completed {expired_count} expired cycles.")

    # 2. Return all cycles
    cycles = AppraisalCycle.query.order_by(AppraisalCycle.created_at.desc()).all()
    return jsonify([c.to_dict() for c in cycles])

@cycles_bp.route('/<id>', methods=['GET'])
def get_cycle(id):
    cycle = AppraisalCycle.query.get_or_404(id)
    questions = [q.to_dict() for q in cycle.questions]
    data = cycle.to_dict()
    data['questions'] = questions
    return jsonify(data)

@cycles_bp.route('/<id>/activate', methods=['POST'])
def activate_cycle(id):
    cycle = AppraisalCycle.query.get_or_404(id)
    
    # Get criteria from request body (optional)
    criteria = request.get_json() or {}
    
    if cycle.status == 'active':
        # Allow re-activation to sync new users
        print(f"Syncing users for active cycle {cycle.id} with criteria {criteria}...")
    else:
        cycle.status = 'active'
        db.session.commit()
    
    # Trigget async creation of appraisals
    _create_appraisals_for_active_users(cycle.id, criteria)
    
    return jsonify({'message': 'Cycle activated and appraisals generated', 'cycle': cycle.to_dict()})

@cycles_bp.route('/<id>/stop', methods=['POST'])
def stop_cycle(id):
    cycle = AppraisalCycle.query.get_or_404(id)
    if cycle.status != 'active':
        return jsonify({'error': 'Only active cycles can be stopped'}), 400
        
    cycle.status = 'draft'
    db.session.commit()
    return jsonify({'message': 'Cycle stopped and reverted to draft', 'cycle': cycle.to_dict()})

@cycles_bp.route('/<id>', methods=['PUT'])
def update_cycle(id):
    cycle = AppraisalCycle.query.get_or_404(id)
    data = request.get_json()
    
    # If cycle is Active, limit what can be edited?
    # User asked to "stop and edit", so they will be in draft mode when editing.
    
    if 'name' in data: cycle.name = data['name']
    if 'description' in data: cycle.description = data['description']
    
    def parse_date(d): 
        if not d: return None
        d = d.replace('Z', '+00:00')
        return datetime.fromisoformat(d).date()

    if 'start_date' in data: cycle.start_date = parse_date(data['start_date'])
    if 'end_date' in data: cycle.end_date = parse_date(data['end_date'])
    if 'self_assessment_deadline' in data: 
        cycle.self_assessment_deadline = parse_date(data['self_assessment_deadline'])
    if 'manager_review_deadline' in data: 
        cycle.manager_review_deadline = parse_date(data['manager_review_deadline'])
        
    db.session.commit()
    return jsonify(cycle.to_dict())

@cycles_bp.route('/<id>/questions', methods=['POST'])
def add_questions(id):
    cycle = AppraisalCycle.query.get_or_404(id)
    data = request.get_json()
    
    # Expects list of questions or single question
    if isinstance(data, dict):
        data = [data]
        
    created = []
    for q_data in data:
        q = AppraisalQuestion(
            cycle_id=cycle.id,
            question_text=q_data['question_text'],
            question_type=q_data.get('question_type', 'text'),
            category=q_data.get('category'),
            order=q_data.get('order', 0),
            is_required=q_data.get('is_required', True),
            is_for_self=q_data.get('is_for_self', True),
            is_for_manager=q_data.get('is_for_manager', True)
        )
        db.session.add(q)
        created.append(q)
        
    db.session.commit()
    return jsonify([q.to_dict() for q in created]), 201
