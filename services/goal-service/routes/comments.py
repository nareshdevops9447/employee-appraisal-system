from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from extensions import db
from models.goal import Goal
from models.goal_comment import GoalComment
from utils.rbac import require_auth

comments_bp = Blueprint('comments', __name__)


@comments_bp.route('/<goal_id>/comments', methods=['POST'])
@require_auth
def add_comment(goal_id):
    """Add a comment to a goal. Any authenticated user involved can comment."""
    user_id = request.headers.get('X-User-Id')
    goal = Goal.query.get_or_404(goal_id)
    data = request.get_json()

    if not data or not data.get('content'):
        return jsonify({'error': 'Comment content is required'}), 400

    comment = GoalComment(
        goal_id=goal.id,
        author_id=user_id,
        content=data['content'],
        comment_type=data.get('comment_type', 'update'),
    )
    db.session.add(comment)
    db.session.commit()

    return jsonify(comment.to_dict()), 201


@comments_bp.route('/<goal_id>/comments', methods=['GET'])
@require_auth
def list_comments(goal_id):
    """List comments on a goal."""
    comments = GoalComment.query.filter_by(goal_id=goal_id) \
        .order_by(GoalComment.created_at.asc()).all()
    return jsonify([c.to_dict() for c in comments])