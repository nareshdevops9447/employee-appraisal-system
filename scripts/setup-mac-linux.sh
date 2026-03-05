#!/bin/bash

echo "============================================"
echo "Employee Appraisal System - Quick Start"
echo "============================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python3 is not installed"
    echo "Please install Python from https://www.python.org/downloads/"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "Step 1: Setting up Backend..."
echo "============================================"
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
source venv/bin/activate
pip install -r requirements.txt

echo ""
echo "Step 2: Setting up Frontend..."
echo "============================================"
cd ../frontend

# Install npm dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing npm packages..."
    npm install
fi

echo ""
echo "============================================"
echo "Setup Complete!"
echo "============================================"
echo ""
echo "IMPORTANT: Before running, make sure to:"
echo "1. PostgreSQL is running"
echo "2. Database 'employee_appraisal' exists"
echo "3. Run the schema.sql file"
echo "4. Create .env file in backend folder with your database password"
echo ""
echo "To start the application:"
echo "1. Open a terminal in the 'backend' folder and run: python app.py"
echo "2. Open another terminal in the 'frontend' folder and run: npm start"
echo ""
echo "Default admin login: admin@company.com / admin123"
echo ""
