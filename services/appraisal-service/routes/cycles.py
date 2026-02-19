from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models.appraisal_cycle import AppraisalCycle
from models.appraisal_question import AppraisalQuestion
from models.appraisal import Appraisal
from utils.rbac import require_auth, require_role

cycles_bp = Blueprint('cycles', __name__)


def _create_appraisals_for_active_users(cycle_id, criteria=None):
    """Auto-create appraisals for eligible active users."""
    import requests
    from datetime import date

    user_service_url = current_app.config.get('USER_SERVICE_URL')
    if not user_service_url:
        print("Error: USER_SERVICE_URL not set in config")
        return

    try:
        cycle = AppraisalCycle.query.get(cycle_id)
        if not cycle:
            print(f"Error: Cycle {cycle_id} not found")
            return

        params = {'is_active': 'true', 'per_page': 1000}

        if criteria:
            dept_id = criteria.get('department_id')
            if dept_id and dept_id != 'all':
                params['department_id'] = dept_id
            emp_type = criteria.get('employment_type')
            if emp_type and emp_type != 'all':
                params['employment_type'] = emp_type

        headers = {}
        # Forward headers injected by API Gateway
        x_user_id = request.headers.get('X-User-Id')
        x_user_role = request.headers.get('X-User-Role')
        if x_user_id:
            headers['X-User-Id'] = x_user_id
        if x_user_role:
            headers['X-User-Role'] = x_user_role
        
        # Also forward Authorization if present (though user-service relies on X headers)
        auth_header = request.headers.get('Authorization')
        if auth_header:
            headers['Authorization'] = auth_header

        resp = requests.get(
            f"{user_service_url}/api/users",
            params=params, headers=headers, timeout=10,
        )
        if resp.status_code != 200:
            print(f"Failed to fetch users: {resp.status_code} - {resp.text}")
            return

        users = resp.json().get('users', [])
        if not users:
            print("No eligible users found.")
            return

        count = 0
        skipped = 0
        notified = 0

        for user in users:
            # Probation eligibility: only users within 6 months
            if cycle.cycle_type == 'probation':
                user_start_str = user.get('start_date')
                if not user_start_str:
                    skipped += 1
                    continue
                user_start = date.fromisoformat(user_start_str)
                months_employed = (cycle.start_date - user_start).days / 30
                if months_employed > 6:
                    skipped += 1
                    continue

            # Idempotent: skip if appraisal already exists
            exists = Appraisal.query.filter_by(
                cycle_id=cycle_id, employee_id=user['id']
            ).first()

            if not exists:
                appraisal = Appraisal(
                    cycle_id=cycle_id,
                    employee_id=user['id'],
                    manager_id=user.get('manager_id'),
                    status='not_started',
                )
                db.session.add(appraisal)
                count += 1

                # Send notification via Goal Service
                goal_service_url = current_app.config.get('GOAL_SERVICE_URL')
                if goal_service_url:
                    try:
                        requests.post(
                            f"{goal_service_url}/api/notifications",
                            json={
                                'recipient_id': user['id'],
                                'event': 'cycle_started',
                                'triggered_by': 'system',
                                'resource_type': 'appraisal_cycle',
                                'resource_id': cycle.id,
                            },
                            timeout=2,
                        )
                        notified += 1
                    except Exception as ne:
                        print(f"Failed to notify user {user['id']}: {ne}")

        db.session.commit()
        print(f"Cycle {cycle_id}: Created {count}, skipped {skipped}, notified {notified}")

    except Exception as e:
        db.session.rollback()
        print(f"Error creating appraisals: {e}")
        import traceback
        traceback.print_exc()


def _parse_date(d):
    if not d:
        return None
    d = d.replace('Z', '+00:00')
    return datetime.fromisoformat(d).date()


# ─── ROUTES ──────────────────────────────────────────────────────────


@cycles_bp.route('/', methods=['POST'])
@require_role('hr_admin', 'super_admin')
def create_cycle():
    """Create a new appraisal cycle. HR Admin only."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    if not data.get('name'):
        return jsonify({'error': 'Cycle name is required'}), 400
    if not data.get('start_date'):
        return jsonify({'error': 'Start date is required'}), 400
    if not data.get('end_date'):
        return jsonify({'error': 'End date is required'}), 400

    cycle = AppraisalCycle(
        name=data['name'],
        description=data.get('description'),
        cycle_type=data.get('cycle_type', 'annual'),
        start_date=_parse_date(data['start_date']),
        end_date=_parse_date(data['end_date']),
        self_assessment_deadline=_parse_date(data.get('self_assessment_deadline')),
        manager_review_deadline=_parse_date(data.get('manager_review_deadline')),
        created_by=request.headers.get('X-User-Id', 'system'),
        status='draft',
    )
    db.session.add(cycle)
    db.session.commit()

    return jsonify(cycle.to_dict()), 201


@cycles_bp.route('/', methods=['GET'])
@require_auth
def list_cycles():
    """List all cycles. Any authenticated user can view. Auto-completes expired."""
    active_cycles = AppraisalCycle.query.filter_by(status='active').all()
    today = datetime.now(timezone.utc).date()

    expired_count = 0
    for cycle in active_cycles:
        if cycle.end_date and cycle.end_date < today:
            cycle.status = 'completed'
            expired_count += 1

    if expired_count > 0:
        db.session.commit()

    cycles = AppraisalCycle.query.order_by(AppraisalCycle.created_at.desc()).all()
    return jsonify([c.to_dict() for c in cycles])


@cycles_bp.route('/<id>', methods=['GET'])
@require_auth
def get_cycle(id):
    """Get cycle details including questions."""
    cycle = AppraisalCycle.query.get_or_404(id)
    questions = [q.to_dict() for q in cycle.questions]
    data = cycle.to_dict()
    data['questions'] = questions
    return jsonify(data)


@cycles_bp.route('/<id>/activate', methods=['POST'])
@require_role('hr_admin', 'super_admin')
def activate_cycle(id):
    """Activate a cycle. HR Admin only. Enforces single active cycle rule."""
    cycle = AppraisalCycle.query.get_or_404(id)
    criteria = request.get_json() or {}

    if cycle.status == 'active':
        # Re-activation: sync new users
        print(f"Syncing users for active cycle {cycle.id}")
    else:
        # ── SINGLE ACTIVE CYCLE ENFORCEMENT ──
        existing_active = AppraisalCycle.query.filter(
            AppraisalCycle.status == 'active',
            AppraisalCycle.id != id,
        ).first()

        if existing_active:
            return jsonify({
                'error': 'CYCLE_CONFLICT',
                'message': (
                    f'Another cycle is already active: "{existing_active.name}" '
                    f'(ID: {existing_active.id}). Stop it first before activating a new one.'
                ),
                'active_cycle_id': existing_active.id,
                'active_cycle_name': existing_active.name,
            }), 409

        cycle.status = 'active'
        db.session.commit()

    _create_appraisals_for_active_users(cycle.id, criteria)

    cycle = AppraisalCycle.query.get(id)
    return jsonify({
        'message': 'Cycle activated and appraisals generated',
        'cycle': cycle.to_dict(),
    })


@cycles_bp.route('/<id>/stop', methods=['POST'])
@require_role('hr_admin', 'super_admin')
def stop_cycle(id):
    """Stop an active cycle. HR Admin only."""
    cycle = AppraisalCycle.query.get_or_404(id)
    if cycle.status != 'active':
        return jsonify({'error': 'Only active cycles can be stopped'}), 400

    cycle.status = 'draft'
    db.session.commit()
    return jsonify({
        'message': 'Cycle stopped and reverted to draft',
        'cycle': cycle.to_dict(),
    })


@cycles_bp.route('/<id>', methods=['PUT'])
@require_role('hr_admin', 'super_admin')
def update_cycle(id):
    """Update cycle details. HR Admin only."""
    cycle = AppraisalCycle.query.get_or_404(id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    if 'name' in data:
        cycle.name = data['name']
    if 'description' in data:
        cycle.description = data['description']
    if 'cycle_type' in data:
        cycle.cycle_type = data['cycle_type']
    if 'start_date' in data:
        cycle.start_date = _parse_date(data['start_date'])
    if 'end_date' in data:
        cycle.end_date = _parse_date(data['end_date'])
    if 'self_assessment_deadline' in data:
        cycle.self_assessment_deadline = _parse_date(data['self_assessment_deadline'])
    if 'manager_review_deadline' in data:
        cycle.manager_review_deadline = _parse_date(data['manager_review_deadline'])

    db.session.commit()
    return jsonify(cycle.to_dict())


@cycles_bp.route('/<id>/questions', methods=['POST'])
@require_role('hr_admin', 'super_admin')
def add_questions(id):
    """Add questions to a cycle. HR Admin only."""
    cycle = AppraisalCycle.query.get_or_404(id)
    data = request.get_json()

    if isinstance(data, dict):
        data = [data]

    created = []
    for q_data in data:
        if not q_data.get('question_text'):
            continue
        q = AppraisalQuestion(
            cycle_id=cycle.id,
            question_text=q_data['question_text'],
            question_type=q_data.get('question_type', 'text'),
            category=q_data.get('category'),
            order=q_data.get('order', 0),
            is_required=q_data.get('is_required', True),
            is_for_self=q_data.get('is_for_self', True),
            is_for_manager=q_data.get('is_for_manager', True),
        )
        db.session.add(q)
        created.append(q)

    db.session.commit()
    return jsonify([q.to_dict() for q in created]), 201


@cycles_bp.route('/<id>', methods=['DELETE'])
@require_role('hr_admin', 'super_admin')
def delete_cycle(id):
    """Delete a cycle. HR Admin only.
    Safety: Cannot delete if in-progress/completed appraisals exist.
    Allows deletion if appraisals exist but are all 'not_started'.
    """
    cycle = AppraisalCycle.query.get_or_404(id)

    # Check for started appraisals
    # If any appraisal is NOT 'not_started', block deletion
    started_count = Appraisal.query.filter(
        Appraisal.cycle_id == id,
        Appraisal.status != 'not_started'
    ).count()
    
    if started_count > 0:
        return jsonify({
            'error': 'Cannot delete cycle',
            'message': f'This cycle has {started_count} in-progress or completed appraisals. Archiving is recommended instead.'
        }), 400

    try:
        # Manually delete appraisals first to ensure clean removal
        # (in case cascade is not configured on DB level)
        Appraisal.query.filter_by(cycle_id=id).delete()
        
        # Also cascading delete for questions if needed?
        # Typically questions are linked to cycle.
        # Assuming cascade or manual delete:
        AppraisalQuestion.query.filter_by(cycle_id=id).delete()

        db.session.delete(cycle)
        db.session.commit()
        return jsonify({'message': 'Cycle deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500