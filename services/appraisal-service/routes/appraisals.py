"""
Appraisal routes — full workflow state machine integration.

Endpoints:
    GET  /api/appraisals/me           → Current user's active appraisal + status
    GET  /api/appraisals/active       → Dashboard: active appraisal with cycle info
    GET  /api/appraisals              → List (mine/team/all)
    GET  /api/appraisals/<id>         → Single appraisal detail
    POST /api/appraisals/self-save    → Save draft self-assessment (no status change)
    POST /api/appraisals/self-submit  → Final self-assessment submission
    POST /api/appraisals/manager-submit → Manager submits review
    POST /api/appraisals/<id>/sync-goals → Webhook: recalculate status from goals
"""
from datetime import datetime, timezone

import requests as http_requests
from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models.appraisal import Appraisal
from models.appraisal_cycle import AppraisalCycle
from services.workflow import (
    update_appraisal_status,
    can_transition,
    APPRAISAL_STATES,
)
from services.eligibility_engine import check_eligibility

appraisals_bp = Blueprint('appraisals', __name__)


# ─── Helpers ────────────────────────────────────────────────────────

def _get_user_headers():
    """Extract gateway-injected headers."""
    return {
        'user_id': request.headers.get('X-User-Id'),
        'user_role': request.headers.get('X-User-Role', 'employee'),
        'user_email': request.headers.get('X-User-Email', ''),
    }


def _fetch_user_details(user_id):
    """
    Fetch user details (start_date, manager_id, etc.) from user-service.
    """
    user_service_url = current_app.config.get('USER_SERVICE_URL')
    if not user_service_url:
        return None

    try:
        # We need an internal token or just forward headers?
        # Assuming internal communication is allowed or we forward headers.
        headers = {}
        auth = request.headers.get('Authorization')
        if auth:
            headers['Authorization'] = auth
            
        resp = http_requests.get(
            f"{user_service_url}/api/users/{user_id}",
            headers=headers,
            timeout=5
        )
        if resp.status_code == 200:
            return resp.json()
        return None
    except Exception as e:
        current_app.logger.warning('Failed to fetch user details: %s', e)
        return None


def _fetch_goals_for_appraisal(appraisal):
    """
    Fetch goals from goal-service for a given appraisal.
    Returns list of goal dicts or None on failure.
    """
    goal_service_url = current_app.config.get('GOAL_SERVICE_URL')
    if not goal_service_url:
        return None

    try:
        headers = {}
        auth = request.headers.get('Authorization')
        if auth:
            headers['Authorization'] = auth
        # Forward user context
        headers['X-User-Id'] = appraisal.employee_id
        headers['X-User-Role'] = 'employee'

        resp = http_requests.get(
            f"{goal_service_url}/api/goals",
            params={
                'employee_id': appraisal.employee_id,
                'appraisal_cycle_id': appraisal.cycle_id,
            },
            headers=headers,
            timeout=5,
        )
        if resp.status_code == 200:
            data = resp.json()
            # Handle both list and paginated response
            if isinstance(data, list):
                return data
            return data.get('goals', data.get('items', []))
        return None
    except Exception as e:
        current_app.logger.warning('Failed to fetch goals: %s', e)
        return None


def _check_deadline(cycle, deadline_field, action_name):
    """
    Check if a deadline has passed.
    Returns (is_past, error_response) tuple.
    """
    deadline = getattr(cycle, deadline_field, None)
    if deadline is None:
        return False, None

    today = datetime.now(timezone.utc).date()
    if today > deadline:
        return True, jsonify({
            'error': 'DEADLINE_PASSED',
            'message': f'The {action_name} deadline ({deadline.isoformat()}) has passed.',
            'deadline': deadline.isoformat(),
        }), 400

    return False, None


def _ensure_active_appraisal(user_id):
    """
    Check for active cycle, check eligibility, and create appraisal if needed.
    Returns: instance of Appraisal (new or existing) or None.
    """
    # 1. Check if appraisal already exists for active cycle
    existing = (
        Appraisal.query
        .join(AppraisalCycle, Appraisal.cycle_id == AppraisalCycle.id)
        .filter(
            Appraisal.employee_id == user_id,
            AppraisalCycle.status == 'active',
        )
        .order_by(AppraisalCycle.start_date.desc())
        .first()
    )
    if existing:
        return existing

    # 2. Get active cycle
    active_cycle = AppraisalCycle.query.filter_by(status='active').first()
    if not active_cycle:
        return None

    # 3. Check eligibility
    user_data = _fetch_user_details(user_id)
    if not user_data:
        # Cannot determine eligibility without user data
        current_app.logger.warning(f"Could not fetch user data for {user_id}, skipping auto-creation")
        return None

    eligibility = check_eligibility(user_data, active_cycle)
    
    # 4. Handle Ineligibility / Deferral
    if not eligibility['is_eligible']:
        # If policy says MANUAL, we might want to record it?
        # For now, return None so dashboard shows "None" (or maybe we show "Ineligible"?)
        # Requirement: "Do not create appraisal record" if deferred.
        if eligibility['status'] == 'pending_hr_review':
             # Maybe log validation needed?
             pass
        return None

    # 5. Create Appraisal
    new_appraisal = Appraisal(
        cycle_id=active_cycle.id,
        employee_id=user_id,
        manager_id=user_data.get('manager_id'),
        status='not_started',
        is_prorated=eligibility['is_prorated'],
        eligibility_status='eligible',
        eligibility_reason=eligibility['reason']
    )
    
    db.session.add(new_appraisal)
    db.session.commit()
    
    current_app.logger.info(f"Auto-created appraisal for {user_id} in cycle {active_cycle.name}")
    return new_appraisal


# ─── GET /api/appraisals/me ────────────────────────────────────────

@appraisals_bp.route('/me', methods=['GET'])
def get_my_appraisal():
    """
    Get current user's appraisal for the active cycle.
    Includes: appraisal data, status, cycle info, and goals.
    """
    ctx = _get_user_headers()
    if not ctx['user_id']:
        return jsonify({'error': 'Missing X-User-Id header'}), 401

    # Find or auto-create appraisal for the active cycle
    appraisal = _ensure_active_appraisal(ctx['user_id'])


    if not appraisal:
        return jsonify({
            'appraisal': None,
            'goals': [],
            'message': 'No active appraisal found',
        })

    # Fetch associated goals
    goals = _fetch_goals_for_appraisal(appraisal) or []

    # Auto-sync status based on current goal state
    update_appraisal_status(appraisal, goals)

    result = appraisal.to_dict()
    result['goals'] = goals

    return jsonify(result)


# ─── GET /api/appraisals/active ────────────────────────────────────

@appraisals_bp.route('/active', methods=['GET'])
def get_active_appraisal():
    """
    Dashboard endpoint: get current user's active appraisal
    with full cycle details.
    """
    ctx = _get_user_headers()
    if not ctx['user_id']:
        return jsonify({'error': 'Missing X-User-Id header'}), 401

    target_user_id = ctx['user_id']
    employee_id = request.args.get('employee_id')
    
    # If checking for another employee, verify permissions
    if employee_id and employee_id != ctx['user_id']:
        if ctx['user_role'] not in ('manager', 'hr_admin', 'super_admin'):
             return jsonify({'error': 'Forbidden'}), 403
        target_user_id = employee_id

    appraisal = _ensure_active_appraisal(target_user_id)


    if not appraisal:
        return jsonify(None)

    return jsonify(appraisal.to_dict())


# ─── GET /api/appraisals ──────────────────────────────────────────

@appraisals_bp.route('/', methods=['GET'])
def list_appraisals():
    """
    List appraisals. Scope: mine (default), team (manager), all (HR).
    """
    ctx = _get_user_headers()
    scope = request.args.get('scope', 'mine')

    query = Appraisal.query.join(
        AppraisalCycle, Appraisal.cycle_id == AppraisalCycle.id
    )

    if scope == 'mine':
        query = query.filter(Appraisal.employee_id == ctx['user_id'])
    elif scope == 'team':
        query = query.filter(Appraisal.manager_id == ctx['user_id'])
    elif scope == 'all':
        if ctx['user_role'] not in ('hr_admin', 'super_admin'):
            return jsonify({
                'error': 'Forbidden', 'message': 'HR access required'
            }), 403
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


# ─── GET /api/appraisals/<id> ─────────────────────────────────────

@appraisals_bp.route('/<id>', methods=['GET'])
def get_appraisal(id):
    """Get a single appraisal with cycle details and goals."""
    ctx = _get_user_headers()
    appraisal = Appraisal.query.get_or_404(id)

    is_owner = appraisal.employee_id == ctx['user_id']
    is_manager = appraisal.manager_id == ctx['user_id']
    is_hr = ctx['user_role'] in ('hr_admin', 'super_admin')

    if not (is_owner or is_manager or is_hr):
        return jsonify({'error': 'Forbidden'}), 403

    # Fetch goals
    goals = _fetch_goals_for_appraisal(appraisal) or []

    result = appraisal.to_dict()
    result['goals'] = goals

    return jsonify(result)


# ─── POST /api/appraisals/self-save ───────────────────────────────

@appraisals_bp.route('/self-save', methods=['POST'])
def self_save():
    """
    Save draft self-assessment. Does NOT change status.

    Payload:
    {
        "appraisal_id": "...",
        "goal_ratings": {
            "<goal_id>": { "rating": 4, "progress": 80, "comment": "..." }
        },
        "answers": { ... }   // answers to cycle questions
    }
    """
    ctx = _get_user_headers()
    if not ctx['user_id']:
        return jsonify({'error': 'Missing X-User-Id header'}), 401

    data = request.get_json()
    if not data or not data.get('appraisal_id'):
        return jsonify({'error': 'appraisal_id is required'}), 400

    appraisal = Appraisal.query.get_or_404(data['appraisal_id'])

    # Only the employee can save their own self-assessment
    if appraisal.employee_id != ctx['user_id']:
        return jsonify({'error': 'Forbidden'}), 403

    # Can only save during self-assessment phases
    allowed_statuses = [
        'goals_approved',
        'self_assessment_in_progress',
    ]
    if appraisal.status not in allowed_statuses:
        return jsonify({
            'error': 'Cannot save self-assessment in current status',
            'current_status': appraisal.status,
            'allowed_statuses': allowed_statuses,
        }), 400

    # Save draft data (no status change)
    if 'goal_ratings' in data:
        appraisal.goal_ratings = data['goal_ratings']
    if 'answers' in data:
        appraisal.self_assessment = data['answers']

    # Move to self_assessment_in_progress if currently goals_approved
    if appraisal.status == 'goals_approved':
        appraisal.status = 'self_assessment_in_progress'

    db.session.commit()

    return jsonify({
        'message': 'Draft saved',
        'appraisal': appraisal.to_dict(),
    })


# ─── POST /api/appraisals/self-submit ─────────────────────────────

@appraisals_bp.route('/self-submit', methods=['POST'])
def self_submit():
    """
    Final submission of self-assessment.
    Sets self_submitted=True and transitions to manager_review.

    Payload:
    {
        "appraisal_id": "...",
        "goal_ratings": { ... },
        "answers": { ... }
    }
    """
    ctx = _get_user_headers()
    if not ctx['user_id']:
        return jsonify({'error': 'Missing X-User-Id header'}), 401

    data = request.get_json()
    if not data or not data.get('appraisal_id'):
        return jsonify({'error': 'appraisal_id is required'}), 400

    appraisal = Appraisal.query.get_or_404(data['appraisal_id'])

    if appraisal.employee_id != ctx['user_id']:
        return jsonify({'error': 'Forbidden'}), 403

    if appraisal.status not in ('goals_approved', 'self_assessment_in_progress'):
        return jsonify({
            'error': 'Cannot submit self-assessment in current status',
            'current_status': appraisal.status,
        }), 400

    # Check deadline
    if appraisal.cycle:
        past, err = _check_deadline(
            appraisal.cycle, 'self_assessment_deadline', 'self-assessment')
        if past:
            return err

    # Validate: must have goal ratings
    goal_ratings = data.get('goal_ratings', appraisal.goal_ratings)
    if not goal_ratings:
        return jsonify({
            'error': 'Goal ratings are required before submission',
        }), 400

    # Save final data
    appraisal.goal_ratings = goal_ratings
    if 'answers' in data:
        appraisal.self_assessment = data['answers']

    appraisal.self_submitted = True
    appraisal.self_assessment_submitted_at = datetime.now(timezone.utc)

    # Transition: self_assessment_in_progress → manager_review
    appraisal.status = 'manager_review'

    db.session.commit()

    return jsonify({
        'message': 'Self-assessment submitted. Awaiting manager review.',
        'appraisal': appraisal.to_dict(),
    })


# ─── POST /api/appraisals/manager-submit ──────────────────────────

@appraisals_bp.route('/manager-submit', methods=['POST'])
def manager_submit():
    """
    Manager submits their review. Transitions to completed.

    Payload:
    {
        "appraisal_id": "...",
        "goal_ratings": { "<goal_id>": { "rating": 3, "comment": "..." } },
        "answers": { ... },
        "overall_rating": 4,
        "feedback": "Great work overall..."
    }
    """
    ctx = _get_user_headers()
    if not ctx['user_id']:
        return jsonify({'error': 'Missing X-User-Id header'}), 401

    data = request.get_json()
    if not data or not data.get('appraisal_id'):
        return jsonify({'error': 'appraisal_id is required'}), 400

    appraisal = Appraisal.query.get_or_404(data['appraisal_id'])

    # Only the assigned manager can submit
    if appraisal.manager_id != ctx['user_id']:
        return jsonify({'error': 'Forbidden — only assigned manager'}), 403

    if appraisal.status != 'manager_review':
        return jsonify({
            'error': 'Appraisal is not in manager_review status',
            'current_status': appraisal.status,
        }), 400

    # Check deadline
    if appraisal.cycle:
        past, err = _check_deadline(
            appraisal.cycle, 'manager_review_deadline', 'manager-review')
        if past:
            return err

    # Validate overall rating
    overall_rating = data.get('overall_rating')
    if overall_rating is not None:
        if not isinstance(overall_rating, int) or overall_rating < 1 or overall_rating > 5:
            return jsonify({'error': 'overall_rating must be 1-5'}), 400

    # Save manager data
    if 'goal_ratings' in data:
        appraisal.manager_goal_ratings = data['goal_ratings']
    if 'answers' in data:
        appraisal.manager_assessment = data['answers']
    if overall_rating is not None:
        appraisal.overall_rating = overall_rating
    if 'feedback' in data:
        appraisal.meeting_notes = data['feedback']

    appraisal.manager_submitted = True
    appraisal.manager_assessment_submitted_at = datetime.now(timezone.utc)

    # Transition: manager_review → completed
    appraisal.status = 'completed'

    db.session.commit()

    return jsonify({
        'message': 'Manager review submitted. Appraisal completed.',
        'appraisal': appraisal.to_dict(),
    })


# ─── POST /api/appraisals/<id>/sync-goals ─────────────────────────

@appraisals_bp.route('/<id>/sync-goals', methods=['POST'])
def sync_goals(id):
    """
    Webhook endpoint: called by goal-service when goals are
    assigned, approved, or rejected for this appraisal.

    Recalculates the appraisal status based on current goal states.

    Payload (from goal-service):
    {
        "goals": [ { "id": "...", "approval_status": "approved" }, ... ]
    }
    """
    appraisal = Appraisal.query.get_or_404(id)
    data = request.get_json() or {}

    goals = data.get('goals')
    if goals is None:
        # If no goals provided, fetch them
        goals = _fetch_goals_for_appraisal(appraisal)

    if goals is not None:
        update_appraisal_status(appraisal, goals)

    return jsonify({
        'message': 'Status synced',
        'appraisal': appraisal.to_dict(),
    })


# ─── PUT /api/appraisals/<id>/self-assessment (legacy compat) ─────

@appraisals_bp.route('/<id>/self-assessment', methods=['PUT'])
def submit_self_assessment_legacy(id):
    """
    Legacy endpoint: PUT /api/appraisals/<id>/self-assessment
    Supports both draft save (submit=false) and final submit (submit=true).
    """
    ctx = _get_user_headers()
    appraisal = Appraisal.query.get_or_404(id)

    if appraisal.employee_id != ctx['user_id']:
        return jsonify({'error': 'Forbidden'}), 403

    allowed = ['not_started', 'goals_approved', 'self_assessment_in_progress']
    if appraisal.status not in allowed:
        return jsonify({'error': 'Invalid status for self-assessment'}), 400

    data = request.get_json()

    # Save data
    if 'answers' in data:
        appraisal.self_assessment = data['answers']
    if 'goal_ratings' in data:
        appraisal.goal_ratings = data['goal_ratings']

    if appraisal.status in ('not_started', 'goals_approved'):
        appraisal.status = 'self_assessment_in_progress'

    if data.get('submit') is True:
        # Check deadline
        if appraisal.cycle:
            past, err = _check_deadline(
                appraisal.cycle, 'self_assessment_deadline', 'self-assessment')
            if past:
                return err

        appraisal.self_submitted = True
        appraisal.status = 'manager_review'
        appraisal.self_assessment_submitted_at = datetime.now(timezone.utc)

    db.session.commit()
    return jsonify(appraisal.to_dict())


# ─── PUT /api/appraisals/<id>/manager-review (legacy compat) ──────

@appraisals_bp.route('/<id>/manager-review', methods=['PUT'])
def submit_manager_review_legacy(id):
    """Legacy endpoint: PUT /api/appraisals/<id>/manager-review"""
    ctx = _get_user_headers()
    appraisal = Appraisal.query.get_or_404(id)

    if appraisal.manager_id != ctx['user_id']:
        return jsonify({'error': 'Forbidden'}), 403

    data = request.get_json()
    if 'answers' in data:
        appraisal.manager_assessment = data['answers']
    if 'goal_ratings' in data:
        appraisal.manager_goal_ratings = data['goal_ratings']
    appraisal.overall_rating = data.get('rating')

    if data.get('submit') is True:
        if appraisal.cycle:
            past, err = _check_deadline(
                appraisal.cycle, 'manager_review_deadline', 'manager-review')
            if past:
                return err

        appraisal.manager_submitted = True
        appraisal.status = 'completed'
        appraisal.manager_assessment_submitted_at = datetime.now(timezone.utc)

    db.session.commit()
    return jsonify(appraisal.to_dict())


# ─── PUT /api/appraisals/<id>/meeting ─────────────────────────────

@appraisals_bp.route('/<id>/meeting', methods=['PUT'])
def log_meeting(id):
    ctx = _get_user_headers()
    appraisal = Appraisal.query.get_or_404(id)

    if appraisal.manager_id != ctx['user_id']:
        return jsonify({'error': 'Forbidden'}), 403

    data = request.get_json()
    if data.get('date'):
        appraisal.meeting_date = datetime.fromisoformat(data['date'])
    appraisal.meeting_notes = data.get('notes')

    db.session.commit()
    return jsonify(appraisal.to_dict())


# ─── PUT /api/appraisals/<id>/acknowledge ─────────────────────────

@appraisals_bp.route('/<id>/acknowledge', methods=['PUT'])
def acknowledge(id):
    ctx = _get_user_headers()
    appraisal = Appraisal.query.get_or_404(id)

    if appraisal.employee_id != ctx['user_id']:
        return jsonify({'error': 'Forbidden'}), 403

    data = request.get_json() or {}
    appraisal.employee_acknowledgement = True
    appraisal.employee_acknowledgement_date = datetime.now(timezone.utc)
    appraisal.employee_comments = data.get('comments')

    db.session.commit()
    return jsonify(appraisal.to_dict())