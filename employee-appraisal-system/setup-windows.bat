@echo off
echo ============================================
echo Employee Appraisal System - Quick Start
echo ============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Step 1: Setting up Backend...
echo ============================================
cd backend

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment and install dependencies
call venv\Scripts\activate.bat
pip install -r requirements.txt

echo.
echo Step 2: Setting up Frontend...
echo ============================================
cd ..\frontend

REM Install npm dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing npm packages...
    npm install
)

echo.
echo ============================================
echo Setup Complete!
echo ============================================
echo.
echo IMPORTANT: Before running, make sure to:
echo 1. PostgreSQL is running
echo 2. Database 'employee_appraisal' exists
echo 3. Run the schema.sql file
echo 4. Create .env file in backend folder with your database password
echo.
echo To start the application:
echo 1. Open a terminal in the 'backend' folder and run: python app.py
echo 2. Open another terminal in the 'frontend' folder and run: npm start
echo.
echo Default admin login: admin@company.com / admin123
echo.
pause
