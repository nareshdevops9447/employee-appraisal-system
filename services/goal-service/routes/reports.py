from flask import Blueprint, jsonify, request
from extensions import db
from models.goal import Goal
from sqlalchemy import func
from utils.rbac import require_auth, require_role

reports_bp = Blueprint('reports', __name__)


@reports_bp.route('/stats/me', methods=['GET'])
@require_auth
def my_stats():
    """Get goal statistics for the current user."""
    user_id = request.headers.get('X-User-Id')

    total = Goal.query.filter_by(employee_id=user_id).count()
    completed = Goal.query.filter_by(employee_id=user_id, status='completed').count()
    in_progress = Goal.query.filter_by(employee_id=user_id, status='active').count()

    by_status = (
        db.session.query(Goal.status, func.count(Goal.id))
        .filter(Goal.employee_id == user_id)
        .group_by(Goal.status)
        .all()
    )

    return jsonify({
        'total': total,
        'completed': completed,
        'in_progress': in_progress,
        'by_status': {s: c for s, c in by_status},
    })


@reports_bp.route('/stats/team', methods=['GET'])
@require_role('manager', 'hr_admin', 'super_admin')
def team_stats():
    """Get goal statistics for the manager's team. Manager/HR only."""
    user_id = request.headers.get('X-User-Id')

    # Goals created by or where creator is the current user (manager)
    employee_id = request.args.get('employee_id')

    query = Goal.query
    if employee_id:
        query = query.filter_by(employee_id=employee_id)

    total = query.count()
    completed = query.filter_by(status='completed').count()
    in_progress = query.filter_by(status='active').count()

    return jsonify({
        'total': total,
        'completed': completed,
        'in_progress': in_progress,
    })