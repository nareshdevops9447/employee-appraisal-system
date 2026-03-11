import pytest
from datetime import date
from unittest.mock import patch
from services.eligibility_engine import check_eligibility

class MockCycle:
    def __init__(self, cycle_type, start_date, end_date, eligibility_cutoff_date, prorated_evaluation_allowed=True, include_probation_employees=True):
        self.cycle_type = cycle_type
        self.start_date = start_date
        self.end_date = end_date
        self.eligibility_cutoff_date = eligibility_cutoff_date
        self.prorated_evaluation_allowed = prorated_evaluation_allowed
        self.include_probation_employees = include_probation_employees
        self.minimum_service_months = 0

@pytest.fixture
def annual_cycle():
    return MockCycle(
        cycle_type='annual',
        start_date=date(2026, 1, 1),
        end_date=date(2026, 12, 31),
        eligibility_cutoff_date=date(2026, 1, 31)
    )

@pytest.fixture
def probation_cycle():
    return MockCycle(
        cycle_type='probation',
        start_date=date(2026, 1, 1),
        end_date=date(2026, 12, 31),
        eligibility_cutoff_date=date(2026, 1, 31)
    )

@patch('services.eligibility_engine.date')
def test_new_starter_june_during_probation(mock_date, annual_cycle, probation_cycle):
    # If they joined June 1, 2026, their probation ends Sept 1, 2026.
    # If today is August 1, 2026, they should be deferred to probation.
    mock_date.today.return_value = date(2026, 8, 1)
    mock_date.side_effect = lambda *args, **kw: date(*args, **kw)
    
    user_data = {'start_date': date(2026, 6, 1)}
    
    # Check Annual
    res_annual = check_eligibility(user_data, annual_cycle)
    assert not res_annual['is_eligible']
    assert res_annual['status'] == 'deferred_to_probation'
    
    # Check Probation
    res_probation = check_eligibility(user_data, probation_cycle)
    assert res_probation['is_eligible']

@patch('services.eligibility_engine.date')
def test_new_starter_june_post_probation(mock_date, annual_cycle, probation_cycle):
    # If they joined June 1, 2026, probation ends Sept 1, 2026.
    # If today is Sept 15, 2026, they are PAST probation and should be eligible for the annual cycle.
    mock_date.today.return_value = date(2026, 9, 15)
    mock_date.side_effect = lambda *args, **kw: date(*args, **kw)
    
    user_data = {'start_date': date(2026, 6, 1)}
    
    # Check Annual
    res_annual = check_eligibility(user_data, annual_cycle)
    assert res_annual['is_eligible']
    assert res_annual['is_prorated']

@patch('services.eligibility_engine.date')
def test_new_starter_october(mock_date, annual_cycle, probation_cycle):
    # If they joined Oct 1, 2026, probation ends Jan 1, 2027 (AFTER cycle ends)
    # They should NEVER be eligible for the 2026 annual cycle.
    mock_date.today.return_value = date(2026, 11, 15)
    mock_date.side_effect = lambda *args, **kw: date(*args, **kw)
    
    user_data = {'start_date': date(2026, 10, 1)}
    
    # Check Annual
    res_annual = check_eligibility(user_data, annual_cycle)
    assert not res_annual['is_eligible']
    assert res_annual['status'] == 'deferred_to_probation'
    
    # Check Probation
    res_probation = check_eligibility(user_data, probation_cycle)
    assert res_probation['is_eligible']

@patch('services.eligibility_engine.date')
def test_legacy_employee(mock_date, annual_cycle):
    # Joined 2024
    mock_date.today.return_value = date(2026, 5, 1)
    mock_date.side_effect = lambda *args, **kw: date(*args, **kw)
    
    user_data = {'start_date': date(2024, 1, 1)}
    
    # Check Annual
    res_annual = check_eligibility(user_data, annual_cycle)
    assert res_annual['is_eligible']
    assert not res_annual['is_prorated']
