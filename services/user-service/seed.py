import random
from datetime import datetime, timedelta, date
from app import create_app
from extensions import db
from models.department import Department
from models.user_profile import UserProfile
import uuid

# Configuration
DEPARTMENTS = [
    ('Fundraising', 'Responsible for donor relations and grants'),
    ('Finance', 'Manages budget, payroll, and accounting'),
    ('Programs', 'Delivers core charity services to beneficiaries'),
    ('HR', 'Human resources and volunteer management'),
    ('IT', 'Technology infrastructure and support'),
]

FIRST_NAMES = [
    'James', 'Amina', 'Oliver', 'Priya', 'Liam', 'Fatima', 'Noah', 'Sofia',
    'Ethan', 'Aisha', 'Lucas', 'Maya', 'Benjamin', 'Zara', 'Samuel', 'Leila',
    'Daniel', 'Nadia', 'Alexander', 'Rina', 'Matthew', 'Yuki', 'Nathan', 'Elena',
    'David', 'Chloe', 'Thomas', 'Hannah', 'Joseph', 'Grace', 'William', 'Isla',
    'Henry', 'Rosa', 'Jack', 'Keiko', 'Oscar', 'Mei', 'Leo', 'Anya',
]

LAST_NAMES = [
    'Okonkwo', 'Patel', 'Nakamura', 'Fernandez', 'Chen', 'Osei', 'Williams',
    'Kowalski', 'Ahmed', 'Martinez', 'Singh', 'Kim', 'Johansson', 'Owusu',
    'Thompson', 'Morales', 'Tanaka', 'Ali', 'Brown', 'Petrov', 'Garcia',
    'Nguyen', 'Weber', 'Hassan', 'Taylor', 'Santos', 'Ito', 'Mensah',
    'Robinson', 'Andersson', 'Khan', 'Lopez', 'Sato', 'Diallo', 'Clark',
]

JOB_TITLES = {
    'Fundraising': ['Grants Coordinator', 'Donor Relations Officer', 'Fundraising Assistant', 'Major Gifts Officer', 'Events Coordinator'],
    'Finance': ['Finance Officer', 'Accounts Assistant', 'Budget Analyst', 'Payroll Coordinator', 'Finance Assistant'],
    'Programs': ['Programme Coordinator', 'Field Officer', 'Community Liaison', 'Outreach Worker', 'Beneficiary Support Officer'],
    'HR': ['HR Officer', 'Recruitment Coordinator', 'Volunteer Coordinator', 'L&D Assistant', 'HR Assistant'],
    'IT': ['Systems Administrator', 'IT Support Analyst', 'Web Developer', 'Data Analyst', 'IT Helpdesk Officer'],
}

_used_names = set()


def _random_name():
    while True:
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        if (first, last) not in _used_names:
            _used_names.add((first, last))
            return first, last


def _random_start_date(years_back_min=0, years_back_max=10):
    days_min = years_back_min * 365
    days_max = years_back_max * 365
    delta = random.randint(days_min, days_max)
    return date.today() - timedelta(days=delta)


def _make_email(first_name, last_name):
    return f'{first_name.lower()}.{last_name.lower()}@charity.org'


def seed_data():
    app = create_app()
    with app.app_context():
        print("Seeding data...")

        # 1. Drop and recreate tables (raw SQL avoids circular FK drop issues)
        db.session.execute(db.text('DROP TABLE IF EXISTS user_profiles, departments CASCADE'))
        db.session.commit()
        db.create_all()
        print("Tables recreated.")

        # 2. Create Departments (head_id left NULL for now)
        dept_ids = {}  # dept_name -> id (plain strings, no ORM access needed later)
        for name, desc in DEPARTMENTS:
            dept_id = str(uuid.uuid4())
            dept = Department(
                id=dept_id,
                name=name,
                description=desc,
            )
            db.session.add(dept)
            dept_ids[name] = dept_id

        db.session.commit()
        print(f"Created {len(DEPARTMENTS)} departments.")

        # 3. Create CEO
        all_users = []
        ceo_first, ceo_last = 'Clara', 'Eaton'
        _used_names.add((ceo_first, ceo_last))
        ceo_id = str(uuid.uuid4())
        ceo = UserProfile(
            id=ceo_id,
            email=_make_email(ceo_first, ceo_last),
            first_name=ceo_first,
            last_name=ceo_last,
            job_title='Chief Executive Officer',
            employment_type='full_time',
            department_id=dept_ids['Programs'],
            manager_id=None,
            start_date=_random_start_date(8, 12),
            phone='+44 20 7946 0001',
            is_active=True,
        )
        db.session.add(ceo)
        db.session.commit()
        all_users.append(ceo_id)
        print("Created CEO.")

        # 4. Create Directors (report to CEO)
        director_ids = {}  # dept_name -> director_id (plain strings)
        for dept_name, dept_id in dept_ids.items():
            first, last = _random_name()
            d_id = str(uuid.uuid4())
            director = UserProfile(
                id=d_id,
                email=_make_email(first, last),
                first_name=first,
                last_name=last,
                job_title=f'Director of {dept_name}',
                department_id=dept_id,
                manager_id=ceo_id,
                employment_type='full_time',
                start_date=_random_start_date(5, 10),
                phone=f'+44 20 7946 {random.randint(1000, 9999)}',
                is_active=True,
            )
            db.session.add(director)
            director_ids[dept_name] = d_id
            all_users.append(d_id)

        db.session.commit()
        print(f"Created {len(director_ids)} directors.")

        # 5. Set department heads via raw SQL (avoids ORM autoflush entirely)
        for dept_name, d_id in director_ids.items():
            db.session.execute(
                db.text('UPDATE departments SET head_id = :head_id WHERE id = :dept_id'),
                {'head_id': d_id, 'dept_id': dept_ids[dept_name]}
            )

        db.session.commit()
        print("Set department heads.")

        # 6. Create Managers (report to Directors)
        manager_ids = {}  # dept_name -> [manager_id, ...]
        for dept_name, dept_id in dept_ids.items():
            manager_ids[dept_name] = []
            for _ in range(2):
                first, last = _random_name()
                m_id = str(uuid.uuid4())
                manager = UserProfile(
                    id=m_id,
                    email=_make_email(first, last),
                    first_name=first,
                    last_name=last,
                    job_title=f'{dept_name} Team Lead',
                    department_id=dept_id,
                    manager_id=director_ids[dept_name],
                    employment_type='full_time',
                    start_date=_random_start_date(3, 7),
                    phone=f'+44 20 7946 {random.randint(1000, 9999)}',
                    is_active=True,
                )
                db.session.add(manager)
                manager_ids[dept_name].append(m_id)
                all_users.append(m_id)

        db.session.commit()
        print(f"Created {sum(len(m) for m in manager_ids.values())} managers.")

        # 7. Create Employees (report to Managers)
        for dept_name, dept_id in dept_ids.items():
            dept_mgr_ids = manager_ids[dept_name]
            dept_titles = JOB_TITLES.get(dept_name, ['Associate'])

            for i in range(5):
                first, last = _random_name()
                e_id = str(uuid.uuid4())
                mgr_id = random.choice(dept_mgr_ids)
                emp_type = random.choice(['full_time', 'full_time', 'part_time', 'volunteer'])

                if emp_type == 'volunteer':
                    job_title = f'Volunteer - {dept_name}'
                else:
                    job_title = dept_titles[i % len(dept_titles)]

                user = UserProfile(
                    id=e_id,
                    email=_make_email(first, last),
                    first_name=first,
                    last_name=last,
                    job_title=job_title,
                    department_id=dept_id,
                    manager_id=mgr_id,
                    employment_type=emp_type,
                    start_date=_random_start_date(0, 5),
                    phone=f'+44 20 7946 {random.randint(1000, 9999)}' if random.random() > 0.3 else None,
                    is_active=True if random.random() > 0.05 else False,
                )
                db.session.add(user)
                all_users.append(e_id)

        db.session.commit()

        # Summary
        total = len(all_users)
        num_directors = len(director_ids)
        num_managers = sum(len(m) for m in manager_ids.values())
        num_employees = total - 1 - num_directors - num_managers
        print(f"\nSeeding complete: {total} users created.")
        print(f"  1 CEO, {num_directors} directors, {num_managers} managers, {num_employees} employees")


if __name__ == '__main__':
    seed_data()