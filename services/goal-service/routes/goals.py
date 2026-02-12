from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from extensions import db
from models.goal import Goal
from models.key_result import KeyResult
from models.goal_comment import GoalComment

goals_bp = Blueprint('goals', __name__)

@goals_bp.route('/', methods=['POST'])
def create_goal():
    user_id = request.headers.get('X-User-Id')
    data = request.get_json()
    
    # helper to parse date
    def parse_date(d): return datetime.fromisoformat(d).date() if d else None

    goal = Goal(
        employee_id=user_id, # Self-created typically
        title=data['title'],
        description=data.get('description'),
        category=data.get('category', 'performance'),
        priority=data.get('priority', 'medium'),
        status='draft',
        start_date=parse_date(data['start_date']),
        target_date=parse_date(data['target_date']),
        parent_goal_id=data.get('parent_goal_id'),
        appraisal_cycle_id=data.get('appraisal_cycle_id'),
        created_by=user_id,
        approval_status='pending'
    )
    db.session.add(goal)
    db.session.commit()
    
    # Optional: Initial Key Results
    if 'key_results' in data:
        for kr_data in data['key_results']:
            kr = KeyResult(
                goal_id=goal.id,
                title=kr_data['title'],
                target_value=kr_data['target_value'],
                unit=kr_data.get('unit', 'percentage'),
                due_date=parse_date(kr_data.get('due_date')) or goal.target_date
            )
            db.session.add(kr)
        db.session.commit()
    
    return jsonify(goal.to_dict()), 201

@goals_bp.route('/', methods=['GET'])
def list_goals():
    user_id = request.headers.get('X-User-Id')
    user_role = request.headers.get('X-User-Role')
    
    scope = request.args.get('scope', 'mine') 
    
    query = Goal.query

    if scope == 'mine':
        query = query.filter_by(employee_id=user_id)
    elif scope == 'team':
        # Need to filter by manager's team. 
        # Ideally, we pass manager_id param or trust the caller knows who is in their team.
        # But for 'team', we receive X-User-Id as the manager.
        # However, Goal service doesn't know who reports to who.
        # So we likely need `?employee_id=XYZ` filter OR fetch all goals where creator/approver is me?
        # Actually, simpler: The API Gateway or Frontend passes `employee_id` filter for team members.
        # Or, we trust the caller.
        pass
    
    # Filters
    employee_id = request.args.get('employee_id')
    if employee_id:
        query = query.filter_by(employee_id=employee_id)
        
    cycle_id = request.args.get('cycle_id')
    if cycle_id:
        query = query.filter_by(appraisal_cycle_id=cycle_id)
        
    status = request.args.get('status')
    if status:
        query = query.filter_by(status=status)

    goals = query.order_by(Goal.created_at.desc()).all()
    return jsonify([g.to_dict() for g in goals])

@goals_bp.route('/<id>', methods=['GET'])
def get_goal(id):
    goal = Goal.query.get_or_404(id)
    # Access control logic here (owner, manager, HR) via X-User-Id
    # For prototype, skipping strict check
    
    data = goal.to_dict()
    data['comments'] = [c.to_dict() for c in goal.comments]
    return jsonify(data)

@goals_bp.route('/<id>', methods=['PUT'])
def update_goal(id):
    goal = Goal.query.get_or_404(id)
    data = request.get_json()
    
    if 'title' in data: goal.title = data['title']
    if 'description' in data: goal.description = data['description']
    if 'status' in data: goal.status = data['status']
    if 'priority' in data: goal.priority = data['priority']
    
    db.session.commit()
    return jsonify(goal.to_dict())

@goals_bp.route('/<id>/progress', methods=['PUT'])
def update_progress(id):
    goal = Goal.query.get_or_404(id)
    data = request.get_json()
    
    # Manual update if no KRs, or override
    if 'progress_percentage' in data:
        goal.progress_percentage = data['progress_percentage']
        
    db.session.commit()
    return jsonify(goal.to_dict())

@goals_bp.route('/<id>/approve', methods=['PUT'])
def approve_goal(id):
    user_id = request.headers.get('X-User-Id')
    goal = Goal.query.get_or_404(id)
    
    data = request.get_json()
    status = data.get('status') # approved, revision_requested
    
    if status not in ['approved', 'revision_requested']:
        return jsonify({'error': 'Invalid status'}), 400
        
    goal.approval_status = status
    if status == 'approved':
        goal.approved_by = user_id
        goal.status = 'active'
        
    db.session.commit()
    return jsonify(goal.to_dict())
