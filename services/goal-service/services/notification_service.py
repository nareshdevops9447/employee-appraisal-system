from extensions import db
from models.notification import Notification

class NotificationService:
    @staticmethod
    def create_notification(recipient_id, event, goal_id, triggered_by):
        notification = Notification(
            recipient_id=recipient_id,
            event=event,
            goal_id=goal_id,
            triggered_by=triggered_by
        )
        db.session.add(notification)
        # We don't commit here because it's usually part of a larger transaction
        # But if called standalone, caller must commit.
        # To be safe, let's assume caller handles commit (like ApprovalWorkflow)
        
    @staticmethod
    def get_notifications(user_id, unread_only=False):
        query = Notification.query.filter_by(recipient_id=user_id)
        if unread_only:
            query = query.filter_by(is_read=False)
        return query.order_by(Notification.created_at.desc()).all()

    @staticmethod
    def mark_read(notification_id):
        notification = Notification.query.get(notification_id)
        if notification:
            notification.is_read = True
            db.session.commit()
            return True
        return False
