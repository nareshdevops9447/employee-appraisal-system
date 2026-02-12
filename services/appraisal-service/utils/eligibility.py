from datetime import date, timedelta
from dateutil.relativedelta import relativedelta

def get_policy_status(user_start_date: date, cycle_end_date: date) -> str:
    """
    Calculates the APR Policy Status based on tenure.
    
    Rules:
    - Calculation Date: Feb 28 of the cycle year (approx 1 month before end).
    - Tenure < 3 months: "feedback_only"
    - 3 <= Tenure < 6 months: "not_eligible_hike"
    - 6 <= Tenure < 12 months: "pro_rated_hike"
    - Tenure >= 12 months: "full_hike"
    
    Args:
        user_start_date: Date user joined.
        cycle_end_date: End date of the cycle (e.g. March 31, 2026).
        
    Returns:
        str: Status code.
    """
    if not user_start_date:
        return "unknown"

    # Determine cutoff date: Feb 28 of the cycle end year
    # Ensure we use the correct year from cycle_end_date
    cutoff_year = cycle_end_date.year
    # Handle if cycle ends in Jan/Feb (unlikely for "April-March" but safe check)
    if cycle_end_date.month < 3:
        cutoff_year = cycle_end_date.year 
    
    cutoff_date = date(cutoff_year, 2, 28)
    
    # Calculate complete months of service
    # relativedelta(dt1, dt2) gives difference
    diff = relativedelta(cutoff_date, user_start_date)
    tenure_months = diff.years * 12 + diff.months
    
    # If joined AFTER cutoff, tenure is negative or 0? 
    # If user joined March 1st, diff is < 0 or small.
    # Logic: if start_date > cutoff_date, they are definitely < 3 months.
    if user_start_date > cutoff_date:
        return "feedback_only" # Or "ineligible"? usually new joiners get feedback.

    if tenure_months < 3:
        return "feedback_only"
    elif 3 <= tenure_months < 6:
        return "eligible_hike_short_tenure" # Explicit eligibility as per rule #2
    elif 6 <= tenure_months < 12:
        return "pro_rated_hike"
    else:
        return "full_hike" # Includes promotion eligibility for >12m

def is_eligible_for_cycle(user_start_date: date, cycle_start_date: date, cycle_end_date: date, rule: str = 'auto') -> bool:
    """
    Wrapper to determine binary eligibility based on the detailed policy status.
    """
    status = get_policy_status(user_start_date, cycle_end_date)
    
    if rule == 'all':
        return True
        
    if rule == 'full_hike_only':
        return status == 'full_hike'
        
    if rule == 'eligible_for_hike':
        # Now includes 3-6 months as well
        return status in ['full_hike', 'pro_rated_hike', 'eligible_hike_short_tenure']
        
    if rule == 'probation_or_feedback':
        return status == 'feedback_only'
        
    if rule == 'auto':
        return True # Everyone is "Eligible" for the cycle, but their treatment differs.
        
    return True
