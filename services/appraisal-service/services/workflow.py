"""
Appraisal Workflow State Machine
================================

State flow:
    not_started
    → goals_pending_approval
    → goals_approved
    → self_assessment_in_progress
    → manager_review
    → completed

This module centralises ALL status transition logic.
Other routes call `update_appraisal_status(appraisal)` and the
state machine figures out the correct status.
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
    'completed',
]

# ── Allowed forward transitions ────────────────────────────────────

TRANSITIONS = {
    'not_started':                ['goals_pending_approval'],
    'goals_pending_approval':     ['goals_approved', 'not_started'],  # back if goals removed
    'goals_approved':             ['self_assessment_in_progress'],
    'self_assessment_in_progress': ['manager_review'],
    'manager_review':             ['completed'],
    'completed':                  [],  # terminal
}


def can_transition(current_status: str, new_status: str) -> bool:
    """Check whether a status transition is allowed."""
    allowed = TRANSITIONS.get(current_status, [])
    return new_status in allowed


def update_appraisal_status(appraisal, goals=None):
    """
    Central state-machine function.

    Evaluates the appraisal's current state against its data and
    computes the correct status.

    Args:
        appraisal: Appraisal model instance.
        goals: List of goal dicts (from goal-service). If None, status
               decisions that depend on goals are skipped.

    Returns:
        str: The new status (also persisted to DB if changed).
    """
    old_status = appraisal.status

    # ── 1. No goals yet → not_started ────────────────────────────
    if goals is not None and len(goals) == 0:
        new_status = 'not_started'
        if old_status != new_status:
            _apply_transition(appraisal, old_status, new_status)
        return new_status

    # ── 2. Goals exist but not all approved → goals_pending_approval
    if goals is not None:
        all_approved = all(
            g.get('approval_status') == 'approved' for g in goals
        )
        has_goals = len(goals) > 0

        if has_goals and not all_approved:
            new_status = 'goals_pending_approval'
            if old_status != new_status and can_transition(old_status, new_status):
                _apply_transition(appraisal, old_status, new_status)
            elif old_status == 'not_started':
                _apply_transition(appraisal, old_status, new_status)
            return appraisal.status

        # ── 3. All goals approved → goals_approved ───────────────
        if has_goals and all_approved:
            if old_status in ('not_started', 'goals_pending_approval'):
                _apply_transition(appraisal, old_status, 'goals_approved')
            return appraisal.status

    # ── 4. Self-assessment flow ──────────────────────────────────
    if old_status == 'goals_approved':
        # Transition to self_assessment_in_progress happens when
        # employee starts filling the form (or auto on goals_approved)
        # We don't auto-advance here; the route does it.
        return appraisal.status

    if old_status == 'self_assessment_in_progress':
        if appraisal.self_submitted:
            _apply_transition(appraisal, old_status, 'manager_review')
        return appraisal.status

    # ── 5. Manager review ────────────────────────────────────────
    if old_status == 'manager_review':
        if appraisal.manager_submitted:
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
    """
    Force a specific transition (used by route handlers after validation).
    Raises ValueError if the transition is not allowed.
    """
    if not can_transition(appraisal.status, new_status):
        raise ValueError(
            f'Cannot transition from "{appraisal.status}" to "{new_status}". '
            f'Allowed: {TRANSITIONS.get(appraisal.status, [])}'
        )
    old = appraisal.status
    appraisal.status = new_status
    db.session.commit()
    logger.info('Appraisal %s: forced %s → %s', appraisal.id, old, new_status)