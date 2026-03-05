"""
Appraisal routes — full workflow state machine integration.
Migrated from appraisal-service/routes/appraisals.py.

Key changes:
- Inter-service HTTP calls to user-service and goal-service replaced with
  direct DB queries
- Uses JWT-based @require_auth instead of X-User-Id/X-User-Role headers
"""
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, g, current_app

from extensions import db
from models.appraisal import Appraisal
from models.appraisal_cycle import AppraisalCycle
from models.goal import Goal
from models.user_profile import UserProfile
from sqlalchemy.orm import joinedload
from services.workflow import update_appraisal_status, can_transition, APPRAISAL_STATES
from services.eligibility_engine import check_eligibility
from services.provisioning import provision_appraisal_templates
from utils.decorators import require_auth

appraisals_bp = Blueprint('appraisals', __name__)


# ─── Helpers ────────────────────────────────────────────────────────

def _get_current_user():
    """Get current user from JWT-injected g.current_user."""
    ctx = g.current_user
    return {
        'user_id': ctx['user_id'],
        'user_role': ctx['role'],
        'user_email': ctx.get('email', ''),
    }


def _fetch_user_details(user_id):
    """Fetch user details from the same DB (direct query, no HTTP)."""
    profile = UserProfile.query.get(user_id)
    if profile:
        return profile.to_dict()
    return None


def _fetch_goals_for_appraisal(appraisal):
    """Fetch goals from the same DB (direct query, no HTTP)."""
    goals = Goal.query.filter_by(
        employee_id=appraisal.employee_id,
        appraisal_cycle_id=appraisal.cycle_id,
    ).all()
    return [g.to_dict() for g in goals]


def _check_deadline(cycle, deadline_field, action_name):
    """Check if a deadline has passed."""
    deadline = getattr(cycle, deadline_field, None)
    if deadline is None:
        return False, None

    today = datetime.now(timezone.utc).date()
    if today > deadline:
        return True, (jsonify({
            'error': 'DEADLINE_PASSED',
            'message': f'The {action_name} deadline ({deadline.isoformat()}) has passed.',
            'deadline': deadline.isoformat(),
        }), 400)

    return False, None


def _sync_goal_ratings_to_goals(appraisal, goal_ratings, source='self'):
    """Write per-goal ratings from the JSON blob to the individual Goal rows.

    Args:
        appraisal: The Appraisal instance (used to scope the goal query).
        goal_ratings: Dict[goal_id, {rating, progress, comment}] from frontend.
        source: 'self' or 'manager' — determines which Goal columns are written.
    """
    if not goal_ratings:
        return

    goals = Goal.query.filter_by(
        employee_id=appraisal.employee_id,
        appraisal_cycle_id=appraisal.cycle_id,
    ).all()
    goal_map = {g.id: g for g in goals}

    for goal_id, entry in goal_ratings.items():
        goal = goal_map.get(goal_id)
        if not goal:
            continue
        rating = entry.get('rating')
        comment = entry.get('comment')
        progress = entry.get('progress')

        if source == 'self':
            if rating is not None:
                goal.self_rating = int(rating)
            if comment is not None:
                goal.self_comment = comment
        else:  # manager
            if rating is not None:
                goal.manager_rating = int(rating)
            if comment is not None:
                goal.manager_comment = comment

        if progress is not None:
            goal.progress_percentage = int(progress)


def _ensure_active_appraisal(user_id):
    """Check for active cycle, check eligibility, and create appraisal if needed.

    With multi-cycle support (one active per type), we:
    1. Return an existing appraisal for ANY active cycle.
    2. If none exists, find the best matching active cycle via eligibility.
    """
    # 1. Return existing appraisal for any active cycle
    # We prioritize non-completed appraisals for the 'active' view.
    existing_query = (
        Appraisal.query
        .join(AppraisalCycle, Appraisal.cycle_id == AppraisalCycle.id)
        .filter(
            Appraisal.employee_id == user_id,
            AppraisalCycle.status == 'active',
        )
    )
    
    existing = (
        existing_query
        .filter(Appraisal.status != 'completed')
        .order_by(AppraisalCycle.start_date.desc())
        .first()
    )
    
    if not existing:
        existing = existing_query.order_by(AppraisalCycle.start_date.desc()).first()
    if existing:
        return existing

    # 2. Get all active cycles (may be multiple types)
    active_cycles = AppraisalCycle.query.filter_by(status='active').all()
    if not active_cycles:
        return None

    # 3. Fetch user data once
    user_data = _fetch_user_details(user_id)
    if not user_data:
        current_app.logger.warning(
            'Could not fetch user data for %s, skipping auto-creation', user_id,
        )
        return None

    # 4. Find best matching cycle using eligibility engine
    # Prefer the cycle the user is eligible for; skip cycles they aren't.
    chosen_cycle = None
    chosen_eligibility = None

    for cycle in active_cycles:
        eligibility = check_eligibility(user_data, cycle)
        if eligibility['is_eligible']:
            chosen_cycle = cycle
            chosen_eligibility = eligibility
            break  # Take the first eligible cycle

    if not chosen_cycle:
        current_app.logger.info(
            'User %s is not eligible for any active cycle', user_id,
        )
        return None

    # 5. Create Appraisal
    new_appraisal = Appraisal(
        cycle_id=chosen_cycle.id,
        employee_id=user_id,
        manager_id=user_data.get('manager_id'),
        status='not_started',
        is_prorated=chosen_eligibility['is_prorated'],
        eligibility_status='eligible',
        eligibility_reason=chosen_eligibility['reason'],
    )

    db.session.add(new_appraisal)
    db.session.flush() # flush to get appraisal ID before provisioning
    provision_appraisal_templates(new_appraisal)
    db.session.commit()

    current_app.logger.info(
        'Auto-created appraisal for %s in cycle %s', user_id, chosen_cycle.name,
    )
    return new_appraisal


# ─── GET /api/appraisals/me ────────────────────────────────────────

@appraisals_bp.route('/me', methods=['GET'])
@require_auth
def get_my_appraisal():
    """Get current user's appraisal for the active cycle."""
    ctx = _get_current_user()
    appraisal = _ensure_active_appraisal(ctx['user_id'])

    if not appraisal:
        return jsonify({
            'appraisal': None,
            'goals': [],
            'message': 'No active appraisal found',
        })

    goals = _fetch_goals_for_appraisal(appraisal)
    update_appraisal_status(appraisal, goals)

    result = appraisal.to_dict()
    result['goals'] = goals

    return jsonify(result)


# ─── GET /api/appraisals/active ────────────────────────────────────

@appraisals_bp.route('/active', methods=['GET'])
@require_auth
def get_active_appraisal():
    """Dashboard endpoint: get current user's active appraisal."""
    ctx = _get_current_user()
    target_user_id = ctx['user_id']
    employee_id = request.args.get('employee_id')

    if employee_id and employee_id != ctx['user_id']:
        if ctx['user_role'] not in ('manager', 'hr_admin', 'super_admin'):
            return jsonify({'error': 'Forbidden'}), 403
        target_user_id = employee_id

    appraisal = _ensure_active_appraisal(target_user_id)

    if not appraisal:
        return jsonify(None)

    result = appraisal.to_dict()
    result['goals'] = _fetch_goals_for_appraisal(appraisal)

    return jsonify(result)


# ─── GET /api/appraisals ──────────────────────────────────────────

@appraisals_bp.route('/', methods=['GET'])
@require_auth
def list_appraisals():
    """List appraisals. Scope: mine (default), team (manager), all (HR)."""
    ctx = _get_current_user()
    scope = request.args.get('scope', 'mine')

    query = Appraisal.query.join(
        AppraisalCycle, Appraisal.cycle_id == AppraisalCycle.id
    ).options(
        joinedload(Appraisal.cycle),
        joinedload(Appraisal.employee),
        joinedload(Appraisal.manager),
    )

    if scope == 'mine':
        query = query.filter(Appraisal.employee_id == ctx['user_id'])
    elif scope == 'team':
        query = query.filter(Appraisal.manager_id == ctx['user_id'])
    elif scope == 'all':
        if ctx['user_role'] not in ('hr_admin', 'super_admin'):
            return jsonify({'error': 'Forbidden', 'message': 'HR access required'}), 403
    else:
        query = query.filter(Appraisal.employee_id == ctx['user_id'])

    # Optional filters
    cycle_id = request.args.get('cycle_id')
    status = request.args.get('status')
    cycle_status = request.args.get('cycle_status')
    employee_id = request.args.get('employee_id')

    if cycle_id:
        query = query.filter(Appraisal.cycle_id == cycle_id)
    if status:
        query = query.filter(Appraisal.status == status)
    if cycle_status:
        query = query.filter(AppraisalCycle.status == cycle_status)
    if employee_id:
        query = query.filter(Appraisal.employee_id == employee_id)

    query = query.order_by(
        AppraisalCycle.start_date.desc(),
        Appraisal.updated_at.desc(),
    )

    appraisals = query.all()
    return jsonify([a.to_dict() for a in appraisals])


@appraisals_bp.route('/', methods=['POST'])
@require_auth
def create_appraisal():
    """Manual create/ensure appraisal for a specific user. HR Admin only."""
    if g.current_user['role'] not in ('hr_admin', 'super_admin'):
        return jsonify({'error': 'Forbidden'}), 403
        
    data = request.get_json()
    if not data or not data.get('employee_id') or not data.get('cycle_id'):
        return jsonify({'error': 'employee_id and cycle_id are required'}), 400
        
    # Check if already exists
    appraisal = Appraisal.query.filter_by(
        employee_id=data['employee_id'],
        cycle_id=data['cycle_id']
    ).first()
    
    if not appraisal:
        appraisal = Appraisal(
            employee_id=data['employee_id'],
            cycle_id=data['cycle_id']
        )
        db.session.add(appraisal)
        db.session.flush() # flush to get appraisal ID
        provision_appraisal_templates(appraisal)
        db.session.commit()
        
    return jsonify(appraisal.to_dict()), 201


# ─── GET /api/appraisals/<id> ─────────────────────────────────────

@appraisals_bp.route('/<id>', methods=['GET'])
@require_auth
def get_appraisal(id):
    """Get a single appraisal with cycle details and goals."""
    ctx = _get_current_user()
    appraisal = Appraisal.query.get_or_404(id)

    is_owner = appraisal.employee_id == ctx['user_id']
    is_manager = appraisal.manager_id == ctx['user_id']
    is_hr = ctx['user_role'] in ('hr_admin', 'super_admin')

    if not (is_owner or is_manager or is_hr):
        return jsonify({'error': 'Forbidden'}), 403

    goals = _fetch_goals_for_appraisal(appraisal)

    result = appraisal.to_dict()
    result['goals'] = goals

    return jsonify(result)



# ─── POST /api/appraisals/manager-submit ──────────────────────────

@appraisals_bp.route('/<id>/manager-submit', methods=['POST'])
@require_auth
def manager_submit(id):
    """Manager submits their review."""
    ctx = _get_current_user()
    data = request.get_json() or {}
    
    appraisal = Appraisal.query.get_or_404(id)

    if appraisal.manager_id != ctx['user_id']:
        return jsonify({'error': 'Forbidden — only assigned manager'}), 403

    if appraisal.status != 'manager_review':
        return jsonify({
            'error': 'Appraisal is not in manager_review status',
            'current_status': appraisal.status,
        }), 400

    if appraisal.cycle:
        past, err = _check_deadline(appraisal.cycle, 'manager_review_deadline', 'manager-review')
        if past:
            return err

    # Narrative fields (Phase 2.2)
    if 'strengths' in data:
        appraisal.strengths = data['strengths']
    if 'development_areas' in data:
        appraisal.development_areas = data['development_areas']
    if 'overall_comment' in data:
        appraisal.overall_comment = data['overall_comment']

    appraisal.manager_submitted = True
    appraisal.manager_assessment_submitted_at = datetime.now(timezone.utc)
    appraisal.status = 'acknowledgement_pending'

    db.session.commit()

    # Auto-calculate scores from goal ratings and attribute answers
    try:
        from services.review_service import ReviewService
        ReviewService.calculate_scores(appraisal.id)
    except Exception as e:
        current_app.logger.warning(f'Score calculation failed for appraisal {appraisal.id}: {e}')

    return jsonify({
        'message': 'Manager review submitted. Awaiting employee acknowledgement.',
        'appraisal': appraisal.to_dict(),
    })


# ─── POST /api/appraisals/<id>/sync-goals ─────────────────────────

@appraisals_bp.route('/<id>/sync-goals', methods=['POST'])
@require_auth
def sync_goals(id):
    """Recalculate appraisal status based on current goal states."""
    appraisal = Appraisal.query.get_or_404(id)
    data = request.get_json() or {}

    goals = data.get('goals')
    if goals is None:
        goals = _fetch_goals_for_appraisal(appraisal)

    if goals is not None:
        update_appraisal_status(appraisal, goals)

    return jsonify({
        'message': 'Status synced',
        'appraisal': appraisal.to_dict(),
    })




@appraisals_bp.route('/<id>/finalize-goals', methods=['POST'])
@require_auth
def finalize_goals(id):
    """Manager explicitly signs off on goals, locking the goal phase."""
    ctx = _get_current_user()
    appraisal = Appraisal.query.get_or_404(id)

    if appraisal.manager_id != ctx['user_id'] and ctx['user_role'] not in ('hr_admin', 'super_admin'):
        return jsonify({'error': 'Forbidden. Only the manager can finalize goals.'}), 403

    appraisal.goals_finalized = True
    db.session.commit()

    # Re-sync status to push it to self_assessment (if criteria met)
    goals = _fetch_goals_for_appraisal(appraisal)
    update_appraisal_status(appraisal, goals)

    return jsonify({
        'message': 'Goals finalized successfully.',
        'appraisal': appraisal.to_dict(),
    })


@appraisals_bp.route('/<id>/meeting', methods=['PUT'])
@require_auth
def log_meeting(id):
    """Log a meeting for an appraisal."""
    ctx = _get_current_user()
    appraisal = Appraisal.query.get_or_404(id)

    if appraisal.manager_id != ctx['user_id']:
        return jsonify({'error': 'Forbidden'}), 403

    data = request.get_json()
    if data.get('date'):
        appraisal.meeting_date = datetime.fromisoformat(data['date'])
    appraisal.meeting_notes = data.get('notes')

    db.session.commit()
    return jsonify(appraisal.to_dict())


@appraisals_bp.route('/<id>/acknowledge', methods=['PUT'])
@require_auth
def acknowledge(id):
    """Employee acknowledges (or disputes) their appraisal.

    Body:
        comments (str, optional):  Employee's sign-off comments.
        dispute  (bool, optional): True to flag disagreement.
    """
    ctx = _get_current_user()
    appraisal = Appraisal.query.get_or_404(id)

    if appraisal.employee_id != ctx['user_id']:
        return jsonify({'error': 'Forbidden'}), 403

    if appraisal.status != 'acknowledgement_pending':
        return jsonify({
            'error': 'Appraisal is not awaiting acknowledgement',
            'current_status': appraisal.status,
        }), 400

    data = request.get_json() or {}
    appraisal.employee_acknowledgement = True
    appraisal.employee_acknowledgement_date = datetime.now(timezone.utc)
    appraisal.employee_comments = data.get('comments')
    appraisal.is_dispute = bool(data.get('dispute', False))
    appraisal.status = 'completed'

    if appraisal.is_dispute:
        from models.appraisal_appeal import AppraisalAppeal
        # Check if appeal already exists to avoid unique constraint error
        existing_appeal = AppraisalAppeal.query.filter_by(appraisal_id=appraisal.id).first()
        if not existing_appeal:
            appeal = AppraisalAppeal(
                appraisal_id=appraisal.id,
                employee_reason=appraisal.employee_comments or "No reason provided",
                status='pending'
            )
            db.session.add(appeal)

    db.session.commit()

    # Notify manager of acknowledgement
    try:
        from models.notification import Notification
        Notification.create(
            recipient_id=appraisal.manager_id,
            event_type='appraisal_acknowledged',
            message=f'Employee has {"disputed" if appraisal.is_dispute else "acknowledged"} their appraisal.',
            related_id=appraisal.id,
        )
    except Exception:
        pass  # Non-critical

    return jsonify({
        'message': 'Appraisal acknowledged.' + (' (Dispute flagged)' if appraisal.is_dispute else ''),
        'appraisal': appraisal.to_dict(),
    })


@appraisals_bp.route('/<id>/calibrate', methods=['POST'])
@require_auth
def calibrate_appraisal(id):
    """HR override of the overall rating and scores during the calibration phase.

    Body:
        overall_rating (float, required): Calibrated final rating.
        calibration_notes (str, optional): Reason for the change.
    """
    from utils.decorators import require_role
    ctx = _get_current_user()
    if ctx['role'] not in ('hr_admin', 'super_admin'):
        return jsonify({'error': 'Only HR admins can calibrate appraisals'}), 403

    appraisal = Appraisal.query.get_or_404(id)

    if appraisal.status != 'calibration':
        return jsonify({'error': f'Appraisal is not in calibration status (current: {appraisal.status})'}), 400

    data = request.get_json() or {}
    if 'overall_rating' not in data:
        return jsonify({'error': 'overall_rating is required'}), 400

    rating = float(data['overall_rating'])
    if not (1 <= rating <= 5):
        return jsonify({'error': 'overall_rating must be between 1 and 5'}), 400

    # Update the AppraisalReview overall_rating (calibrated override)
    from models.appraisal_review import AppraisalReview
    review = AppraisalReview.query.filter_by(appraisal_id=id).first()
    if not review:
        review = AppraisalReview(appraisal_id=id)
        db.session.add(review)

    review.overall_rating = rating
    if data.get('calibration_notes'):
        review.overall_comment = (review.overall_comment or '') + f'\n\n[Calibration note by HR]: {data["calibration_notes"]}'

    appraisal.status = 'acknowledgement_pending'
    db.session.commit()

    # Notify employee that calibration is done and review is ready for sign-off
    try:
        from services.notification_service import NotificationService
        NotificationService.create_notification(
            recipient_id=appraisal.employee_id,
            event='manager_review_submitted',
            triggered_by=ctx['user_id'],
            resource_type='appraisal',
            resource_id=appraisal.id,
        )
        db.session.commit()
    except Exception:
        pass  # Non-critical

    return jsonify({
        'message': 'Appraisal calibrated and moved to acknowledgement_pending.',
        'appraisal': appraisal.to_dict(),
        'review': review.to_dict(),
    })


# ── Appeal endpoints ───────────────────────────────────────────────

@appraisals_bp.route('/<id>/appeal', methods=['POST'])
@require_auth
def raise_appeal(id):
    """Employee raises an appeal on a completed appraisal.

    Body:
        reason (str, required): The employee's reason for the appeal.
    """
    ctx = _get_current_user()
    appraisal = Appraisal.query.get_or_404(id)

    if appraisal.employee_id != ctx['user_id']:
        return jsonify({'error': 'You can only appeal your own appraisal'}), 403

    if appraisal.status != 'completed':
        return jsonify({'error': 'Appeals can only be raised on completed appraisals'}), 400

    data = request.get_json() or {}
    reason = data.get('reason', '').strip()
    if not reason:
        return jsonify({'error': 'A reason for the appeal is required'}), 400

    from models.appraisal_appeal import AppraisalAppeal

    existing = AppraisalAppeal.query.filter_by(appraisal_id=id).first()
    if existing:
        return jsonify({'error': 'An appeal has already been raised for this appraisal', 'appeal': existing.to_dict()}), 409

    appeal = AppraisalAppeal(
        appraisal_id=id,
        employee_reason=reason,
        status='pending',
    )
    db.session.add(appeal)
    db.session.commit()

    return jsonify({
        'message': 'Appeal raised successfully. HR will be in touch.',
        'appeal': appeal.to_dict(),
    }), 201


@appraisals_bp.route('/appeals', methods=['GET'])
@require_auth
def list_appeals():
    """HR: list all appeals, enriched with employee + cycle info.

    Query params:
        status (str, optional): Filter by appeal status.
    """
    ctx = _get_current_user()
    if ctx['user_role'] not in ('hr_admin', 'super_admin'):
        return jsonify({'error': 'Only HR admins can view appeals'}), 403

    from models.appraisal_appeal import AppraisalAppeal

    status_filter = request.args.get('status')
    query = AppraisalAppeal.query
    if status_filter:
        query = query.filter(AppraisalAppeal.status == status_filter)

    appeals = query.order_by(AppraisalAppeal.created_at.desc()).all()

    result = []
    for appeal in appeals:
        d = appeal.to_dict()
        appraisal = Appraisal.query.get(appeal.appraisal_id)
        if appraisal:
            employee = UserProfile.query.get(appraisal.employee_id)
            d['employee_name'] = (
                f'{employee.first_name} {employee.last_name}'.strip()
                if employee else appraisal.employee_id
            )
            d['employee_email'] = employee.email if employee else ''
            d['appraisal_status'] = appraisal.status
            d['overall_rating'] = appraisal.overall_rating
            cycle = AppraisalCycle.query.get(appraisal.cycle_id)
            d['cycle_name'] = cycle.name if cycle else ''
        result.append(d)

    return jsonify(result)


@appraisals_bp.route('/appeals/<appeal_id>/review', methods=['PUT'])
@require_auth
def review_appeal(appeal_id):
    """HR reviews and resolves an appeal.

    Body:
        status (str, required):            'upheld' or 'overturned'
        review_notes (str, optional):      HR's explanation.
        new_overall_rating (float, opt):   Updated rating if overturned.
    """
    ctx = _get_current_user()
    if ctx['role'] not in ('hr_admin', 'super_admin'):
        return jsonify({'error': 'Only HR admins can review appeals'}), 403

    from models.appraisal_appeal import AppraisalAppeal
    appeal = AppraisalAppeal.query.get_or_404(appeal_id)

    data = request.get_json() or {}
    new_status = data.get('status')
    if new_status not in ('upheld', 'overturned', 'under_review'):
        return jsonify({'error': "status must be 'under_review', 'upheld', or 'overturned'"}), 400

    appeal.status = new_status
    appeal.reviewed_by = ctx['user_id']
    appeal.review_notes = data.get('review_notes')
    appeal.reviewed_at = datetime.now(timezone.utc)

    if new_status == 'overturned' and 'new_overall_rating' in data:
        new_rating = float(data['new_overall_rating'])
        if not (1 <= new_rating <= 5):
            return jsonify({'error': 'new_overall_rating must be between 1 and 5'}), 400
        appeal.new_overall_rating = new_rating

        # Update the appraisal review record with the new rating
        from models.appraisal_review import AppraisalReview
        review = AppraisalReview.query.filter_by(appraisal_id=appeal.appraisal_id).first()
        if review:
            review.overall_rating = new_rating
            if appeal.review_notes:
                review.overall_comment = (review.overall_comment or '') + f'\n\n[Appeal overturned by HR]: {appeal.review_notes}'

    db.session.commit()

    return jsonify({
        'message': f'Appeal {new_status}.',
        'appeal': appeal.to_dict(),
    })
