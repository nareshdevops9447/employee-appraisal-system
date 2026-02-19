from flask import Blueprint, request, jsonify
from extensions import db
from models.goal import Goal
from models.goal_audit import GoalAudit
from models.goal_version import GoalVersion
from services.approval_workflow import ApprovalWorkflow
from services.notification_service import NotificationService
from utils.rbac import require_auth, require_role
from utils.sync import sync_appraisal_status

approval_bp = Blueprint('approval', __name__)


# --- Approval Workflow ---

@approval_bp.route('/goals/<goal_id>/submit', methods=['POST'])
@require_auth
def submit_goal(goal_id):
    """Submit a goal for approval. Only the creator or assignee can submit."""
    user_id = request.headers.get('X-User-Id')
    user_role = request.headers.get('X-User-Role')

    goal = Goal.query.get_or_404(goal_id)

    if goal.created_by != user_id and goal.employee_id != user_id:
        return jsonify({'error': 'Only the goal creator or assignee can submit'}), 403

    try:
        updated_goal = ApprovalWorkflow.submit_for_approval(goal, user_id, user_role)
        
        # Sync with appraisal service
        if updated_goal.appraisal_cycle_id:
            sync_appraisal_status(updated_goal.employee_id, updated_goal.appraisal_cycle_id)
            
        return jsonify(updated_goal.to_dict()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400


@approval_bp.route('/goals/<goal_id>/approve', methods=['POST'])
@require_auth
def approve_goal(goal_id):
    """Approve a goal. The assignee (employee) can approve goals assigned to them.
    Managers/HR can also approve."""
    user_id = request.headers.get('X-User-Id')
    user_role = request.headers.get('X-User-Role')

    goal = Goal.query.get_or_404(goal_id)

    # Allow the employee (assignee) to approve goals assigned TO them
    is_assignee = (goal.employee_id == user_id)
    is_privileged = user_role in ('manager', 'hr_admin', 'super_admin')

    if not (is_assignee or is_privileged):
        return jsonify({'error': 'Only the assigned employee or managers/HR can approve'}), 403

    try:
        updated_goal = ApprovalWorkflow.approve_goal(goal, user_id, user_role)
        
        # Sync with appraisal service
        if updated_goal.appraisal_cycle_id:
            sync_appraisal_status(updated_goal.employee_id, updated_goal.appraisal_cycle_id)
            
        return jsonify(updated_goal.to_dict()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400


@approval_bp.route('/goals/<goal_id>/reject', methods=['POST'])
@require_auth
def reject_goal(goal_id):
    """Reject a goal. The assignee (employee) can reject goals assigned to them.
    Managers/HR can also reject."""
    user_id = request.headers.get('X-User-Id')
    user_role = request.headers.get('X-User-Role')
    data = request.get_json()
    reason = data.get('reason')

    goal = Goal.query.get_or_404(goal_id)

    # Allow the employee (assignee) to reject goals assigned TO them
    is_assignee = (goal.employee_id == user_id)
    is_privileged = user_role in ('manager', 'hr_admin', 'super_admin')

    if not (is_assignee or is_privileged):
        return jsonify({'error': 'Only the assigned employee or managers/HR can reject'}), 403

    try:
        updated_goal = ApprovalWorkflow.reject_goal(goal, user_id, user_role, reason)
        
        # Sync with appraisal service
        if updated_goal.appraisal_cycle_id:
            sync_appraisal_status(updated_goal.employee_id, updated_goal.appraisal_cycle_id)
            
        return jsonify(updated_goal.to_dict()), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400


# --- Goal Readiness Check ---

@approval_bp.route('/goals/readiness', methods=['GET'])
@require_auth
def check_goal_readiness():
    """Check if an employee has all goals approved for a cycle.
    Returns readiness status and goal counts by approval_status.
    Query params: employee_id (optional, defaults to current user), cycle_id (optional)."""
    user_id = request.headers.get('X-User-Id')
    employee_id = request.args.get('employee_id', user_id)

    query = Goal.query.filter_by(employee_id=employee_id)

    cycle_id = request.args.get('cycle_id')
    if cycle_id:
        query = query.filter_by(appraisal_cycle_id=cycle_id)

    goals = query.all()
    total = len(goals)
    approved = sum(1 for g in goals if g.approval_status == 'approved')
    pending = sum(1 for g in goals if g.approval_status == 'pending_approval')
    rejected = sum(1 for g in goals if g.approval_status == 'rejected')
    draft = sum(1 for g in goals if g.approval_status == 'draft')

    # Ready for self-assessment when there is at least one goal and all are approved
    ready = total > 0 and approved == total

    return jsonify({
        'ready': ready,
        'total': total,
        'approved': approved,
        'pending': pending,
        'rejected': rejected,
        'draft': draft,
        'goals': [g.to_dict() for g in goals],
    }), 200


# --- Audit & Versions ---

@approval_bp.route('/goals/<goal_id>/audit', methods=['GET'])
@require_auth
def get_audit_trail(goal_id):
    """Get audit trail for a goal. Any authenticated user can view."""
    audits = GoalAudit.query.filter_by(goal_id=goal_id) \
        .order_by(GoalAudit.timestamp.desc()).all()
    return jsonify([a.to_dict() for a in audits]), 200


@approval_bp.route('/goals/<goal_id>/versions', methods=['GET'])
@require_auth
def get_versions(goal_id):
    """Get version history for a goal. Any authenticated user can view."""
    versions = GoalVersion.query.filter_by(goal_id=goal_id) \
        .order_by(GoalVersion.version_number.desc()).all()
    return jsonify([v.to_dict() for v in versions]), 200


# --- Notifications (legacy - keeping for backward compat) ---

@approval_bp.route('/notifications', methods=['GET'])
@require_auth
def get_notifications():
    """Get notifications for the current user."""
    user_id = request.headers.get('X-User-Id')
    unread_only = request.args.get('unread', 'false').lower() == 'true'
    notifications = NotificationService.get_notifications(user_id, unread_only)
    return jsonify([n.to_dict() for n in notifications]), 200


@approval_bp.route('/notifications/<notification_id>/read', methods=['POST'])
@require_auth
def mark_notification_read(notification_id):
    """Mark a notification as read."""
    success = NotificationService.mark_read(notification_id)
    if success:
        return jsonify({'message': 'Marked as read'}), 200
    return jsonify({'error': 'Notification not found'}), 404