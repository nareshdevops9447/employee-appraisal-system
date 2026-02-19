from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from extensions import db
from models.goal import Goal
from models.key_result import KeyResult
from models.goal_comment import GoalComment
from utils.rbac import require_auth, require_role
from utils.sync import sync_appraisal_status

goals_bp = Blueprint('goals', __name__)


@goals_bp.route('', methods=['POST'])
@require_auth
def create_goal():
    """Create a new goal. Any authenticated user can create goals."""
    user_id = request.headers.get('X-User-Id')
    user_role = request.headers.get('X-User-Role')
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No input data provided'}), 400

    required_fields = ['title', 'start_date', 'target_date']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'Missing required field: {field}'}), 400

    def parse_date(d):
        if not d:
            return None
        try:
            return datetime.fromisoformat(d.replace('Z', '+00:00')).date()
        except ValueError:
            try:
                return datetime.strptime(d, '%Y-%m-%d').date()
            except ValueError:
                return None

    start_date = parse_date(data['start_date'])
    target_date = parse_date(data['target_date'])

    if not start_date or not target_date:
        return jsonify({'error': 'Invalid date format. Use ISO 8601 or YYYY-MM-DD'}), 400

    # Managers/HR can assign goals to others; employees can only create for themselves
    employee_id = data.get('employee_id')
    if employee_id and employee_id != user_id:
        if user_role not in ('manager', 'hr_admin', 'super_admin'):
            return jsonify({'error': 'Only managers/HR can assign goals to others'}), 403
    if not employee_id:
        employee_id = user_id

    # If manager is assigning goal to someone else, auto-submit for employee approval
    is_assigned = employee_id != user_id
    initial_approval = 'pending_approval' if is_assigned else 'draft'

    goal = Goal(
        employee_id=employee_id,
        title=data['title'],
        description=data.get('description'),
        category=data.get('category', 'performance'),
        priority=data.get('priority', 'medium'),
        status='active',
        start_date=start_date,
        target_date=target_date,
        parent_goal_id=data.get('parent_goal_id'),
        appraisal_cycle_id=data.get('appraisal_cycle_id'),
        created_by=user_id,
        approval_status=initial_approval,
    )
    db.session.add(goal)
    db.session.commit()

    # Optional: initial key results
    if 'key_results' in data and isinstance(data['key_results'], list):
        for kr_data in data['key_results']:
            if not kr_data.get('title'):
                continue
            kr = KeyResult(
                goal_id=goal.id,
                title=kr_data['title'],
                target_value=kr_data.get('target_value', 100),
                unit=kr_data.get('unit', 'percentage'),
                due_date=parse_date(kr_data.get('due_date')) or goal.target_date,
            )
            db.session.add(kr)
        db.session.commit()

    # Sync with appraisal service
    if goal.appraisal_cycle_id:
        sync_appraisal_status(goal.employee_id, goal.appraisal_cycle_id)

    return jsonify(goal.to_dict()), 201


@goals_bp.route('', methods=['GET'])
@require_auth
def list_goals():
    """List goals. Scope: mine (default), team (manager), all (HR)."""
    user_id = request.headers.get('X-User-Id')
    user_role = request.headers.get('X-User-Role')

    scope = request.args.get('scope', 'mine')

    query = Goal.query

    if scope == 'mine':
        query = query.filter_by(employee_id=user_id)
    elif scope == 'team':
        if user_role not in ('manager', 'hr_admin', 'super_admin'):
            return jsonify({'error': 'Only managers can view team goals'}), 403
        # Team scope: goals created by or assigned by this manager
        employee_id = request.args.get('employee_id')
        if employee_id:
            query = query.filter_by(employee_id=employee_id)
        else:
            # Without specific employee, show goals where current user is creator
            query = query.filter(
                (Goal.created_by == user_id) | (Goal.employee_id == user_id)
            )
    elif scope == 'all':
        if user_role not in ('hr_admin', 'super_admin'):
            return jsonify({'error': 'HR access required'}), 403
    else:
        query = query.filter_by(employee_id=user_id)

    # Filters
    employee_id_filter = request.args.get('employee_id')
    if employee_id_filter and scope != 'team':
        query = query.filter_by(employee_id=employee_id_filter)

    cycle_id = request.args.get('cycle_id')
    if cycle_id:
        query = query.filter_by(appraisal_cycle_id=cycle_id)

    status = request.args.get('status')
    if status:
        query = query.filter_by(status=status)

    goals = query.order_by(Goal.created_at.desc()).all()
    return jsonify([g.to_dict() for g in goals])


@goals_bp.route('/<id>', methods=['GET'])
@require_auth
def get_goal(id):
    """Get a single goal. Owner, their manager, or HR can view."""
    user_id = request.headers.get('X-User-Id')
    user_role = request.headers.get('X-User-Role')

    goal = Goal.query.get_or_404(id)

    is_owner = (goal.employee_id == user_id or goal.created_by == user_id)
    is_hr = user_role in ('hr_admin', 'super_admin')

    if not is_owner and not is_hr:
        # Allow managers to view — but we don't know the org chart here.
        # For now, allow managers to view any goal (they'd typically filter by team).
        if user_role != 'manager':
            return jsonify({'error': 'Forbidden'}), 403

    data = goal.to_dict()
    data['comments'] = [c.to_dict() for c in goal.comments]
    return jsonify(data)


@goals_bp.route('/<id>', methods=['PUT'])
@require_auth
def update_goal(id):
    """Update a goal. Only owner, their manager, or HR can edit."""
    user_id = request.headers.get('X-User-Id')
    user_role = request.headers.get('X-User-Role')

    goal = Goal.query.get_or_404(id)

    is_owner = (goal.employee_id == user_id or goal.created_by == user_id)
    is_hr = user_role in ('hr_admin', 'super_admin')
    is_manager = user_role == 'manager'

    if not (is_owner or is_hr or is_manager):
        return jsonify({'error': 'Forbidden'}), 403

    data = request.get_json()

    if 'title' in data:
        goal.title = data['title']
    if 'description' in data:
        goal.description = data['description']
    if 'status' in data:
        goal.status = data['status']
    if 'priority' in data:
        goal.priority = data['priority']

    db.session.commit()

    # Sync if relevant fields updated
    if goal.appraisal_cycle_id:
        sync_appraisal_status(goal.employee_id, goal.appraisal_cycle_id)

    return jsonify(goal.to_dict())


@goals_bp.route('/<id>/progress', methods=['PUT'])
@require_auth
def update_progress(id):
    """Update goal progress. Only the goal owner can update."""
    user_id = request.headers.get('X-User-Id')
    goal = Goal.query.get_or_404(id)

    if goal.employee_id != user_id:
        return jsonify({'error': 'Only the goal owner can update progress'}), 403

    data = request.get_json()
    if 'progress_percentage' in data:
        goal.progress_percentage = data['progress_percentage']

    db.session.commit()
    return jsonify(goal.to_dict())


@goals_bp.route('/<id>/approve', methods=['PUT'])
@require_role('manager', 'hr_admin', 'super_admin')
def approve_goal(id):
    """Approve or request revision on a goal. Manager/HR only."""
    user_id = request.headers.get('X-User-Id')
    goal = Goal.query.get_or_404(id)

    data = request.get_json()
    status = data.get('status')

    if status not in ['approved', 'revision_requested']:
        return jsonify({'error': 'Invalid status. Use: approved, revision_requested'}), 400

    goal.approval_status = status
    if status == 'approved':
        goal.approved_by = user_id
        goal.status = 'active'

    db.session.commit()

    # Sync with appraisal service
    if goal.appraisal_cycle_id:
        sync_appraisal_status(goal.employee_id, goal.appraisal_cycle_id)

    return jsonify(goal.to_dict())