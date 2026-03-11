import uuid
from datetime import datetime
from extensions import db

class Holiday(db.Model):
    """
    Company-wide or public holidays.
    """
    __tablename__ = 'holidays'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(200), nullable=False)
    date = db.Column(db.Date, unique=True, nullable=False)
    year = db.Column(db.Integer, index=True)
    is_optional = db.Column(db.Boolean, default=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'date': self.date.isoformat() if self.date else None,
            'year': self.year,
            'is_optional': self.is_optional,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
