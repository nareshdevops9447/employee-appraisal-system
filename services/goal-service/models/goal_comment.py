import uuid
from datetime import datetime, timezone
from extensions import db

class GoalComment(db.Model):
    __tablename__ = 'goal_comments'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    goal_id = db.Column(db.String(36), db.ForeignKey('goals.id'), nullable=False)
    
    author_id = db.Column(db.String(36), nullable=False)
    content = db.Column(db.Text, nullable=False)
    
    # enum: 'update', 'feedback', 'blocker', 'achievement'
    comment_type = db.Column(db.String(50), default='update')
    
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    def to_dict(self):
        return {
            'id': self.id,
            'goal_id': self.goal_id,
            'author_id': self.author_id,
            'content': self.content,
            'comment_type': self.comment_type,
            'created_at': self.created_at.isoformat(),
        }
