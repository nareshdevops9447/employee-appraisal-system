"""GoalCommentReaction model — emoji reactions on goal comments."""
import uuid
from datetime import datetime, timezone
from extensions import db


class GoalCommentReaction(db.Model):
    __tablename__ = 'goal_comment_reactions'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    comment_id = db.Column(
        db.String(36),
        db.ForeignKey('goal_comments.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    user_id = db.Column(db.String(36), nullable=False)
    emoji = db.Column(db.String(10), nullable=False)  # e.g. "👍", "❤️", "🎉"
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.UniqueConstraint('comment_id', 'user_id', 'emoji', name='uq_comment_user_emoji'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'comment_id': self.comment_id,
            'user_id': self.user_id,
            'emoji': self.emoji,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
