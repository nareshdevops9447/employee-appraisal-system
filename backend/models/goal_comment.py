"""GoalComment model — comments on goals with threading support."""
import uuid
from datetime import datetime, timezone
from extensions import db


class GoalComment(db.Model):
    __tablename__ = 'goal_comments'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    goal_id = db.Column(db.String(36), db.ForeignKey('goals.id', ondelete='CASCADE'), nullable=False, index=True)
    author_id = db.Column(db.String(36), nullable=False)
    content = db.Column(db.Text, nullable=False)
    comment_type = db.Column(db.String(20), default='update')
    reply_to_id = db.Column(db.String(36), db.ForeignKey('goal_comments.id', ondelete='CASCADE'), nullable=True)
    is_edited = db.Column(db.Boolean, default=False)
    is_deleted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    replies = db.relationship(
        'GoalComment',
        backref=db.backref('parent', remote_side=[id]),
        lazy='dynamic',
        cascade='all, delete-orphan',
    )
    reactions = db.relationship(
        'GoalCommentReaction',
        lazy='dynamic',
        cascade='all, delete-orphan',
    )

    def to_dict(self):
        from models.user_profile import UserProfile
        author = UserProfile.query.get(self.author_id)
        return {
            'id': self.id,
            'goal_id': self.goal_id,
            'author_id': self.author_id,
            'author_name': f'{author.first_name} {author.last_name}'.strip() if author else None,
            'author_email': author.email if author else None,
            'author_role': author.job_title if author else None,
            'content': self.content if not self.is_deleted else '[This comment has been deleted]',
            'comment_type': self.comment_type,
            'reply_to_id': self.reply_to_id,
            'is_edited': self.is_edited,
            'is_deleted': self.is_deleted,
            'reply_count': self.replies.filter_by(is_deleted=False).count() if not self.reply_to_id else 0,
            'reactions': self._get_reactions_summary(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def _get_reactions_summary(self):
        from models.goal_comment_reaction import GoalCommentReaction
        reactions = GoalCommentReaction.query.filter_by(comment_id=self.id).all()
        summary = {}
        for r in reactions:
            if r.emoji not in summary:
                summary[r.emoji] = {'count': 0, 'users': []}
            summary[r.emoji]['count'] += 1
            summary[r.emoji]['users'].append(r.user_id)
        return summary
