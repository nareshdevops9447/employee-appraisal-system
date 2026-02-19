from flask import Blueprint, request, jsonify
from extensions import db
from models.notification import Notification

notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('', methods=['POST'])
def create_notification():
    """
    Internal endpoint: other services call this to create notifications.
    Used by appraisal-service when activating a cycle.
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    required = ['recipient_id', 'event', 'triggered_by']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'Missing required field: {field}'}), 400

    notification = Notification(
        recipient_id=data['recipient_id'],
        event=data['event'],
        triggered_by=data['triggered_by'],
        goal_id=data.get('goal_id'),
        resource_type=data.get('resource_type'),
        resource_id=data.get('resource_id'),
    )

    db.session.add(notification)
    db.session.commit()

    return jsonify(notification.to_dict()), 201


@notifications_bp.route('', methods=['GET'])
def get_notifications():
    """
    Get notifications for the current user.
    Reads user ID from X-User-Id header (set by API Gateway).
    Query params: ?unread_only=true&limit=20
    """
    user_id = request.headers.get('X-User-Id')
    if not user_id:
        return jsonify({'error': 'Missing X-User-Id header'}), 401

    unread_only = request.args.get('unread_only', 'false').lower() == 'true'
    limit = request.args.get('limit', 50, type=int)

    query = Notification.query.filter_by(recipient_id=user_id)

    if unread_only:
        query = query.filter_by(is_read=False)

    notifications = (
        query
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )

    unread_count = Notification.query.filter_by(
        recipient_id=user_id,
        is_read=False
    ).count()

    return jsonify({
        'notifications': [n.to_dict() for n in notifications],
        'unread_count': unread_count,
    })


@notifications_bp.route('/<notification_id>/read', methods=['PATCH'])
def mark_read(notification_id):
    """Mark a single notification as read."""
    user_id = request.headers.get('X-User-Id')
    if not user_id:
        return jsonify({'error': 'Missing X-User-Id header'}), 401

    notification = Notification.query.get_or_404(notification_id)

    # Ensure user can only mark their own notifications
    if notification.recipient_id != user_id:
        return jsonify({'error': 'Forbidden'}), 403

    notification.is_read = True
    db.session.commit()

    return jsonify(notification.to_dict())


@notifications_bp.route('/read-all', methods=['PATCH'])
def mark_all_read():
    """Mark all notifications as read for the current user."""
    user_id = request.headers.get('X-User-Id')
    if not user_id:
        return jsonify({'error': 'Missing X-User-Id header'}), 401

    updated = (
        Notification.query
        .filter_by(recipient_id=user_id, is_read=False)
        .update({'is_read': True})
    )
    db.session.commit()

    return jsonify({'message': f'Marked {updated} notifications as read'})