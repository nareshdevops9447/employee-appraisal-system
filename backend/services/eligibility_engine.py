"""
Eligibility Engine — determines if a user is eligible for an appraisal cycle.

Supports three cycle types:
  - annual:    employees who joined on/before the eligibility cutoff date
  - probation: employees who joined AFTER the cutoff (new joiners)
  - mid_year:  employees who transferred teams during the cycle period
"""
from datetime import date
import datetime
from dateutil.relativedelta import relativedelta
import logging

logger = logging.getLogger(__name__)


def check_eligibility(user_data, cycle):
    """Determine if a user is eligible for the given appraisal cycle.

    Args:
        user_data (dict): { 'id', 'start_date', 'employment_type', ... }
        cycle (AppraisalCycle): The active cycle with config.

    Returns:
        dict: {
            'is_eligible': bool,
            'status': str,
            'reason': str,
            'is_prorated': bool,
        }
    """
    cycle_type = getattr(cycle, 'cycle_type', 'annual')

    if cycle_type == 'annual':
        return _check_annual_eligibility(user_data, cycle)
    elif cycle_type == 'probation':
        return _check_probation_eligibility(user_data, cycle)
    elif cycle_type == 'mid_year':
        return _check_mid_year_eligibility(user_data, cycle)
    else:
        # Default to annual rules for unknown types
        return _check_annual_eligibility(user_data, cycle)


def _check_annual_eligibility(user_data, cycle):
    """Annual cycle: eligible if joined on/before the cutoff date.

    If start_date is not set, the user is included by default — we cannot
    penalise employees for missing profile data.
    """
    start_date_raw = user_data.get('start_date')

    if not start_date_raw:
        # No start_date → cannot apply date-based rules, default to eligible.
        logger.warning(
            'User %s has no start_date — defaulting to eligible for annual cycle',
            user_data.get('email', user_data.get('id')),
        )
        return _result(True, 'eligible', 'No start_date on record — included by default')

    join_date = _parse_date(start_date_raw)
    today = date.today()
    probation_end_date = join_date + relativedelta(months=3)
    
    # Use cycle start year, falling back to current year
    cycle_year = cycle.start_date.year if cycle.start_date else today.year

    # 1. Mandatory 3-month Probation check (regardless of year)
    if today < probation_end_date:
        return _result(
            False, 'deferred_to_probation',
            f'Still in mandatory 3-month probation (ends {probation_end_date})'
        )

    # 2. Seasonal Logic: Do they have enough time left in the cycle after probation?
    if cycle.end_date and probation_end_date >= cycle.end_date:
        return _result(
            False, 'deferred_to_probation',
            f'Probation ({probation_end_date}) ends too close to or after cycle end ({cycle.end_date})'
        )

    # 3. Eligibility Cutoff - Only applies if they were hired *before* the cycle started
    # For new joiners (hired mid-cycle), they bypass this cutoff if they completed probation (handled above)
    if cycle.start_date and join_date < cycle.start_date:
        if cycle.eligibility_cutoff_date and join_date > cycle.eligibility_cutoff_date:
            logger.info(
                'User %s joined %s, after cutoff %s → not eligible for annual',
                user_data.get('email', user_data.get('id')),
                join_date, cycle.eligibility_cutoff_date,
            )
            return _result(
                False, 'deferred_to_probation',
                f'Joined {join_date} after annual cutoff ({cycle.eligibility_cutoff_date})',
            )


    # Minimum Service
    if cycle.end_date:
        diff = relativedelta(cycle.end_date, join_date)
        service_months = diff.years * 12 + diff.months
        min_months = getattr(cycle, 'minimum_service_months', 0) or 0
        if service_months < min_months:
            return _result(
                False, 'not_eligible_min_service',
                f'Service {service_months}m < Minimum {min_months}m',
            )

    # Probation exclusion
    include_probation = getattr(cycle, 'include_probation_employees', True)
    if user_data.get('employment_type') == 'probation' and not include_probation:
        return _result(False, 'not_eligible_probation', 'Probation employees excluded')

    # Proration
    is_prorated = False
    if cycle.start_date and join_date > cycle.start_date:
        is_prorated = True
        prorated_allowed = getattr(cycle, 'prorated_evaluation_allowed', True)
        if not prorated_allowed:
            return _result(
                False, 'not_eligible_prorata_disabled',
                'Joined after start date and proration disabled',
            )

    return _result(True, 'eligible', 'Criteria met', is_prorated)


def _check_probation_eligibility(user_data, cycle):
    """Probation cycle: eligible if joined AFTER the cutoff date (new joiners).

    This is the inverse of annual eligibility — catches employees who
    were deferred from the annual cycle.

    If start_date is missing, include if no cutoff is set.
    """
    start_date_raw = user_data.get('start_date')

    if not start_date_raw:
        if not cycle.eligibility_cutoff_date:
            return _result(True, 'eligible', 'No start_date — included by default (no cutoff)')
        return _result(False, 'deferred', 'Missing start_date, cannot verify probation eligibility')

    join_date = _parse_date(start_date_raw)

    # For probation cycles, we catch those deferred from annual
    today = date.today()
    probation_end_date = join_date + relativedelta(months=3)
    cycle_year = cycle.start_date.year if cycle.start_date else today.year

    # 1. Check if they are in their first 3 months
    if today < probation_end_date:
        return _result(True, 'eligible', f'New joiner — in mandatory 3-month probation (ends {probation_end_date})')

    # 2. Seasonal Logic: Does their probation end too close to or after the cycle end?
    if cycle.end_date and probation_end_date >= cycle.end_date:
        return _result(True, 'eligible', f'Probation ({probation_end_date}) ends too close to or after cycle end ({cycle.end_date})')

    # 3. Fallback to standard cutoff logic - only applies if hired before cycle started
    if cycle.start_date and join_date < cycle.start_date:
        if cycle.eligibility_cutoff_date:
            if join_date <= cycle.eligibility_cutoff_date:
                return _result(
                    False, 'not_eligible_for_probation',
                    f'Joined {join_date} on/before cutoff ({cycle.eligibility_cutoff_date}) — eligible for annual instead',
                )


    # Must have started by cycle end date to be eligible
    if cycle.end_date and join_date > cycle.end_date:
        return _result(
            False, 'not_eligible_not_yet_joined',
            f'Join date {join_date} is after cycle end ({cycle.end_date})',
        )

    # 4. Safety net: If the employee completed probation well before this cycle started,
    #    they belong in the annual cycle, not the probation cycle.
    if cycle.start_date and probation_end_date < cycle.start_date:
        return _result(
            False, 'not_eligible_for_probation',
            f'Completed probation ({probation_end_date}) before cycle start ({cycle.start_date}) — belongs in annual cycle',
        )

    return _result(True, 'eligible', 'New joiner — probation cycle')


def _check_mid_year_eligibility(user_data, cycle):
    """Mid-year cycle: eligible if employee transferred teams during the cycle period.

    Checks the team_transfers table for transfers between cycle start and end dates.
    """
    from models.team_transfer import TeamTransfer

    user_id = user_data.get('id')
    if not user_id:
        return _result(False, 'deferred', 'Missing user ID')

    start = cycle.start_date
    end = cycle.end_date or date.today()

    # Query for transfers during the cycle period
    transfer_query = TeamTransfer.query.filter(
        TeamTransfer.user_id == user_id,
    )
    if start:
        transfer_query = transfer_query.filter(TeamTransfer.transfer_date >= start)
    transfer_query = transfer_query.filter(TeamTransfer.transfer_date <= end)

    transfer = transfer_query.first()

    if not transfer:
        return _result(
            False, 'not_eligible_no_transfer',
            'No team transfer during cycle period',
        )

    from_dept = transfer.from_department_id or 'unknown'
    to_dept = transfer.to_department_id or 'unknown'
    return _result(
        True, 'eligible',
        f'Team transfer on {transfer.transfer_date} ({from_dept} → {to_dept})',
    )


def get_ineligible_users_for_spillover(cycle, users):
    """Get list of users ineligible for an annual cycle (for probation spillover).

    Args:
        cycle: The annual AppraisalCycle being activated.
        users: List of UserProfile instances to check.

    Returns:
        list of UserProfile: users who should go to probation.
    """
    ineligible = []
    for user in users:
        result = check_eligibility(user.to_dict(), cycle)
        if not result['is_eligible'] and result['status'] == 'deferred_to_probation':
            ineligible.append(user)
    return ineligible


# ── Helpers ──────────────────────────────────────────────────────────

def _parse_date(d):
    if isinstance(d, datetime.date):
        return d
    if isinstance(d, str):
        # Strip time component if present
        d = d.split('T')[0].split(' ')[0]
        return date.fromisoformat(d)
    return d


def _result(is_eligible, status, reason, is_prorated=False):
    return {
        'is_eligible': is_eligible,
        'status': status,
        'reason': reason,
        'is_prorated': is_prorated,
    }
