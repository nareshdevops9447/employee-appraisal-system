-- ============================================
-- Employee Appraisal System — Single Database
-- ============================================
-- Creates a single consolidated database 'eas_db'
-- replacing the previous 4 databases (auth_db, user_db, appraisal_db, goal_db)

CREATE DATABASE eas_db;
GRANT ALL PRIVILEGES ON DATABASE eas_db TO postgres;
