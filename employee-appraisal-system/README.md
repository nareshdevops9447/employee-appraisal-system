# Employee Appraisal System

A complete full-stack application for managing employee performance appraisals.

## 🎯 Features

- **Two Types of Users:**
  - **Office Employees**: Login with Microsoft work email (@company.com, @outlook.com, @hotmail.com)
  - **Field Employees**: Login with personal email (Gmail, Yahoo, etc.)

- **For Employees:**
  - Submit self-appraisals
  - View past appraisals
  - Track appraisal status

- **For Managers:**
  - Review team member appraisals
  - Provide ratings and feedback
  - Track team performance

- **For Admin:**
  - Manage users and departments
  - Generate reports
  - Configure appraisal periods

---

## 📁 Project Structure

```
employee-appraisal-system/
├── backend/                 # Python Flask API
│   ├── app.py              # Main application
│   ├── models.py           # Database models
│   ├── routes/             # API endpoints
│   └── requirements.txt    # Python dependencies
├── frontend/               # React Application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React context (state management)
│   │   ├── services/       # API calls
│   │   └── styles/         # CSS files
│   └── package.json        # Node dependencies
└── database/
    └── schema.sql          # PostgreSQL database setup
```

---

## 🚀 Step-by-Step Setup Guide (For Beginners)

### Step 1: Install Required Software

#### Install PostgreSQL (Database)
1. Go to: https://www.postgresql.org/download/
2. Download for your operating system
3. Run installer, remember the password you set!

#### Install Python
1. Go to: https://www.python.org/downloads/
2. Download Python 3.10 or newer
3. **IMPORTANT**: Check "Add Python to PATH" during installation

#### Install Node.js
1. Go to: https://nodejs.org/
2. Download the LTS version
3. Run installer with default settings

---

### Step 2: Setup Database

1. Open Terminal (Mac/Linux) or Command Prompt (Windows)
2. Connect to PostgreSQL:
   ```bash
   CREATE DATABASE employee_appraisal
   ```
3. Enter your PostgreSQL password
4. Create the database:
   ```sql
   CREATE DATABASE employee_appraisal;
   \q
   ```
5. Run the schema file:
   ```bash
   psql -U postgres -d employee_appraisal -f database/schema.sql
   ```

---

### Step 3: Setup Backend (Python)

1. Open a new terminal
2. Navigate to backend folder:
   ```bash
   cd employee-appraisal-system/backend
   ```
3. Create virtual environment:
   ```bash
   python -m venv venv
   ```
4. Activate it:
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
5. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
6. Create `.env` file with your database password:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost/employee_appraisal
   SECRET_KEY=your-secret-key-here
   ```
7. Run the server:
   ```bash
   python app.py
   ```
   Server will run on: http://localhost:5000

---

### Step 4: Setup Frontend (React)

1. Open a NEW terminal (keep backend running)
2. Navigate to frontend folder:
   ```bash
   cd employee-appraisal-system/frontend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the application:
   ```bash
   npm start
   ```
   App will open in browser at: http://localhost:3000

---

## 👤 Default Admin Login

After setup, login with:
- **Email**: admin@company.com
- **Password**: admin123

⚠️ **IMPORTANT**: Change this password immediately after first login!

---

## 📱 How to Use

### As an Employee:
1. Login with your email
2. Click "New Appraisal" to submit self-assessment
3. Rate yourself on various criteria
4. Add comments and achievements
5. Submit for manager review

### As a Manager:
1. Login with your email
2. View "Pending Reviews" in dashboard
3. Click on an employee to review their appraisal
4. Provide ratings and feedback
5. Approve or request revisions

### As an Admin:
1. Login with admin credentials
2. Manage users, departments, and appraisal periods
3. Generate reports

---

## 🔐 Email Login Rules

| Email Type | User Category | Example |
|------------|--------------|---------|
| Microsoft Work | Office Employee | john@company.com |
| Outlook/Hotmail | Office Employee | jane@outlook.com |
| Gmail | Field Employee | mike@gmail.com |
| Yahoo | Field Employee | sarah@yahoo.com |
| Other | Field Employee | bob@aol.com |

---

## ❓ Troubleshooting

### "Cannot connect to database"
- Make sure PostgreSQL is running
- Check your password in the `.env` file
- Verify database name is correct

### "npm command not found"
- Reinstall Node.js
- Restart your terminal

### "python command not found"
- Reinstall Python with "Add to PATH" checked
- Try using `python3` instead of `python`

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Look at the terminal for error messages
3. Search the error message online

---

Made with ❤️ for simple employee management
