-- Employee Appraisal System Database Schema
-- Run this file to create all necessary tables

-- Drop existing tables (if recreating)
DROP TABLE IF EXISTS appraisal_comments CASCADE;
DROP TABLE IF EXISTS appraisal_ratings CASCADE;
DROP TABLE IF EXISTS appraisals CASCADE;
DROP TABLE IF EXISTS rating_criteria CASCADE;
DROP TABLE IF EXISTS appraisal_periods CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- Create ENUM types
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS user_type CASCADE;
DROP TYPE IF EXISTS appraisal_status CASCADE;

CREATE TYPE user_role AS ENUM ('employee', 'manager', 'admin');
CREATE TYPE user_type AS ENUM ('office', 'field');
CREATE TYPE appraisal_status AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'revision_requested');

-- Departments Table
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role DEFAULT 'employee',
    user_type user_type NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    manager_id INTEGER REFERENCES users(id),
    job_title VARCHAR(100),
    hire_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    profile_picture VARCHAR(500),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appraisal Periods Table
CREATE TABLE appraisal_periods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    submission_deadline DATE NOT NULL,
    review_deadline DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rating Criteria Table
CREATE TABLE rating_criteria (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    weight DECIMAL(3,2) DEFAULT 1.00,
    is_active BOOLEAN DEFAULT TRUE,
    applies_to user_type,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appraisals Table
CREATE TABLE appraisals (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES users(id),
    reviewer_id INTEGER REFERENCES users(id),
    period_id INTEGER NOT NULL REFERENCES appraisal_periods(id),
    status appraisal_status DEFAULT 'draft',
    self_rating DECIMAL(3,2),
    manager_rating DECIMAL(3,2),
    final_rating DECIMAL(3,2),
    employee_comments TEXT,
    manager_comments TEXT,
    goals_achieved TEXT,
    areas_of_improvement TEXT,
    training_needs TEXT,
    submitted_at TIMESTAMP,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, period_id)
);

-- Appraisal Ratings (Individual criteria ratings)
CREATE TABLE appraisal_ratings (
    id SERIAL PRIMARY KEY,
    appraisal_id INTEGER NOT NULL REFERENCES appraisals(id) ON DELETE CASCADE,
    criteria_id INTEGER NOT NULL REFERENCES rating_criteria(id),
    self_score INTEGER CHECK (self_score >= 1 AND self_score <= 5),
    manager_score INTEGER CHECK (manager_score >= 1 AND manager_score <= 5),
    self_comment TEXT,
    manager_comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(appraisal_id, criteria_id)
);

-- Appraisal Comments (Conversation thread)
CREATE TABLE appraisal_comments (
    id SERIAL PRIMARY KEY,
    appraisal_id INTEGER NOT NULL REFERENCES appraisals(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_department ON users(department_id);
CREATE INDEX idx_users_manager ON users(manager_id);
CREATE INDEX idx_appraisals_employee ON appraisals(employee_id);
CREATE INDEX idx_appraisals_reviewer ON appraisals(reviewer_id);
CREATE INDEX idx_appraisals_period ON appraisals(period_id);
CREATE INDEX idx_appraisals_status ON appraisals(status);

-- Insert default departments
INSERT INTO departments (name, description) VALUES
('Human Resources', 'HR department managing employee relations'),
('Engineering', 'Software and hardware development'),
('Sales', 'Sales and business development'),
('Marketing', 'Marketing and brand management'),
('Operations', 'Day-to-day operations and logistics'),
('Finance', 'Financial planning and accounting'),
('Field Operations', 'Field work and on-site services'),
('Customer Support', 'Customer service and support');

-- Insert default rating criteria
INSERT INTO rating_criteria (name, description, category, weight, applies_to) VALUES
-- General criteria (applies to all)
('Job Knowledge', 'Understanding of job responsibilities and required skills', 'Performance', 1.00, NULL),
('Quality of Work', 'Accuracy, thoroughness, and reliability of work output', 'Performance', 1.00, NULL),
('Productivity', 'Volume of work accomplished within time constraints', 'Performance', 1.00, NULL),
('Communication', 'Effectiveness in verbal and written communication', 'Soft Skills', 0.80, NULL),
('Teamwork', 'Ability to work collaboratively with others', 'Soft Skills', 0.80, NULL),
('Initiative', 'Self-motivation and proactive approach to work', 'Attitude', 0.70, NULL),
('Attendance', 'Punctuality and reliability in attendance', 'Professionalism', 0.60, NULL),
('Adaptability', 'Flexibility in handling change and new situations', 'Soft Skills', 0.70, NULL),

-- Office-specific criteria
('Technical Skills', 'Proficiency in required software and tools', 'Technical', 0.90, 'office'),
('Project Management', 'Ability to plan, execute, and deliver projects', 'Technical', 0.80, 'office'),
('Documentation', 'Quality of reports and documentation', 'Technical', 0.70, 'office'),

-- Field-specific criteria
('Customer Relations', 'Interaction and relationship with customers on-site', 'Field Work', 1.00, 'field'),
('Safety Compliance', 'Adherence to safety protocols and procedures', 'Field Work', 1.00, 'field'),
('Field Problem Solving', 'Ability to resolve issues independently in the field', 'Field Work', 0.90, 'field'),
('Equipment Handling', 'Proper use and maintenance of field equipment', 'Field Work', 0.80, 'field');

-- Insert default appraisal period
INSERT INTO appraisal_periods (name, start_date, end_date, submission_deadline, review_deadline, is_active) VALUES
('Q1 2025 Appraisal', '2025-01-01', '2025-03-31', '2025-04-15', '2025-04-30', TRUE),
('Annual Review 2024', '2024-01-01', '2024-12-31', '2025-01-15', '2025-01-31', FALSE);

-- Insert default admin user (password: admin123)
-- Password hash is for 'admin123' using bcrypt
INSERT INTO users (email, password_hash, first_name, last_name, role, user_type, job_title, hire_date) VALUES
('admin@company.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VKPmYNf3zKQ8Iy', 'System', 'Admin', 'admin', 'office', 'System Administrator', '2020-01-01');

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appraisals_updated_at BEFORE UPDATE ON appraisals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for easy appraisal reports
CREATE OR REPLACE VIEW appraisal_summary AS
SELECT 
    a.id as appraisal_id,
    u.first_name || ' ' || u.last_name as employee_name,
    u.email as employee_email,
    u.user_type,
    d.name as department,
    m.first_name || ' ' || m.last_name as manager_name,
    p.name as period_name,
    a.status,
    a.self_rating,
    a.manager_rating,
    a.final_rating,
    a.submitted_at,
    a.reviewed_at
FROM appraisals a
JOIN users u ON a.employee_id = u.id
LEFT JOIN users m ON a.reviewer_id = m.id
LEFT JOIN departments d ON u.department_id = d.id
JOIN appraisal_periods p ON a.period_id = p.id;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

COMMENT ON TABLE users IS 'Stores all employee information including office and field workers';
COMMENT ON TABLE appraisals IS 'Main appraisal records for each employee per period';
COMMENT ON TABLE rating_criteria IS 'Configurable criteria for rating employees';
COMMENT ON COLUMN users.user_type IS 'office = Microsoft email, field = Gmail/Yahoo/other';
