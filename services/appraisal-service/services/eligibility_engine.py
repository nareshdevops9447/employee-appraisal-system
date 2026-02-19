from datetime import date
from dateutil.relativedelta import relativedelta
import logging

logger = logging.getLogger(__name__)

def check_eligibility(user_data, cycle):
    """
    Determine if a user is eligible for the given appraisal cycle.
    
    Args:
        user_data (dict): { 'id', 'start_date', 'employment_type', ... }
        cycle (AppraisalCycle): The active cycle with config.
        
    Returns:
        dict: {
            'is_eligible': bool,
            'status': str (e.g. 'eligible', 'deferred', 'pending_hr_review'),
            'reason': str,
            'is_prorated': bool
        }
    """
    if not user_data.get('start_date'):
        return {
            'is_eligible': False,
            'status': 'deferred',
            'reason': 'Missing start date',
            'is_prorated': False
        }
        
    # parse dates
    join_date = user_data['start_date']
    if isinstance(join_date, str):
        join_date = date.fromisoformat(join_date)
        
    # 1. New Joiner Policy Check
    policy = cycle.new_joiner_policy
    if policy == 'ALWAYS_DEFER':
        return {
            'is_eligible': False,
            'status': 'deferred',
            'reason': 'Policy: Always defer new joiners',
            'is_prorated': False
        }
    
    if policy == 'MANUAL_HR_DECISION':
        return {
            'is_eligible': False,  # Technically eligible but needs approval? 
                                   # User said: Mark as PENDING_HR_REVIEW -> Stop.
                                   # We will create the record but set status to pending?
                                   # Requirements said: "Do not create appraisal record" for defer, 
                                   # but "Mark employee as PENDING" for manual.
                                   # To mark them, we probably need a record or a separate tracker.
                                   # For now, let's treat "is_eligible" = False so we don't start the workflow,
                                   # but we return status 'pending_hr_review' so caller can decide (e.g. create a placeholder).
            'status': 'pending_hr_review',
            'reason': 'Policy: Manual HR Review required',
            'is_prorated': False
        }

    # 2. Eligibility Cutoff
    if cycle.eligibility_cutoff_date and join_date > cycle.eligibility_cutoff_date:
        return {
            'is_eligible': False,
            'status': 'deferred',
            'reason': f'Joined after cutoff date ({cycle.eligibility_cutoff_date})',
            'is_prorated': False
        }

    # 3. Minimum Service
    # Method: months between join_date and cycle_end_date
    diff = relativedelta(cycle.end_date, join_date)
    service_months = diff.years * 12 + diff.months
    
    if service_months < cycle.minimum_service_months:
        return {
            'is_eligible': False,
            'status': 'not_eligible_min_service',
            'reason': f'Service {service_months}m < Minimum {cycle.minimum_service_months}m',
            'is_prorated': False
        }

    # 4. Probation
    # Assuming we don't have explicit probation status in user_data, 
    # we might estimate based on employment_type or just rely on service months.
    # If user_data has 'is_on_probation' or similar, use it.
    # For now, if "probation" is a status in employment_type:
    if user_data.get('employment_type') == 'probation' and not cycle.include_probation_employees:
        return {
            'is_eligible': False,
            'status': 'not_eligible_probation',
            'reason': 'Probation employees excluded',
            'is_prorated': False
        }

    # 5. Proration
    is_prorated = False
    if join_date > cycle.start_date:
        is_prorated = True
        if not cycle.prorated_evaluation_allowed:
             return {
                'is_eligible': False,
                'status': 'not_eligible_prorata_disabled',
                'reason': 'Joined after start date and proration disabled',
                'is_prorated': False
            }

    return {
        'is_eligible': True,
        'status': 'eligible',
        'reason': 'Criteria met',
        'is_prorated': is_prorated
    }
