"""
Database Reset and Demo Seeding Script
======================================
Wipes all tables in eas_db and seeds standard demo personas across all departments:
- Manager
- New Starter (Joined < 1 month)
- Probation (Joined 1-3 months)
- Recently Joined (Joined 3-6 months)
- Tenured (Joined > 2 years)
"""
import os
import sys
import bcrypt
from datetime import date, datetime, timezone
from dateutil.relativedelta import relativedelta

# Fix DATABASE_URL for local execution on Windows
if os.name == 'nt' and 'DATABASE_URL' in os.environ:
    os.environ['DATABASE_URL'] = os.environ['DATABASE_URL'].replace('@postgres:', '@localhost:')

# Add current directory to path so we can import app and models
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from extensions import db
from models.user_auth import UserAuth
from models.user_profile import UserProfile
from models.department import Department
from models.refresh_token import RefreshToken
from models.appraisal_cycle import AppraisalCycle
from models.appraisal_question import AppraisalQuestion
from models.appraisal import Appraisal
from models.attribute_template import AttributeTemplate
from models.employee_attribute import EmployeeAttribute

def seed():
    app = create_app('development')
    with app.app_context():
        print("--- Wiping existing data ---")
        db.drop_all()
        db.create_all()
        print("--- Tables recreated ---")

        # 1. Create Departments
        hr_dept = Department(name="HR", description="Human Resources")
        eng_dept = Department(name="Engineering", description="Product & Engineering")
        sales_dept = Department(name="Sales", description="Sales & Marketing")
        it_dept = Department(name="IT", description="Information Technology")
        fund_dept = Department(name="Fundraising", description="Fundraising & Partnerships")
        db.session.add_all([hr_dept, eng_dept, sales_dept, it_dept, fund_dept])
        db.session.flush()

        # 2. Prepare Passwords
        pwd_hash = bcrypt.hashpw("password".encode(), bcrypt.gensalt(10)).decode()

        # --- HR DEPARTMENT ---
        # HR Admin / Director
        alice_auth = UserAuth(
            id="3e7e8bfb-f19a-4e23-8427-955766e4b8ab",
            email="alice.smith@example.com",
            password_hash=pwd_hash,
            role="hr_admin"
        )
        alice_profile = UserProfile(
            id=alice_auth.id,
            email=alice_auth.email,
            first_name="Alice",
            last_name="Smith",
            job_title="HR Director",
            department_id=hr_dept.id,
            start_date=date(2024, 1, 1),
            employment_type="full_time"
        )
        db.session.add_all([alice_auth, alice_profile])
        hr_dept.head = alice_profile
        db.session.flush()

        # HR Manager
        henry_auth = UserAuth(id="user-hr-manager", email="henry.adams@example.com", password_hash=pwd_hash, role="manager")
        henry_profile = UserProfile(id=henry_auth.id, email=henry_auth.email, first_name="Henry", last_name="Adams", job_title="HR Manager", department_id=hr_dept.id, manager_id=alice_auth.id, start_date=date(2024, 1, 1), employment_type="full_time")
        db.session.add_all([henry_auth, henry_profile])

        # HR New Starter (< 1 month)
        ian_auth = UserAuth(id="user-hr-new", email="ian.bates@example.com", password_hash=pwd_hash, role="employee")
        ian_profile = UserProfile(id=ian_auth.id, email=ian_auth.email, first_name="Ian", last_name="Bates", job_title="HR Assistant", department_id=hr_dept.id, manager_id=henry_auth.id, start_date=date(2026, 2, 15), employment_type="full_time")
        db.session.add_all([ian_auth, ian_profile])

        # HR Probation (1-3 months)
        jane_auth = UserAuth(id="user-hr-probation", email="jane.clark@example.com", password_hash=pwd_hash, role="employee")
        jane_profile = UserProfile(id=jane_auth.id, email=jane_auth.email, first_name="Jane", last_name="Clark", job_title="Recruiter", department_id=hr_dept.id, manager_id=henry_auth.id, start_date=date(2026, 1, 10), employment_type="full_time")
        db.session.add_all([jane_auth, jane_profile])

        # HR Recently Joined (Out of probation, 3-6 months)
        karen_auth = UserAuth(id="user-hr-recent", email="karen.davis@example.com", password_hash=pwd_hash, role="employee")
        karen_profile = UserProfile(id=karen_auth.id, email=karen_auth.email, first_name="Karen", last_name="Davis", job_title="HR Specialist", department_id=hr_dept.id, manager_id=henry_auth.id, start_date=date(2025, 11, 1), employment_type="full_time")
        db.session.add_all([karen_auth, karen_profile])

        # HR 2 Years Old
        leo_auth = UserAuth(id="user-hr-tenured", email="leo.evans@example.com", password_hash=pwd_hash, role="employee")
        leo_profile = UserProfile(id=leo_auth.id, email=leo_auth.email, first_name="Leo", last_name="Evans", job_title="Senior HR Business Partner", department_id=hr_dept.id, manager_id=henry_auth.id, start_date=date(2024, 1, 15), employment_type="full_time")
        db.session.add_all([leo_auth, leo_profile])

        # --- ENGINEERING DEPARTMENT ---
        # Eng Manager
        bob_auth = UserAuth(id="bob-johnson-id-001", email="bob.johnson@example.com", password_hash=pwd_hash, role="manager")
        bob_profile = UserProfile(id=bob_auth.id, email=bob_auth.email, first_name="Bob", last_name="Johnson", job_title="Engineering Manager", department_id=eng_dept.id, manager_id=alice_auth.id, start_date=date(2025, 1, 1), employment_type="full_time")
        db.session.add_all([bob_auth, bob_profile])
        eng_dept.head = bob_profile

        # Eng New Starter
        mia_auth = UserAuth(id="user-eng-new", email="mia.foster@example.com", password_hash=pwd_hash, role="employee")
        mia_profile = UserProfile(id=mia_auth.id, email=mia_auth.email, first_name="Mia", last_name="Foster", job_title="Junior Developer", department_id=eng_dept.id, manager_id=bob_auth.id, start_date=date(2026, 2, 15), employment_type="full_time")
        db.session.add_all([mia_auth, mia_profile])

        # Eng Probation
        nathan_auth = UserAuth(id="user-eng-probation", email="nathan.gray@example.com", password_hash=pwd_hash, role="employee")
        nathan_profile = UserProfile(id=nathan_auth.id, email=nathan_auth.email, first_name="Nathan", last_name="Gray", job_title="Software Engineer", department_id=eng_dept.id, manager_id=bob_auth.id, start_date=date(2026, 1, 10), employment_type="full_time")
        db.session.add_all([nathan_auth, nathan_profile])

        # Eng Recently Joined
        olivia_auth = UserAuth(id="user-eng-recent", email="olivia.harris@example.com", password_hash=pwd_hash, role="employee")
        olivia_profile = UserProfile(id=olivia_auth.id, email=olivia_auth.email, first_name="Olivia", last_name="Harris", job_title="DevOps Engineer", department_id=eng_dept.id, manager_id=bob_auth.id, start_date=date(2025, 11, 1), employment_type="full_time")
        db.session.add_all([olivia_auth, olivia_profile])

        # Eng 2 Years Old
        frank_auth = UserAuth(id="92debc1c-91e8-45a8-b64d-5fbed2fd8355", email="frank.miller@example.com", password_hash=pwd_hash, role="employee")
        frank_profile = UserProfile(id=frank_auth.id, email=frank_auth.email, first_name="Frank", last_name="Miller", job_title="Senior Engineer", department_id=eng_dept.id, manager_id=bob_auth.id, start_date=date(2023, 9, 1), employment_type="full_time")
        db.session.add_all([frank_auth, frank_profile])

        # Eng Contractor
        grace_auth = UserAuth(id="f81d113c-cc35-42f2-ae9a-9e12bf28a9b3", email="grace.lee@example.com", password_hash=pwd_hash, role="employee")
        grace_profile = UserProfile(id=grace_auth.id, email=grace_auth.email, first_name="Grace", last_name="Lee", job_title="QA Tester", department_id=eng_dept.id, manager_id=bob_auth.id, start_date=date(2026, 1, 15), employment_type="contractor")
        db.session.add_all([grace_auth, grace_profile])

        # --- SALES DEPARTMENT ---
        # Sales Manager
        charlie_auth = UserAuth(id="63dc9b60-b70e-4be5-a451-f54d4477af85", email="charlie.brown@example.com", password_hash=pwd_hash, role="manager")
        charlie_profile = UserProfile(id=charlie_auth.id, email=charlie_auth.email, first_name="Charlie", last_name="Brown", job_title="Sales Manager", department_id=sales_dept.id, manager_id=alice_auth.id, start_date=date(2025, 6, 1), employment_type="full_time")
        db.session.add_all([charlie_auth, charlie_profile])
        sales_dept.head = charlie_profile

        # Sales New Starter
        david_auth = UserAuth(id="23d8b59a-5a0e-4fcf-9426-9c9b6a319dd1", email="david.wilson@example.com", password_hash=pwd_hash, role="employee")
        david_profile = UserProfile(id=david_auth.id, email=david_auth.email, first_name="David", last_name="Wilson", job_title="Account Executive", department_id=sales_dept.id, manager_id=charlie_auth.id, start_date=date(2026, 2, 15), employment_type="full_time")
        db.session.add_all([david_auth, david_profile])

        # Sales Probation
        pete_auth = UserAuth(id="user-sales-probation", email="pete.irwin@example.com", password_hash=pwd_hash, role="employee")
        pete_profile = UserProfile(id=pete_auth.id, email=pete_auth.email, first_name="Pete", last_name="Irwin", job_title="Sales Development Rep", department_id=sales_dept.id, manager_id=charlie_auth.id, start_date=date(2026, 1, 10), employment_type="full_time")
        db.session.add_all([pete_auth, pete_profile])

        # Sales Recently Joined
        eve_auth = UserAuth(id="3e5a7b82-628d-4f1b-b2cd-29dcbcf9a2d3", email="eve.davis@example.com", password_hash=pwd_hash, role="employee")
        eve_profile = UserProfile(id=eve_auth.id, email=eve_auth.email, first_name="Eve", last_name="Davis", job_title="Marketing Specialist", department_id=sales_dept.id, manager_id=charlie_auth.id, start_date=date(2025, 12, 1), employment_type="full_time")
        db.session.add_all([eve_auth, eve_profile])

        # Sales 2 Years Old
        quinn_auth = UserAuth(id="user-sales-tenured", email="quinn.jones@example.com", password_hash=pwd_hash, role="employee")
        quinn_profile = UserProfile(id=quinn_auth.id, email=quinn_auth.email, first_name="Quinn", last_name="Jones", job_title="Enterprise Account Executive", department_id=sales_dept.id, manager_id=charlie_auth.id, start_date=date(2024, 1, 15), employment_type="full_time")
        db.session.add_all([quinn_auth, quinn_profile])

        # --- IT DEPARTMENT ---
        # IT Manager
        it_mgr_auth = UserAuth(id="user-it-mgr", email="sam.king@example.com", password_hash=pwd_hash, role="manager")
        it_mgr_profile = UserProfile(id=it_mgr_auth.id, email=it_mgr_auth.email, first_name="Sam", last_name="King", job_title="IT Director", department_id=it_dept.id, manager_id=alice_auth.id, start_date=date(2024, 5, 1), employment_type="full_time")
        db.session.add_all([it_mgr_auth, it_mgr_profile])
        it_dept.head = it_mgr_profile

        # IT New Starter
        it_new_auth = UserAuth(id="user-it-new", email="tom.lane@example.com", password_hash=pwd_hash, role="employee")
        it_new_profile = UserProfile(id=it_new_auth.id, email=it_new_auth.email, first_name="Tom", last_name="Lane", job_title="Helpdesk Support", department_id=it_dept.id, manager_id=it_mgr_auth.id, start_date=date(2026, 2, 20), employment_type="full_time")
        db.session.add_all([it_new_auth, it_new_profile])

        # IT Probation
        it_prob_auth = UserAuth(id="user-it-prob", email="uma.murphy@example.com", password_hash=pwd_hash, role="employee")
        it_prob_profile = UserProfile(id=it_prob_auth.id, email=it_prob_auth.email, first_name="Uma", last_name="Murphy", job_title="Systems Admin", department_id=it_dept.id, manager_id=it_mgr_auth.id, start_date=date(2026, 1, 5), employment_type="full_time")
        db.session.add_all([it_prob_auth, it_prob_profile])

        # IT Recently Joined
        it_rec_auth = UserAuth(id="user-it-rec", email="victor.nelson@example.com", password_hash=pwd_hash, role="employee")
        it_rec_profile = UserProfile(id=it_rec_auth.id, email=it_rec_auth.email, first_name="Victor", last_name="Nelson", job_title="Network Engineer", department_id=it_dept.id, manager_id=it_mgr_auth.id, start_date=date(2025, 10, 15), employment_type="full_time")
        db.session.add_all([it_rec_auth, it_rec_profile])

        # IT 2 Years Old
        it_ten_auth = UserAuth(id="user-it-ten", email="will.owens@example.com", password_hash=pwd_hash, role="employee")
        it_ten_profile = UserProfile(id=it_ten_auth.id, email=it_ten_auth.email, first_name="Will", last_name="Owens", job_title="IT Infrastructure Lead", department_id=it_dept.id, manager_id=it_mgr_auth.id, start_date=date(2023, 6, 1), employment_type="full_time")
        db.session.add_all([it_ten_auth, it_ten_profile])

        # --- FUNDRAISING DEPARTMENT ---
        # Fund Manager
        fund_mgr_auth = UserAuth(id="user-fund-mgr", email="xena.perez@example.com", password_hash=pwd_hash, role="manager")
        fund_mgr_profile = UserProfile(id=fund_mgr_auth.id, email=fund_mgr_auth.email, first_name="Xena", last_name="Perez", job_title="Head of Fundraising", department_id=fund_dept.id, manager_id=alice_auth.id, start_date=date(2024, 3, 1), employment_type="full_time")
        db.session.add_all([fund_mgr_auth, fund_mgr_profile])
        fund_dept.head = fund_mgr_profile

        # Fund New Starter
        fund_new_auth = UserAuth(id="user-fund-new", email="yara.quinn@example.com", password_hash=pwd_hash, role="employee")
        fund_new_profile = UserProfile(id=fund_new_auth.id, email=fund_new_auth.email, first_name="Yara", last_name="Quinn", job_title="Donor Relations Assistant", department_id=fund_dept.id, manager_id=fund_mgr_auth.id, start_date=date(2026, 2, 22), employment_type="full_time")
        db.session.add_all([fund_new_auth, fund_new_profile])

        # Fund Probation
        fund_prob_auth = UserAuth(id="user-fund-prob", email="zack.ross@example.com", password_hash=pwd_hash, role="employee")
        fund_prob_profile = UserProfile(id=fund_prob_auth.id, email=fund_prob_auth.email, first_name="Zack", last_name="Ross", job_title="Events Coordinator", department_id=fund_dept.id, manager_id=fund_mgr_auth.id, start_date=date(2026, 1, 8), employment_type="full_time")
        db.session.add_all([fund_prob_auth, fund_prob_profile])

        # Fund Recently Joined
        fund_rec_auth = UserAuth(id="user-fund-rec", email="amy.scott@example.com", password_hash=pwd_hash, role="employee")
        fund_rec_profile = UserProfile(id=fund_rec_auth.id, email=fund_rec_auth.email, first_name="Amy", last_name="Scott", job_title="Corporate Partnerships Officer", department_id=fund_dept.id, manager_id=fund_mgr_auth.id, start_date=date(2025, 11, 20), employment_type="full_time")
        db.session.add_all([fund_rec_auth, fund_rec_profile])

        # Fund 2 Years Old
        fund_ten_auth = UserAuth(id="user-fund-ten", email="ben.taylor@example.com", password_hash=pwd_hash, role="employee")
        fund_ten_profile = UserProfile(id=fund_ten_auth.id, email=fund_ten_auth.email, first_name="Ben", last_name="Taylor", job_title="Major Gifts Manager", department_id=fund_dept.id, manager_id=fund_mgr_auth.id, start_date=date(2023, 8, 1), employment_type="full_time")
        db.session.add_all([fund_ten_auth, fund_ten_profile])

        db.session.commit()

        # 7. Seed Attribute Templates (if HR creates cycles later, run seed_standard_attributes again)
        seed_standard_attributes(alice_auth.id)

        print("--- Demo data seeded successfully! ---")
        print("Personas ready (Password for all users is: password):")
        print("\n[HR Department]")
        print("  - Alice Smith (Admin/Director): alice.smith@example.com")
        print("  - Henry Adams (Manager):        henry.adams@example.com")
        print("  - Ian Bates (New Starter):      ian.bates@example.com")
        print("  - Jane Clark (Probation):       jane.clark@example.com")
        print("  - Karen Davis (Recently Join):  karen.davis@example.com")
        print("  - Leo Evans (Tenured/2 Years+): leo.evans@example.com")
        
        print("\n[Engineering Department]")
        print("  - Bob Johnson (Manager):        bob.johnson@example.com")
        print("  - Mia Foster (New Starter):     mia.foster@example.com")
        print("  - Nathan Gray (Probation):      nathan.gray@example.com")
        print("  - Olivia Harris (Recent Join):  olivia.harris@example.com")
        print("  - Frank Miller (Tenured):       frank.miller@example.com")
        print("  - Grace Lee (Contractor):       grace.lee@example.com")

        print("\n[Sales Department]")
        print("  - Charlie Brown (Manager):      charlie.brown@example.com")
        print("  - David Wilson (New Starter):   david.wilson@example.com")
        print("  - Pete Irwin (Probation):       pete.irwin@example.com")
        print("  - Eve Davis (Recently Join):    eve.davis@example.com")
        print("  - Quinn Jones (Tenured):        quinn.jones@example.com")

        print("\n[IT Department]")
        print("  - Sam King (Manager):           sam.king@example.com")
        print("  - Tom Lane (New Starter):       tom.lane@example.com")
        print("  - Uma Murphy (Probation):       uma.murphy@example.com")
        print("  - Victor Nelson (Recently Join):victor.nelson@example.com")
        print("  - Will Owens (Tenured):         will.owens@example.com")

        print("\n[Fundraising Department]")
        print("  - Xena Perez (Manager):         xena.perez@example.com")
        print("  - Yara Quinn (New Starter):     yara.quinn@example.com")
        print("  - Zack Ross (Probation):        zack.ross@example.com")
        print("  - Amy Scott (Recently Join):    amy.scott@example.com")
        print("  - Ben Taylor (Tenured):         ben.taylor@example.com\n")

def seed_standard_attributes(admin_id):
    """Seed standard MSF behavioral attributes for all existing cycles."""
    cycles = AppraisalCycle.query.all()
    attributes = [
        ("Commitment to MSF Principles", "Upholds humanitarian charter and values in all work."),
        ("Teamwork & Collaboration", "Works effectively across departments and with field teams."),
        ("Accountability & Integrity", "Takes responsibility for actions and acts with honesty."),
        ("Adaptability", "Remains effective in changing environments and roles."),
        ("Communication & Respect", "Listens actively and speaks with kindness and clarity.")
    ]
    
    for cycle in cycles:
        for i, (title, desc) in enumerate(attributes):
            # Check if already exists
            existing = AttributeTemplate.query.filter_by(cycle_id=cycle.id, title=title).first()
            if not existing:
                tmpl = AttributeTemplate(
                    cycle_id=cycle.id,
                    title=title,
                    description=desc,
                    display_order=i,
                    created_by=admin_id
                )
                db.session.add(tmpl)
    db.session.commit()
    print(f"--- Seeded {len(attributes)} standard attributes for {len(cycles)} cycles ---")

if __name__ == "__main__":
    seed()
