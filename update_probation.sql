UPDATE user_profiles
SET probation_status = 'pending',
    probation_end_date = start_date + INTERVAL '6 months'
WHERE first_name IN ('Tom', 'Uma', 'Pete', 'Nathan', 'Jane', 'Zack', 'David', 'Mia', 'Ian', 'Yara');
