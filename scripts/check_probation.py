import os
import sys

# add backend path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from flask import Flask
from backend.models.user import UserProfile
from backend.config import Config
from backend.extensions import db
import logging

app = Flask(__name__)
# Just use a simple sqlite connection for testing if needed, or the proper config string
app.config['SQLALCHEMY_DATABASE_URI'] = Config.SQLALCHEMY_DATABASE_URI
db.init_app(app)

with app.app_context():
    users = UserProfile.query.filter_by(first_name='Tom').all()
    if not users:
        print("No user named Tom found.")
    for user in users:
        print(f"User: {user.name}, Email: {user.email}, Joined: {user.joined_at}, Start: {user.start_date}, Probation End: {user.probation_end_date}, Status: {user.probation_status}")
