"""
Goal routes — CRUD, progress updates, key results, comments, bulk operations.
Migrated from goal-service.

Key changes:
- Uses JWT-based @require_auth instead of X-User-Id/X-User-Role headers
- Inter-service HTTP calls (user-service, appraisal-service) replaced with
  direct DB queries/imports
"""
from datetime import datetime, date, timezone
import logging
from flask import Blueprint, request, jsonify, g, current_app

from extensions import db
from models.goal import Goal

from models.key_result import KeyResult
from models.goal_comment import GoalComment
from models.goal_comment_reaction import GoalCommentReaction
from models.goal_audit import GoalAudit
from models.goal_version import GoalVersion
from models.notification import Notification
from models.appraisal import Appraisal
from models.appraisal_cycle import AppraisalCycle
from models.user_profile import UserProfile
from services.approval_workflow import ApprovalWorkflow
from services.notification_service import NotificationService
from services.workflow import update_appraisal_status
from utils.decorators import require_auth, require_role

goals_bp = Blueprint('goals', __name__)
logger = logging.getLogger(__name__)


def _parse_date(value):
    """Parse a date string that could be YYYY-MM-DD or a full ISO datetime (from JS)."""
    if not value:
        return None
    # Handle full ISO datetime strings like "2026-02-23T00:00:00.000Z"
    if 'T' in value:
        return datetime.fromisoformat(value.replace('Z', '+00:00')).date()
    return date.fromisoformat(value)


# ═══════════════════════════════════════════════════════════════════════
# Goal CRUD
# ═══════════════════════════════════════════════════════════════════════

@goals_bp.route('/', methods=['GET'])
@require_auth
def list_goals():
    """List goals with filters."""
    ctx = g.current_user
    employee_id = request.args.get('employee_id', ctx['user_id'])
    scope = request.args.get('scope', 'mine')
    status = request.args.get('status')
    approval_status = request.args.get('approval_status')
    appraisal_cycle_id = request.args.get('appraisal_cycle_id')
    category = request.args.get('category')

    query = Goal.query

    if scope == 'mine':
        query = query.filter(Goal.employee_id == ctx['user_id'])
    elif scope == 'team':
        # Get direct reports
        reports = UserProfile.query.filter_by(manager_id=ctx['user_id'], is_active=True).all()
        report_ids = [r.id for r in reports]
        if employee_id and employee_id in report_ids:
            # Filter to a specific team member
            query = query.filter(Goal.employee_id == employee_id)
        else:
            query = query.filter(Goal.employee_id.in_(report_ids))
    elif scope == 'all':
        if ctx['role'] not in ('hr_admin', 'super_admin'):
            return jsonify({'error': 'Forbidden'}), 403
    else:
        # Default: filter by employee_id param or self
        query = query.filter(Goal.employee_id == employee_id)
        if employee_id == ctx['user_id']:
            query = query.filter(db.not_(db.and_(Goal.goal_type == 'performance', Goal.approval_status == 'draft')))

    if status:
        if status == 'completed':
            query = query.filter(db.or_(Goal.status == 'completed', Goal.progress_percentage >= 100))
        elif status == 'in_progress':
            query = query.filter(
                db.or_(
                    Goal.status == 'in_progress',
                    db.and_(Goal.status == 'active', Goal.progress_percentage > 0, Goal.progress_percentage < 100)
                )
            )
        elif status == 'not_started':
            query = query.filter(
                db.or_(
                    Goal.status == 'not_started',
                    db.and_(Goal.status == 'active', db.or_(Goal.progress_percentage == 0, Goal.progress_percentage == None))
                )
            )
        else:
            query = query.filter(Goal.status == status)
    if approval_status:
        query = query.filter(Goal.approval_status == approval_status)
    if appraisal_cycle_id:
        query = query.filter(Goal.appraisal_cycle_id == appraisal_cycle_id)
    if category:
        query = query.filter(Goal.category == category)

    # Pagination
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)

    query = query.order_by(Goal.created_at.desc())
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'goals': [g.to_dict() for g in paginated.items],
        'total': paginated.total,
        'page': paginated.page,
        'per_page': paginated.per_page,
    })


@goals_bp.route('/<id>', methods=['GET'])
@require_auth
def get_goal(id):
    """Get a single goal with key results, comments, and audit trail."""
    goal = Goal.query.get_or_404(id)
    ctx = g.current_user

    result = goal.to_dict()
    result['comments'] = [c.to_dict() for c in goal.comments.order_by(GoalComment.created_at.desc()).all()]
    result['audit_trail'] = [
        a.to_dict() for a in GoalAudit.query.filter_by(goal_id=id)
        .order_by(GoalAudit.timestamp.desc()).all()
    ]
    result['versions'] = [
        v.to_dict() for v in GoalVersion.query.filter_by(goal_id=id)
        .order_by(GoalVersion.version_number.desc()).all()
    ]

    return jsonify(result)


@goals_bp.route('/<id>', methods=['DELETE'])
@require_auth
def delete_goal(id):
    """Delete a goal. Only draft/pending goals can be deleted.

    Permissions:
    - Owner can delete their own draft/pending goals
    - Manager can delete draft/pending goals of their direct reports
    - HR Admin / Super Admin can delete any draft/pending goal
    - No one can delete approved goals (audit trail protection)
    """
    goal = Goal.query.get_or_404(id)
    ctx = g.current_user

    # Block deletion of approved goals
    if goal.approval_status == 'approved':
        return jsonify({'error': 'Cannot delete an approved goal. Contact HR if removal is needed.'}), 403

    # Check permissions
    is_owner = goal.employee_id == ctx['user_id']
    is_creator = goal.created_by == ctx['user_id']
    is_hr = ctx['role'] in ('hr_admin', 'super_admin')
    
    is_manager = False
    employee_profile = UserProfile.query.get(goal.employee_id)
    if employee_profile and employee_profile.manager_id == ctx['user_id']:
        is_manager = True

    if not (is_owner or is_creator or is_hr or is_manager):
        return jsonify({'error': 'You do not have permission to delete this goal.'}), 403

    title = goal.title
    db.session.delete(goal)
    db.session.commit()

    logger.info('Goal "%s" deleted by user %s', title, ctx['user_id'])
    return jsonify({'message': f'Goal "{title}" has been deleted.'})


@goals_bp.route('/', methods=['POST'])
@require_auth
def create_goal():
    """Create a new goal."""
    ctx = g.current_user
    data = request.get_json()
    if not data or not data.get('title'):
        logger.error(f"Goal creation failed: Title missing. Data: {data}")
        return jsonify({'error': 'Title is required'}), 400

    employee_id = data.get('employee_id', ctx['user_id'])

    goal_type = data.get('goal_type', 'performance')

    # For development goals, enforce max 3 limit
    if goal_type == 'development' and data.get('appraisal_cycle_id'):
        dev_count = Goal.query.filter_by(
            employee_id=employee_id,
            appraisal_cycle_id=data['appraisal_cycle_id'],
            goal_type='development'
        ).count()
        if dev_count >= 3:
            logger.error(f"Goal creation failed: Max 3 dev goals. User: {employee_id}, Cycle: {data['appraisal_cycle_id']}")
            return jsonify({'error': 'Maximum of 3 development goals allowed per cycle.'}), 400

    goal = Goal(
        employee_id=employee_id,
        title=data['title'],
        description=data.get('description'),
        category=data.get('category', 'performance'),
        priority=data.get('priority', 'medium'),
        start_date=_parse_date(data.get('start_date')),
        target_date=_parse_date(data.get('target_date')),
        appraisal_cycle_id=data.get('appraisal_cycle_id'),
        created_by=ctx['user_id'],
        approval_status='draft',
        goal_type=goal_type,
        weight=data.get('weight', 0) if goal_type == 'performance' else 0,
        manager_rating=data.get('manager_rating'),
        manager_comment=data.get('manager_comment'),
        self_rating=data.get('self_rating'),
        self_comment=data.get('self_comment'),
        dev_status=data.get('dev_status'),
    )
    # Target weights can be ignored safely here as the ReviewService ignores them and averages the scores.

    db.session.add(goal)
    db.session.flush()  # Ensure goal.id is generated before creating key results

    # Add key results if provided
    for kr_data in data.get('key_results', []):
        kr = KeyResult(
            goal_id=goal.id,
            title=kr_data.get('title', ''),
            description=kr_data.get('description'),
            target_value=kr_data.get('target_value', 100),
            unit=kr_data.get('unit', 'percentage'),
            due_date=_parse_date(kr_data.get('due_date')),
        )
        db.session.add(kr)

    db.session.commit()

    # Auto-submit for approval if manager is creating for employee
    if employee_id != ctx['user_id']:
        try:
            ApprovalWorkflow.submit_for_approval(goal, ctx['user_id'], ctx['role'])
        except ValueError:
            pass  # Already in correct state

    return jsonify(goal.to_dict()), 201


@goals_bp.route('/<id>', methods=['PUT'])
@require_auth
def update_goal(id):
    """Update an existing goal."""
    ctx = g.current_user
    goal = Goal.query.get_or_404(id)

    # Check permissions
    is_owner = goal.employee_id == ctx['user_id']
    is_creator = goal.created_by == ctx['user_id']
    is_hr = ctx['role'] in ('hr_admin', 'super_admin')
    
    is_manager = False
    if not (is_owner or is_creator or is_hr):
        # Check if the user is the employee's manager
        profile = UserProfile.query.get(goal.employee_id)
        if profile and profile.manager_id == ctx['user_id']:
            is_manager = True

    if not (is_owner or is_creator or is_hr or is_manager):
        return jsonify({'error': 'Forbidden'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    for field in ('title', 'description', 'category', 'priority', 'status'):
        if field in data:
            setattr(goal, field, data[field])

    if 'employee_id' in data:
        goal.employee_id = data['employee_id'] or ctx['user_id']

    if 'start_date' in data:
        goal.start_date = _parse_date(data['start_date'])
    if 'target_date' in data:
        goal.target_date = _parse_date(data['target_date'])
    if 'progress_percentage' in data:
        goal.progress_percentage = data['progress_percentage']
    
    if 'weight' in data and goal.goal_type == 'performance':
        goal.weight = data['weight']
    
    for field in ('goal_type', 'dev_status', 'self_rating', 'self_comment', 'manager_rating', 'manager_comment'):
        if field in data:
            setattr(goal, field, data[field])

    db.session.commit()
    return jsonify(goal.to_dict())



# ═══════════════════════════════════════════════════════════════════════
# Key Results
# ═══════════════════════════════════════════════════════════════════════

@goals_bp.route('/<goal_id>/key-results', methods=['POST'])
@require_auth
def add_key_result(goal_id):
    """Add a key result to a goal."""
    goal = Goal.query.get_or_404(goal_id)
    data = request.get_json()
    if not data or not data.get('title'):
        return jsonify({'error': 'Title is required'}), 400

    kr = KeyResult(
        goal_id=goal_id,
        title=data['title'],
        description=data.get('description'),
        target_value=data.get('target_value', 100),
        unit=data.get('unit', 'percentage'),
        due_date=_parse_date(data.get('due_date')),
    )
    db.session.add(kr)
    db.session.commit()
    return jsonify(kr.to_dict()), 201


@goals_bp.route('/<goal_id>/key-results/<kr_id>', methods=['PUT'])
@require_auth
def update_key_result(goal_id, kr_id):
    """Update a key result."""
    kr = KeyResult.query.filter_by(id=kr_id, goal_id=goal_id).first_or_404()
    data = request.get_json()

    for field in ('title', 'description', 'target_value', 'current_value', 'unit', 'status'):
        if field in data:
            setattr(kr, field, data[field])

    if 'due_date' in data:
        kr.due_date = _parse_date(data['due_date'])

    # Recalculate goal progress
    goal = Goal.query.get(goal_id)
    if goal:
        all_krs = KeyResult.query.filter_by(goal_id=goal_id).all()
        if all_krs:
            total_progress = sum(
                (kr.current_value / kr.target_value * 100) if kr.target_value > 0 else 0
                for kr in all_krs
            )
            goal.progress_percentage = int(total_progress / len(all_krs))

    db.session.commit()
    return jsonify(kr.to_dict())


@goals_bp.route('/<goal_id>/key-results/<kr_id>', methods=['DELETE'])
@require_auth
def delete_key_result(goal_id, kr_id):
    """Delete a key result."""
    kr = KeyResult.query.filter_by(id=kr_id, goal_id=goal_id).first_or_404()
    db.session.delete(kr)
    db.session.commit()
    return jsonify({'message': 'Key result deleted'}), 200


# ═══════════════════════════════════════════════════════════════════════
# Comments
# ═══════════════════════════════════════════════════════════════════════

@goals_bp.route('/<goal_id>/comments', methods=['GET'])
@require_auth
def list_comments(goal_id):
    """List comments for a goal, threaded (top-level with nested replies)."""
    # Fetch top-level comments only (no reply_to_id)
    top_level = GoalComment.query.filter_by(goal_id=goal_id, reply_to_id=None) \
        .order_by(GoalComment.created_at.desc()).all()

    result = []
    for comment in top_level:
        c = comment.to_dict()
        # Attach replies sorted by oldest first
        replies = GoalComment.query.filter_by(reply_to_id=comment.id) \
            .order_by(GoalComment.created_at.asc()).all()
        c['replies'] = [r.to_dict() for r in replies]
        result.append(c)
    return jsonify(result)


@goals_bp.route('/<goal_id>/comments', methods=['POST'])
@require_auth
def add_comment(goal_id):
    """Add a comment or reply to a goal."""
    ctx = g.current_user
    Goal.query.get_or_404(goal_id)
    data = request.get_json()

    if not data or not data.get('content'):
        return jsonify({'error': 'Content is required'}), 400

    reply_to_id = data.get('reply_to_id')
    if reply_to_id:
        parent = GoalComment.query.get(reply_to_id)
        if not parent or parent.goal_id != goal_id:
            return jsonify({'error': 'Invalid parent comment'}), 400

    comment = GoalComment(
        goal_id=goal_id,
        author_id=ctx['user_id'],
        content=data['content'],
        comment_type=data.get('comment_type', 'update'),
        reply_to_id=reply_to_id,
    )
    db.session.add(comment)
    db.session.commit()
    return jsonify(comment.to_dict()), 201


@goals_bp.route('/<goal_id>/comments/<comment_id>', methods=['PUT'])
@require_auth
def update_comment(goal_id, comment_id):
    """Edit a comment. Only the author can edit."""
    ctx = g.current_user
    comment = GoalComment.query.get_or_404(comment_id)

    if comment.goal_id != goal_id:
        return jsonify({'error': 'Comment not found on this goal'}), 404
    if comment.author_id != ctx['user_id']:
        return jsonify({'error': 'You can only edit your own comments'}), 403
    if comment.is_deleted:
        return jsonify({'error': 'Cannot edit a deleted comment'}), 400

    data = request.get_json()
    if not data or not data.get('content'):
        return jsonify({'error': 'Content is required'}), 400

    comment.content = data['content']
    comment.is_edited = True
    db.session.commit()
    return jsonify(comment.to_dict())


@goals_bp.route('/<goal_id>/comments/<comment_id>', methods=['DELETE'])
@require_auth
def delete_comment(goal_id, comment_id):
    """Soft-delete a comment. Author or HR Admin can delete."""
    ctx = g.current_user
    comment = GoalComment.query.get_or_404(comment_id)

    if comment.goal_id != goal_id:
        return jsonify({'error': 'Comment not found on this goal'}), 404
    if comment.author_id != ctx['user_id'] and ctx['role'] not in ('hr_admin', 'super_admin'):
        return jsonify({'error': 'You can only delete your own comments'}), 403

    comment.is_deleted = True
    comment.content = ''
    db.session.commit()
    return jsonify({'message': 'Comment deleted'})


@goals_bp.route('/<goal_id>/comments/<comment_id>/react', methods=['POST'])
@require_auth
def toggle_comment_reaction(goal_id, comment_id):
    """Toggle an emoji reaction on a comment."""
    ctx = g.current_user
    data = request.get_json()
    emoji = data.get('emoji')

    if not emoji:
        return jsonify({'error': 'Emoji is required'}), 400

    comment = GoalComment.query.get_or_404(comment_id)
    if comment.goal_id != goal_id:
        return jsonify({'error': 'Comment not found on this goal'}), 404

    # Check if existing reaction
    existing = GoalCommentReaction.query.filter_by(
        comment_id=comment_id,
        user_id=ctx['user_id'],
        emoji=emoji
    ).first()

    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify({'message': 'Reaction removed', 'action': 'removed'})
    else:
        reaction = GoalCommentReaction(
            comment_id=comment_id,
            user_id=ctx['user_id'],
            emoji=emoji
        )
        db.session.add(reaction)
        db.session.commit()
        return jsonify({'message': 'Reaction added', 'action': 'added', 'reaction': reaction.to_dict()})


@goals_bp.route('/<goal_id>/comments/<comment_id>/reactions', methods=['GET'])
@require_auth
def list_comment_reactions(goal_id, comment_id):
    """List all reactions for a comment."""
    comment = GoalComment.query.get_or_404(comment_id)
    if comment.goal_id != goal_id:
        return jsonify({'error': 'Comment not found on this goal'}), 404

    reactions = GoalCommentReaction.query.filter_by(comment_id=comment_id).all()
    return jsonify([r.to_dict() for r in reactions])


# ═══════════════════════════════════════════════════════════════════════
# Approval
# ═══════════════════════════════════════════════════════════════════════

@goals_bp.route('/<id>/submit', methods=['POST'])
@require_auth
def submit_goal(id):
    """Submit a single goal for approval."""
    ctx = g.current_user
    goal = Goal.query.get_or_404(id)

    # The 3-7 performance goal count validation is removed here so employees
    # can submit individual goals (like development goals) without being blocked.
    # Count validation is better enforced during the appraisal review phase.

    try:
        ApprovalWorkflow.submit_for_approval(goal, ctx['user_id'], ctx['role'])
        _sync_appraisal_status(goal)
        return jsonify(goal.to_dict())
    except ValueError as e:
        return jsonify({'error': str(e)}), 400


@goals_bp.route('/bulk/submit', methods=['POST'])
@require_auth
def bulk_submit_goals():
    """Submit all assigned goals for a specific employee."""
    ctx = g.current_user
    data = request.get_json()
    employee_id = data.get('employee_id')

    if not employee_id:
        return jsonify({'error': 'employee_id is required'}), 400

    # Ensure the user has permission (manager of the employee or HR admin)
    is_hr = ctx['role'] in ('hr_admin', 'super_admin')
    is_manager = False
    if not is_hr:
        profile = UserProfile.query.get(employee_id)
        if profile and profile.manager_id == ctx['user_id']:
            is_manager = True

    if not (is_hr or is_manager):
        return jsonify({'error': 'Forbidden: You must be the manager or HR Admin to submit team goals.'}), 403

    # Find all draft goals (or revision_requested) for this employee
    goals = Goal.query.filter(
        Goal.employee_id == employee_id,
        Goal.approval_status.in_(['draft', 'revision_requested'])
    ).all()

    if not goals:
        return jsonify({'message': 'No goals found that need submission.', 'submitted': 0}), 200

    # Ensure valid counts across cycles
    cycle_counts = {}
    for goal in goals:
        if goal.goal_type == 'performance' and goal.appraisal_cycle_id:
            if goal.appraisal_cycle_id not in cycle_counts:
                count = Goal.query.filter_by(
                    employee_id=employee_id,
                    appraisal_cycle_id=goal.appraisal_cycle_id,
                    goal_type='performance'
                ).count()
                cycle_counts[goal.appraisal_cycle_id] = count
            
            if cycle_counts[goal.appraisal_cycle_id] < 3 or cycle_counts[goal.appraisal_cycle_id] > 7:
                 return jsonify({'error': f'Team member must have between 3 and 7 performance goals to submit bulk goals.'}), 400

    submitted_count = 0
    synced_cycles = set()
    for goal in goals:
        try:
            ApprovalWorkflow.submit_for_approval(goal, ctx['user_id'], ctx['role'])
            submitted_count += 1
            if goal.appraisal_cycle_id:
                synced_cycles.add(goal.appraisal_cycle_id)
        except ValueError as e:
            logger.warning(f"Failed to submit goal {goal.id}: {e}")

    # Synchronize appraisal statuses for all affected cycles
    for cycle_id in synced_cycles:
        # We just need one goal to pass to the sync function (it uses the goal's cycle and employee_id)
        sample_goal = next((g for g in goals if g.appraisal_cycle_id == cycle_id), None)
        if sample_goal:
            _sync_appraisal_status(sample_goal)

    return jsonify({
        'message': f'Successfully submitted {submitted_count} goals for approval.',
        'submitted': submitted_count
    }), 200


@goals_bp.route('/<id>/approve', methods=['POST'])
@require_auth
def approve_goal(id):
    """Approve a goal."""
    ctx = g.current_user
    data = request.get_json() or {}
    goal = Goal.query.get_or_404(id)

    try:
        ApprovalWorkflow.approve_goal(goal, ctx['user_id'], ctx['role'], comment=data.get('comment', ''))
        _sync_appraisal_status(goal)
        return jsonify(goal.to_dict())
    except ValueError as e:
        return jsonify({'error': str(e)}), 400


@goals_bp.route('/<id>/reject', methods=['POST'])
@require_auth
def reject_goal(id):
    """Reject a goal."""
    ctx = g.current_user
    data = request.get_json() or {}
    goal = Goal.query.get_or_404(id)

    try:
        ApprovalWorkflow.reject_goal(goal, ctx['user_id'], ctx['role'], data.get('reason', ''))
        _sync_appraisal_status(goal)
        return jsonify(goal.to_dict())
    except ValueError as e:
        return jsonify({'error': str(e)}), 400


def _sync_appraisal_status(goal):
    """Sync appraisal status after a goal approval change.

    This replaces the old HTTP POST to appraisal-service.
    """
    if not goal.appraisal_cycle_id:
        return

    appraisal = Appraisal.query.filter_by(
        employee_id=goal.employee_id,
        cycle_id=goal.appraisal_cycle_id,
    ).first()

    if not appraisal:
        return

    # Get all goals for this appraisal
    goals = Goal.query.filter_by(
        employee_id=goal.employee_id,
        appraisal_cycle_id=goal.appraisal_cycle_id,
    ).all()

    goals_data = [g.to_dict() for g in goals]
    update_appraisal_status(appraisal, goals_data)


# ═══════════════════════════════════════════════════════════════════════
# Notifications
# ═══════════════════════════════════════════════════════════════════════

@goals_bp.route('/notifications', methods=['GET'])
@require_auth
def list_notifications():
    """Get notifications for the current user."""
    ctx = g.current_user
    unread_only = request.args.get('unread_only', 'false').lower() == 'true'
    notifications = NotificationService.get_notifications(ctx['user_id'], unread_only)
    return jsonify([n.to_dict() for n in notifications])


@goals_bp.route('/notifications/<id>/read', methods=['POST'])
@require_auth
def mark_notification_read(id):
    """Mark a notification as read."""
    NotificationService.mark_read(id)
    return jsonify({'message': 'Marked as read'})


@goals_bp.route('/notifications/read-all', methods=['POST'])
@require_auth
def mark_all_notifications_read():
    """Mark all notifications as read."""
    ctx = g.current_user
    Notification.query.filter_by(
        recipient_id=ctx['user_id'],
        is_read=False,
    ).update({'is_read': True})
    db.session.commit()
    return jsonify({'message': 'All marked as read'})


# ═══════════════════════════════════════════════════════════════════════
# Reports & Stats
# ═══════════════════════════════════════════════════════════════════════

@goals_bp.route('/stats/me', methods=['GET'])
@require_auth
def my_goal_stats():
    """Get goal statistics for the current user's goals."""
    ctx = g.current_user
    
    # Do not filter by cycle, to ensure completed cycles are included.
    # Exclude drafts that are performance goals (assigned to employee but hidden)
    goals = Goal.query.filter(
        Goal.employee_id == ctx['user_id'],
        db.not_(db.and_(Goal.goal_type == 'performance', Goal.approval_status == 'draft'))
    ).all()
    
    total = len(goals)
    completed = sum(1 for g in goals if g.status == 'completed' or g.progress_percentage == 100)
    in_progress = sum(1 for g in goals if g.status == 'in_progress' or (g.status == 'active' and 0 < (g.progress_percentage or 0) < 100))
    not_started = sum(1 for g in goals if g.status == 'not_started' or (g.status == 'active' and (g.progress_percentage or 0) == 0))
    
    avg_progress = 0
    if total > 0:
        avg_progress = sum((g.progress_percentage or 0) for g in goals) / total
        
    return jsonify({
        'total': total,
        'completed': completed,
        'in_progress': in_progress,
        'not_started': not_started,
        'average_progress': avg_progress
    })


@goals_bp.route('/reports/summary', methods=['GET'])
@require_auth
def goal_reports_summary():
    """Get summary statistics for goals."""
    ctx = g.current_user
    scope = request.args.get('scope', 'mine')

    if scope == 'mine':
        query = Goal.query.filter(Goal.employee_id == ctx['user_id'])
    elif scope == 'team':
        reports = UserProfile.query.filter_by(manager_id=ctx['user_id'], is_active=True).all()
        report_ids = [r.id for r in reports]
        query = Goal.query.filter(Goal.employee_id.in_(report_ids))
    elif scope == 'all':
        if ctx['role'] not in ('hr_admin', 'super_admin'):
            return jsonify({'error': 'Forbidden'}), 403
        query = Goal.query
    else:
        query = Goal.query.filter(Goal.employee_id == ctx['user_id'])

    goals = query.all()

    total = len(goals)
    completed = sum(1 for g in goals if g.status == 'completed' or g.progress_percentage == 100)
    in_progress = sum(1 for g in goals if g.status == 'in_progress' or (g.status == 'active' and 0 < (g.progress_percentage or 0) < 100))
    not_started = sum(1 for g in goals if g.status == 'not_started' or (g.status == 'active' and (g.progress_percentage or 0) == 0))
    
    result = {
        'total': total,
        'completed': completed,
        'in_progress': in_progress,
        'not_started': not_started
    }

    return jsonify(result)




@goals_bp.route('/calculate-score/<appraisal_id>', methods=['POST'])
@require_auth
def calculate_appraisal_score(appraisal_id):
    """Trigger the ReviewService to calculate scores for an appraisal."""
    from services.review_service import ReviewService
    results = ReviewService.calculate_scores(appraisal_id)
    if not results:
        return jsonify({'error': 'Appraisal not found'}), 404
    return jsonify(results)


# ═══════════════════════════════════════════════════════════════════════
# Manager — Push Templates to Team
# ═══════════════════════════════════════════════════════════════════════

@goals_bp.route('/push-templates-to-team', methods=['POST'])
@require_auth
def push_templates_to_team():
    """Assign selected goal templates to a team member (or all) as draft goals.

    Body: { template_ids: [str], cycle_id: str, employee_id: str (optional) }
    If employee_id given, assign to that member only. Otherwise, all direct reports.
    """
    from models.goal_template import GoalTemplate
    from models.appraisal_cycle import AppraisalCycle

    ctx = g.current_user
    data = request.get_json()

    if not data:
        return jsonify({'error': 'Request body required'}), 400

    template_ids = data.get('template_ids', [])
    cycle_id = data.get('cycle_id')
    employee_id = data.get('employee_id')  # Optional: assign to one member

    if not template_ids:
        return jsonify({'error': 'template_ids is required and must not be empty'}), 400
    if not cycle_id:
        return jsonify({'error': 'cycle_id is required'}), 400

    # Validate the caller is a manager or HR
    is_hr = ctx['role'] in ('hr_admin', 'super_admin')
    direct_reports = UserProfile.query.filter_by(manager_id=ctx['user_id'], is_active=True).all()
    report_ids = {r.id for r in direct_reports}

    if not is_hr and not direct_reports:
        return jsonify({'error': 'Forbidden: You have no direct reports.'}), 403

    # Determine target employees
    if employee_id:
        if not is_hr and employee_id not in report_ids:
            return jsonify({'error': 'This employee is not one of your direct reports.'}), 403
        target_employee = UserProfile.query.get(employee_id)
        if not target_employee:
            return jsonify({'error': 'Employee not found.'}), 404
        target_employees = [target_employee]
    else:
        target_employees = direct_reports

    # Validate templates exist and belong to manager's dept or are org-wide
    caller_profile = UserProfile.query.get(ctx['user_id'])
    caller_dept_id = caller_profile.department_id if caller_profile else None

    templates = GoalTemplate.query.filter(
        GoalTemplate.id.in_(template_ids),
        GoalTemplate.cycle_id == cycle_id,
        GoalTemplate.is_active == True,
        db.or_(
            GoalTemplate.department_id.is_(None),
            GoalTemplate.department_id == caller_dept_id,
        )
    ).all()

    if not templates:
        return jsonify({'error': 'No valid templates found for your department in this cycle'}), 404

    cycle = AppraisalCycle.query.get(cycle_id)
    start_date = cycle.start_date if cycle else None
    end_date = cycle.end_date if cycle else None

    created = 0
    updated = 0

    for employee in target_employees:
        for tmpl in templates:
            existing = Goal.query.filter_by(
                employee_id=employee.id,
                appraisal_cycle_id=cycle_id,
                title=tmpl.title
            ).first()

            if existing:
                # Re-assign: update existing goal to approved
                existing.description = tmpl.description
                existing.approval_status = 'approved'
                existing.department_id = tmpl.department_id
                updated += 1
                continue

            goal = Goal(
                employee_id=employee.id,
                title=tmpl.title,
                description=tmpl.description,
                category=tmpl.category,
                appraisal_cycle_id=cycle_id,
                created_by=ctx['user_id'],
                status='active',
                goal_type='performance',
                weight=0,
                start_date=start_date,
                target_date=end_date,
                approval_status='approved',  # Manager-assigned = auto-approved
                department_id=tmpl.department_id,
            )
            db.session.add(goal)
            created += 1

            # Notify the employee
            NotificationService.create_notification(
                recipient_id=employee.id,
                event='goal_assigned',
                triggered_by=ctx['user_id'],
                resource_type='goal',
                resource_id=None,
            )

    db.session.commit()

    member_label = (
        f'{target_employees[0].first_name} {target_employees[0].last_name}'
        if employee_id else f'{len(target_employees)} team member(s)'
    )
    parts = []
    if created:
        parts.append(f'{created} new')
    if updated:
        parts.append(f'{updated} updated')
    summary = ' and '.join(parts) if parts else '0'
    return jsonify({
        'message': f'{summary} goal(s) assigned to {member_label}.',
        'created': created,
        'updated': updated,
        'team_size': len(target_employees),
    })
