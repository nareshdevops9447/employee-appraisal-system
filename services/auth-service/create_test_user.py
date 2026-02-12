import sys
import os
sys.path.append(os.getcwd())

from app import create_app, db
from models.user import UserAuth
import bcrypt

app = create_app()
with app.app_context():
    email = "test@admin.com"
    password = "password123"
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    user = UserAuth.query.filter_by(email=email).first()
    if not user:
        # Create user
        user = UserAuth(email=email, password_hash=hashed, role='super_admin', is_active=True)
        db.session.add(user)
        db.session.commit()
        print(f"Created user {email}")
    else:
        # Update password just in case
        user.password_hash = hashed
        db.session.commit()
        print(f"Updated user {email}")
