"""
Appraisal Workflow State Machine
================================

State flow (standard):
    not_started
    → goals_pending_approval
    → goals_approved
    → self_assessment_in_progress
    → manager_review
    → acknowledgement_pending
    → completed

State flow (with calibration, when cycle.requires_calibration=True):
    ...
    → manager_review
    → calibration          ← HR can override ratings here
    → acknowledgement_pending
    → completed

Migrated from appraisal-service/services/workflow.py.
"""
import logging
from datetime import datetime, timezone

from extensions import db

logger = logging.getLogger(__name__)

# ── Valid states ────────────────────────────────────────────────────

APPRAISAL_STATES = [
    'not_started',
    'goals_pending_approval',
    'goals_approved',
    'self_assessment_in_progress',
    'manager_review',
    'calibration',
    'acknowledgement_pending',
    'completed',
]

# ── Allowed forward transitions ────────────────────────────────────

TRANSITIONS = {
    'not_started':                 ['goals_pending_approval', 'goals_approved', 'self_assessment_in_progress'],
    'goals_pending_approval':      ['goals_approved', 'self_assessment_in_progress', 'not_started'],
    'goals_approved':              ['self_assessment_in_progress'],
    'self_assessment_in_progress': ['manager_review'],
    'manager_review':              ['acknowledgement_pending', 'calibration'],
    'calibration':                 ['acknowledgement_pending'],
    'acknowledgement_pending':     ['completed'],
    'completed':                   [],
}


def can_transition(current_status: str, new_status: str) -> bool:
    """Check whether a status transition is allowed."""
    allowed = TRANSITIONS.get(current_status, [])
    return new_status in allowed


def update_appraisal_status(appraisal, goals=None):
    """Central state-machine function.

    Evaluates the appraisal's current state against its data and
    computes the correct status.
    """
    old_status = appraisal.status

    # 1. No goals yet → not_started
    if goals is not None and len(goals) == 0:
        new_status = 'not_started'
        if old_status != new_status:
            _apply_transition(appraisal, old_status, new_status)
        return new_status

    # 2. Goals exist but not all approved → goals_pending_approval
    if goals is not None:
        perf_goals = [g for g in goals if g.get('goal_type') == 'performance']
        # The scoring engine (70/30) handles weights, we no longer enforce exactly 100 here 
        # as development goals might be 30%. We just need 3-7 performance goals.
        has_valid_perf_goals = (3 <= len(perf_goals) <= 7)

        all_approved = all(
            g.get('approval_status') == 'approved' for g in goals
        )
        has_goals = len(goals) > 0

        if has_goals and has_valid_perf_goals:
            if not all_approved:
                new_status = 'goals_pending_approval'
                if old_status != new_status and can_transition(old_status, new_status):
                    _apply_transition(appraisal, old_status, new_status)
                elif old_status == 'not_started':
                    _apply_transition(appraisal, old_status, new_status)
                return appraisal.status
            else:
                # 3. All goals approved → check if manager finalized them
                if appraisal.goals_finalized:
                    # Manager signed off → move to self_assessment_in_progress
                    if old_status in ('not_started', 'goals_pending_approval', 'goals_approved'):
                        if can_transition(old_status, 'self_assessment_in_progress'):
                            _apply_transition(appraisal, old_status, 'self_assessment_in_progress')
                        elif can_transition(old_status, 'goals_approved'):
                            _apply_transition(appraisal, old_status, 'goals_approved')
                            _apply_transition(appraisal, 'goals_approved', 'self_assessment_in_progress')
                else:
                    # Goals are approved but not finalized by manager. Stop at goals_approved.
                    if old_status in ('not_started', 'goals_pending_approval'):
                        if can_transition(old_status, 'goals_approved'):
                            _apply_transition(appraisal, old_status, 'goals_approved')

                return appraisal.status
        else:
            # Revert to not_started if criteria is no longer met
            if old_status == 'goals_pending_approval':
                _apply_transition(appraisal, old_status, 'not_started')
            return appraisal.status

    # 4. Self-assessment flow
    if old_status == 'goals_approved':
        return appraisal.status

    if old_status == 'self_assessment_in_progress':
        if appraisal.self_submitted:
            _apply_transition(appraisal, old_status, 'manager_review')
        return appraisal.status

    # 5. Manager review → acknowledgement_pending
    if old_status == 'manager_review':
        if appraisal.manager_submitted:
            _apply_transition(appraisal, old_status, 'acknowledgement_pending')
        return appraisal.status

    # 6. Acknowledgement → completed
    if old_status == 'acknowledgement_pending':
        if appraisal.employee_acknowledgement:
            _apply_transition(appraisal, old_status, 'completed')
        return appraisal.status

    return appraisal.status


def _apply_transition(appraisal, old_status, new_status):
    """Apply a status transition and commit."""
    logger.info(
        'Appraisal %s: %s → %s (employee=%s)',
        appraisal.id, old_status, new_status, appraisal.employee_id,
    )
    appraisal.status = new_status
    db.session.commit()


def force_transition(appraisal, new_status):
    """Force a specific transition (used by route handlers after validation)."""
    if not can_transition(appraisal.status, new_status):
        raise ValueError(
            f'Cannot transition from "{appraisal.status}" to "{new_status}". '
            f'Allowed: {TRANSITIONS.get(appraisal.status, [])}'
        )
    old = appraisal.status
    appraisal.status = new_status
    db.session.commit()
    logger.info('Appraisal %s: forced %s → %s', appraisal.id, old, new_status)
