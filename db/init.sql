-- Initialize all databases for the Employee Appraisal System
-- This script runs on first PostgreSQL startup

CREATE DATABASE auth_db;
CREATE DATABASE user_db;
CREATE DATABASE appraisal_db;
CREATE DATABASE goal_db;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE auth_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE user_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE appraisal_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE goal_db TO postgres;
