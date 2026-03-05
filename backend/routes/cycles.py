"""
Appraisal Cycle routes — CRUD, activate/stop cycles, manage questions.
Migrated from appraisal-service/routes/cycles.py.

Key changes:
- User fetching for auto-creation uses direct DB query instead of HTTP
- Notification creation uses direct NotificationService instead of HTTP
- Per-type active cycle enforcement (one annual + one probation + one mid_year)
- Auto-spillover: annual activation creates probation cycle for ineligible users
"""
import logging
from datetime import datetime, timezone, date, timedelta
from dateutil.relativedelta import relativedelta

from flask import Blueprint, request, jsonify, g, current_app

from extensions import db
from models.appraisal_cycle import AppraisalCycle
from models.appraisal_question import AppraisalQuestion
from models.appraisal import Appraisal
from models.user_profile import UserProfile
from services.eligibility_engine import check_eligibility, get_ineligible_users_for_spillover
from services.notification_service import NotificationService
from utils.decorators import require_auth, require_role

logger = logging.getLogger(__name__)

cycles_bp = Blueprint('cycles', __name__)


def _create_appraisals_for_active_users(cycle_id, criteria=None):
    """Auto-create appraisals for eligible active users.

    Direct DB query replaces HTTP call to user-service.
    Eligibility is determined by the cycle-type-aware eligibility engine.
    """
    cycle = AppraisalCycle.query.get(cycle_id)
    if not cycle:
        logger.error('Cycle %s not found', cycle_id)
        return

    try:
        # Build query for active users
        query = UserProfile.query.filter_by(is_active=True)

        if criteria:
            dept_id = criteria.get('department_id')
            if dept_id and dept_id != 'all':
                query = query.filter(UserProfile.department_id == dept_id)
            emp_type = criteria.get('employment_type')
            if emp_type and emp_type != 'all':
                query = query.filter(UserProfile.employment_type == emp_type)

        users = query.all()

        if not users:
            logger.info('No active users found for cycle %s', cycle_id)
            return

        count = 0
        skipped = 0
        notified = 0

        for user in users:
            user_data = user.to_dict()

            # Idempotent: skip if appraisal already exists
            exists = Appraisal.query.filter_by(
                cycle_id=cycle_id, employee_id=user.id
            ).first()

            if not exists:
                # Check eligibility using the cycle-type-aware engine
                eligibility = check_eligibility(user_data, cycle)

                if not eligibility['is_eligible']:
                    logger.debug('Skipping %s: %s', user.email, eligibility['reason'])
                    skipped += 1
                    continue

                appraisal_start_date = None
                appraisal_end_date = None
                
                # Dynamic Probation Window Overrides
                if cycle.cycle_type == 'probation' and user.start_date:
                    appraisal_start_date = user.start_date
                    appraisal_end_date = user.start_date + relativedelta(months=3)

                appraisal = Appraisal(
                    cycle_id=cycle_id,
                    employee_id=user.id,
                    manager_id=user.manager_id,
                    status='not_started',
                    eligibility_status='eligible',
                    eligibility_reason=eligibility['reason'],
                    is_prorated=eligibility['is_prorated'],
                    start_date=appraisal_start_date,
                    end_date=appraisal_end_date,
                )
                db.session.add(appraisal)
                db.session.flush()  # ensure appraisal.id is accessible
                
                from services.provisioning import provision_appraisal_templates
                provision_appraisal_templates(appraisal)
                
                count += 1

                # Send notification (direct call, no HTTP)
                NotificationService.create_notification(
                    recipient_id=user.id,
                    event='cycle_started',
                    triggered_by='system',
                    resource_type='appraisal_cycle',
                    resource_id=cycle.id,
                )
                notified += 1

        db.session.commit()
        logger.info(
            'Cycle %s (%s): Created %d appraisals, skipped %d, notified %d',
            cycle_id, cycle.cycle_type, count, skipped, notified,
        )

    except Exception as e:
        db.session.rollback()
        logger.error('Error creating appraisals for cycle %s: %s', cycle_id, e, exc_info=True)


def _create_probation_spillover(annual_cycle, criteria=None):
    """Auto-create a probation cycle for users ineligible for the annual cycle.

    When HR activates an annual cycle with a cutoff date, employees who
    joined after the cutoff are automatically placed in a probation cycle.
    The probation cycle is linked to the annual cycle via parent_cycle_id.

    Returns the created probation cycle, or None if no spillover needed.
    """
    # Check if a spillover already exists for this annual cycle
    existing = AppraisalCycle.query.filter_by(
        parent_cycle_id=annual_cycle.id,
        cycle_type='probation',
    ).first()
    if existing:
        logger.info('Probation spillover already exists for annual cycle %s: %s',
                     annual_cycle.id, existing.id)
        # Re-sync users into the existing spillover
        _create_appraisals_for_active_users(existing.id, criteria)
        return existing

    # Get users who were deferred from the annual cycle
    users = UserProfile.query.filter_by(is_active=True).all()
    ineligible = get_ineligible_users_for_spillover(annual_cycle, users)

    if not ineligible:
        logger.info('No ineligible users for probation spillover')
        return None

    # Determine year from the annual cycle
    year = annual_cycle.start_date.year if annual_cycle.start_date else date.today().year

    # Create the probation cycle
    probation_cycle = AppraisalCycle(
        name=f'Probation Goals — {year}',
        description=f'Auto-created probation cycle for employees who joined after '
                    f'{annual_cycle.eligibility_cutoff_date}. Linked to annual cycle: '
                    f'"{annual_cycle.name}".',
        cycle_type='probation',
        status='active',
        start_date=annual_cycle.eligibility_cutoff_date + timedelta(days=1),
        end_date=annual_cycle.end_date,
        eligibility_cutoff_date=annual_cycle.eligibility_cutoff_date,
        parent_cycle_id=annual_cycle.id,
        created_by=annual_cycle.created_by,
    )
    db.session.add(probation_cycle)
    db.session.commit()

    logger.info(
        'Created probation spillover cycle "%s" (%s) for %d users',
        probation_cycle.name, probation_cycle.id, len(ineligible),
    )

    # Create appraisals for the ineligible users in the probation cycle
    _create_appraisals_for_active_users(probation_cycle.id, criteria)

    return probation_cycle


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

    ctx = g.current_user

    cycle = AppraisalCycle(
        name=data['name'],
        description=data.get('description'),
        cycle_type=data.get('cycle_type', 'annual'),
        start_date=_parse_date(data['start_date']),
        end_date=_parse_date(data['end_date']),
        self_assessment_deadline=_parse_date(data.get('self_assessment_deadline')),
        manager_review_deadline=_parse_date(data.get('manager_review_deadline')),
        eligibility_cutoff_date=_parse_date(data.get('eligibility_cutoff_date')),
        goals_weight=data.get('goals_weight', 70),
        attributes_weight=data.get('attributes_weight', 30),
        peer_feedback_weight=data.get('peer_feedback_weight', 0),
        requires_calibration=data.get('requires_calibration', False),
        created_by=ctx['user_id'],
        status='draft',
    )

    # Validate weights sum to 100
    if cycle.goals_weight + cycle.attributes_weight + cycle.peer_feedback_weight != 100:
        return jsonify({'error': 'goals_weight + attributes_weight + peer_feedback_weight must equal 100'}), 400

    db.session.add(cycle)
    db.session.commit()

    return jsonify(cycle.to_dict()), 201


@cycles_bp.route('/', methods=['GET'])
@require_auth
def list_cycles():
    """List all cycles. Auto-completes expired cycles."""
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


@cycles_bp.route('/active', methods=['GET'])
@require_auth
def get_active_cycles():
    """Get all currently active cycles (one per type is allowed).

    Returns a list of active cycles. For backward compatibility,
    if ?single=true is passed, returns only the first one (or null).
    """
    active = AppraisalCycle.query.filter_by(status='active') \
        .order_by(AppraisalCycle.created_at.desc()).all()

    single_mode = request.args.get('single', '').lower() == 'true'
    if single_mode:
        return jsonify(active[0].to_dict() if active else None)

    return jsonify([c.to_dict() for c in active])


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
    """Activate a cycle. HR Admin only.

    Enforces ONE active cycle per type:
      - One active 'annual' cycle at a time
      - One active 'probation' cycle at a time
      - One active 'mid_year' cycle at a time

    For annual cycles: auto-creates a probation spillover cycle for
    employees who joined after the eligibility cutoff date.
    """
    cycle = AppraisalCycle.query.get_or_404(id)
    criteria = request.get_json() or {}

    if cycle.status == 'active':
        # Re-sync users for an already active cycle
        logger.info('Re-syncing users for active cycle %s', cycle.id)
    else:
        # Check for existing active cycle of the SAME TYPE
        existing_active = AppraisalCycle.query.filter(
            AppraisalCycle.status == 'active',
            AppraisalCycle.cycle_type == cycle.cycle_type,
            AppraisalCycle.id != id,
        ).first()

        if existing_active:
            return jsonify({
                'error': 'CYCLE_CONFLICT',
                'message': (
                    f'Another {cycle.cycle_type} cycle is already active: '
                    f'"{existing_active.name}" (ID: {existing_active.id}). '
                    f'Stop it first before activating a new one.'
                ),
                'active_cycle_id': existing_active.id,
                'active_cycle_name': existing_active.name,
            }), 409

        cycle.status = 'active'
        db.session.commit()
        logger.info('Activated %s cycle: %s (%s)', cycle.cycle_type, cycle.name, cycle.id)

    # Create appraisals for eligible users
    _create_appraisals_for_active_users(cycle.id, criteria)

    # Auto-spillover: for annual cycles, create probation cycle for ineligible users
    spillover_cycle = None
    if cycle.cycle_type == 'annual' and cycle.eligibility_cutoff_date:
        spillover_cycle = _create_probation_spillover(cycle, criteria)

    cycle = AppraisalCycle.query.get(id)
    response = {
        'message': 'Cycle activated and appraisals generated',
        'cycle': cycle.to_dict(),
    }
    if spillover_cycle:
        response['spillover_cycle'] = spillover_cycle.to_dict()
        response['message'] += f' — probation spillover cycle also created: "{spillover_cycle.name}"'

    return jsonify(response)


@cycles_bp.route('/<id>/sync-users', methods=['POST'])
@require_role('hr_admin', 'super_admin')
def sync_users(id):
    """Sync eligible users into an active cycle. HR Admin only.
    
    This evaluates all active employees and generates appraisals for anyone 
    who is now eligible but doesn't have one yet (e.g. they finished probation).
    """
    cycle = AppraisalCycle.query.get_or_404(id)
    criteria = request.get_json() or {}

    if cycle.status != 'active':
        return jsonify({'error': 'Can only sync users into an active cycle'}), 400

    # _create_appraisals_for_active_users is idempotent. It will safely skip
    # users who already have an appraisal for this cycle.
    _create_appraisals_for_active_users(cycle.id, criteria)

    return jsonify({
        'message': 'Users synced successfully. Appraisals generated for newly eligible employees.',
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
    if 'goals_weight' in data:
        cycle.goals_weight = data['goals_weight']
    if 'attributes_weight' in data:
        cycle.attributes_weight = data['attributes_weight']
    if 'peer_feedback_weight' in data:
        cycle.peer_feedback_weight = data['peer_feedback_weight']
    if 'requires_calibration' in data:
        cycle.requires_calibration = data['requires_calibration']

    # Validate weights sum to 100
    if cycle.goals_weight + cycle.attributes_weight + cycle.peer_feedback_weight != 100:
        return jsonify({'error': 'goals_weight + attributes_weight + peer_feedback_weight must equal 100'}), 400

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
    """Delete a cycle. HR Admin only."""
    cycle = AppraisalCycle.query.get_or_404(id)

    started_count = Appraisal.query.filter(
        Appraisal.cycle_id == id,
        Appraisal.status != 'not_started'
    ).count()

    if started_count > 0:
        return jsonify({
            'error': 'Cannot delete cycle',
            'message': f'This cycle has {started_count} in-progress or completed appraisals.'
        }), 400

    try:
        Appraisal.query.filter_by(cycle_id=id).delete()
        AppraisalQuestion.query.filter_by(cycle_id=id).delete()
        db.session.delete(cycle)
        db.session.commit()
        return jsonify({'message': 'Cycle deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ─── Reports ──────────────────────────────────────────────────────

@cycles_bp.route('/<cycle_id>/summary', methods=['GET'])
@require_auth
def cycle_summary(cycle_id):
    """Get summary stats for a cycle."""
    from sqlalchemy import func

    stats = db.session.query(Appraisal.status, func.count(Appraisal.id)) \
        .filter(Appraisal.cycle_id == cycle_id) \
        .group_by(Appraisal.status).all()

    total = sum(count for _, count in stats)
    result = {status: count for status, count in stats}
    result['total'] = total

    return jsonify(result)


@cycles_bp.route('/<cycle_id>/start-calibration', methods=['POST'])
@require_role('hr_admin', 'super_admin')
def start_calibration(cycle_id):
    """Bulk-move all manager_review appraisals → calibration for a cycle.

    Only valid when cycle.requires_calibration is True.
    """
    cycle = AppraisalCycle.query.get_or_404(cycle_id)
    if not getattr(cycle, 'requires_calibration', False):
        return jsonify({'error': 'This cycle does not require calibration'}), 400

    pending = Appraisal.query.filter_by(cycle_id=cycle_id, status='manager_review').all()

    moved = 0
    for appraisal in pending:
        appraisal.status = 'calibration'
        moved += 1

    db.session.commit()

    return jsonify({
        'message': f'Moved {moved} appraisal(s) to calibration.',
        'moved': moved,
    })


@cycles_bp.route('/<cycle_id>/check-completion', methods=['POST'])
@require_role('hr_admin', 'super_admin')
def check_cycle_completion(cycle_id):
    """Check if all appraisals in a cycle are completed; if so, mark the cycle as completed.

    Returns counts of each status and whether the cycle was auto-closed.
    """
    cycle = AppraisalCycle.query.get_or_404(cycle_id)
    if cycle.status != 'active':
        return jsonify({'error': 'Cycle is not active', 'status': cycle.status}), 400

    from sqlalchemy import func

    stats = db.session.query(Appraisal.status, func.count(Appraisal.id)) \
        .filter(Appraisal.cycle_id == cycle_id) \
        .group_by(Appraisal.status).all()

    status_counts = {status: count for status, count in stats}
    total = sum(status_counts.values())
    completed = status_counts.get('completed', 0)

    auto_closed = False
    if total > 0 and completed == total:
        cycle.status = 'completed'
        db.session.commit()
        auto_closed = True

    return jsonify({
        'total': total,
        'completed': completed,
        'remaining': total - completed,
        'status_counts': status_counts,
        'cycle_status': cycle.status,
        'auto_closed': auto_closed,
    })
