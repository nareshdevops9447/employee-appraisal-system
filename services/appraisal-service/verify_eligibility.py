from datetime import date
from utils.eligibility import get_policy_status, is_eligible_for_cycle

# Setup Test Data
cycle_end = date(2026, 3, 31) # End of cycle
# Cutoff is Feb 28, 2026

test_cases = [
    # Case 1: Joined Jan 1, 2026 (Tenure < 2 months at cutoff)
    (date(2026, 1, 1), "feedback_only", "< 3 months"),
    
    # Case 2: Joined Nov 1, 2025 (Tenure Nov, Dec, Jan, Feb = 4 months at cutoff)
    (date(2025, 11, 1), "eligible_hike_short_tenure", "3-6 months"),
    
    # Case 3: Joined July 1, 2025 (Tenure July...Feb = 8 months at cutoff)
    (date(2025, 7, 1), "pro_rated_hike", "6-12 months"),
    
    # Case 4: Joined Jan 1, 2025 (Tenure > 12 months)
    (date(2025, 1, 1), "full_hike", "12+ months"),
    
    # Case 5: Joined March 1, 2026 (After cutoff)
    (date(2026, 3, 1), "feedback_only", "After cutoff"),
]

print("Verifying APR Policy Logic...")
print(f"Cycle End: {cycle_end}")
print("-" * 60)
print(f"{'Join Date':<15} | {'Expected':<25} | {'Actual':<25} | {'Result':<10}")
print("-" * 60)

failures = 0
for start_date, expected, label in test_cases:
    actual = get_policy_status(start_date, cycle_end)
    result = "PASS" if actual == expected else "FAIL"
    if result == "FAIL": failures += 1
    print(f"{str(start_date):<15} | {expected:<25} | {actual:<25} | {result}")

print("-" * 60)
if failures == 0:
    print("ALL TESTS PASSED ✅")
else:
    print(f"{failures} TESTS FAILED ❌")

# Verify Filter Wrappers
print("\nVerifying Filters:")
# Test 'eligible_for_hike' filter (Should include 3-6m, 6-12m, 12+m)
u_short = date(2025, 11, 1) # 4mo
u_full = date(2025, 1, 1) # 12+mo
u_new = date(2026, 1, 1) # 1mo

print(f"eligibility_for_hike (Short Tenure user): {is_eligible_for_cycle(u_short, date.today(), cycle_end, 'eligible_for_hike')}")
print(f"eligibility_for_hike (Full Tenure user): {is_eligible_for_cycle(u_full, date.today(), cycle_end, 'eligible_for_hike')}")
print(f"eligibility_for_hike (New user): {is_eligible_for_cycle(u_new, date.today(), cycle_end, 'eligible_for_hike')}")
print(f"probation_or_feedback (New user): {is_eligible_for_cycle(u_new, date.today(), cycle_end, 'probation_or_feedback')}")
