"""
Notification service — creates and manages in-app notifications.
Migrated from goal-service/services/notification_service.py.
"""
from extensions import db
from models.notification import Notification


class NotificationService:
    @staticmethod
    def create_notification(recipient_id, event, goal_id=None, triggered_by=None,
                            resource_type=None, resource_id=None):
        if not recipient_id:
            return

        notification = Notification(

            recipient_id=recipient_id,
            event=event,
            goal_id=goal_id,
            triggered_by=triggered_by,
            resource_type=resource_type,
            resource_id=resource_id,
        )
        db.session.add(notification)
        # Caller handles commit (usually part of a larger transaction)

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
