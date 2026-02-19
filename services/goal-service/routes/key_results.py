from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from extensions import db
from models.goal import Goal
from models.key_result import KeyResult
from utils.rbac import require_auth, require_role

key_results_bp = Blueprint('key_results', __name__)


def update_goal_progress(goal_id):
    """Recalculate goal progress from key results."""
    goal = Goal.query.get(goal_id)
    if not goal or not goal.key_results:
        return

    total = len(goal.key_results)
    if total == 0:
        return

    sum_progress = 0
    for kr in goal.key_results:
        if kr.target_value == 0:
            continue
        p = (kr.current_value / kr.target_value) * 100
        p = min(100, max(0, p))
        sum_progress += p

    avg = int(sum_progress / total)
    goal.progress_percentage = avg

    if avg == 100 and goal.status == 'active':
        goal.status = 'completed'
        goal.completed_date = datetime.now(timezone.utc).date()

    db.session.commit()


@key_results_bp.route('/<goal_id>/key-results', methods=['POST'])
@require_auth
def add_key_result(goal_id):
    """Add a key result to a goal. Owner or manager can add."""
    user_id = request.headers.get('X-User-Id')
    user_role = request.headers.get('X-User-Role')
    goal = Goal.query.get_or_404(goal_id)

    # Only owner, creator, or manager/HR can add KRs
    is_owner = (goal.employee_id == user_id or goal.created_by == user_id)
    is_privileged = user_role in ('manager', 'hr_admin', 'super_admin')
    if not is_owner and not is_privileged:
        return jsonify({'error': 'Forbidden'}), 403

    data = request.get_json()
    if not data or not data.get('title'):
        return jsonify({'error': 'Key result title is required'}), 400

    kr = KeyResult(
        goal_id=goal.id,
        title=data['title'],
        target_value=data.get('target_value', 100),
        unit=data.get('unit', 'percentage'),
        due_date=(
            datetime.fromisoformat(data['due_date']).date()
            if data.get('due_date') else goal.target_date
        ),
    )
    db.session.add(kr)
    db.session.commit()

    update_goal_progress(goal.id)
    return jsonify(kr.to_dict()), 201


@key_results_bp.route('/<goal_id>/key-results/<kr_id>', methods=['PUT'])
@require_auth
def update_key_result(goal_id, kr_id):
    """Update a key result. Owner or manager can update."""
    user_id = request.headers.get('X-User-Id')
    user_role = request.headers.get('X-User-Role')

    goal = Goal.query.get_or_404(goal_id)
    kr = KeyResult.query.get_or_404(kr_id)

    is_owner = (goal.employee_id == user_id or goal.created_by == user_id)
    is_privileged = user_role in ('manager', 'hr_admin', 'super_admin')
    if not is_owner and not is_privileged:
        return jsonify({'error': 'Forbidden'}), 403

    data = request.get_json()

    if 'current_value' in data:
        kr.current_value = data['current_value']
    if 'status' in data:
        kr.status = data['status']

    db.session.commit()
    update_goal_progress(kr.goal_id)

    return jsonify(kr.to_dict())