import unittest
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from services.eligibility_engine import check_eligibility

class MockCycle:
    def __init__(self, start_date, end_date, min_months=3, cutoff=None, probation=False, policy='AUTO_INCLUDE_IF_ELIGIBLE'):
        self.start_date = start_date
        self.end_date = end_date
        self.minimum_service_months = min_months
        self.eligibility_cutoff_date = cutoff
        self.include_probation_employees = probation
        self.prorated_evaluation_allowed = True
        self.new_joiner_policy = policy

class TestEligibility(unittest.TestCase):
    def setUp(self):
        self.cycle_end = date(2026, 3, 31)
        self.cycle_start = date(2025, 4, 1)
        self.base_cycle = MockCycle(self.cycle_start, self.cycle_end)

    def test_eligible_standard(self):
        # Joined 6 months ago
        join_date = self.cycle_end - relativedelta(months=6)
        user = {'start_date': join_date.isoformat(), 'employment_type': 'permanent'}
        result = check_eligibility(user, self.base_cycle)
        self.assertTrue(result['is_eligible'])
        self.assertEqual(result['status'], 'eligible')

    def test_ineligible_short_tenure(self):
        # Joined 1 month ago
        join_date = self.cycle_end - relativedelta(months=1)
        user = {'start_date': join_date.isoformat(), 'employment_type': 'permanent'}
        result = check_eligibility(user, self.base_cycle)
        self.assertFalse(result['is_eligible'])
        self.assertEqual(result['status'], 'not_eligible_min_service')

    def test_probation_exclusion(self):
        # Joined 6 months ago but on probation
        join_date = self.cycle_end - relativedelta(months=6)
        user = {'start_date': join_date.isoformat(), 'employment_type': 'probation'}
        
        # Cycle excludes probation
        cycle = MockCycle(self.cycle_start, self.cycle_end, probation=False)
        result = check_eligibility(user, cycle)
        self.assertFalse(result['is_eligible'])
        self.assertEqual(result['status'], 'not_eligible_probation')

    def test_probation_inclusion(self):
        # Joined 6 months ago on probation, but included
        join_date = self.cycle_end - relativedelta(months=6)
        user = {'start_date': join_date.isoformat(), 'employment_type': 'probation'}
        
        cycle = MockCycle(self.cycle_start, self.cycle_end, probation=True)
        result = check_eligibility(user, cycle)
        self.assertTrue(result['is_eligible'])

    def test_cutoff_date(self):
        cutoff = date(2026, 1, 1)
        cycle = MockCycle(self.cycle_start, self.cycle_end, cutoff=cutoff)
        
        # Joined after cutoff
        join_date = date(2026, 2, 1)
        user = {'start_date': join_date.isoformat()}
        result = check_eligibility(user, cycle)
        self.assertFalse(result['is_eligible'])
        self.assertIn('cutoff', result['reason'])

    def test_policy_defer(self):
        cycle = MockCycle(self.cycle_start, self.cycle_end, policy='ALWAYS_DEFER')
        join_date = self.cycle_end - relativedelta(months=12) # Long tenure
        user = {'start_date': join_date.isoformat()}
        result = check_eligibility(user, cycle)
        self.assertFalse(result['is_eligible'])
        self.assertEqual(result['status'], 'deferred')

if __name__ == '__main__':
    unittest.main()
