from flask import Blueprint, jsonify, request
from extensions import db
from models.goal import Goal
from sqlalchemy import func

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/stats/me', methods=['GET'])
def my_stats():
    user_id = request.headers.get('X-User-Id')
    
    # Total goals
    total = Goal.query.filter_by(employee_id=user_id).count()
    completed = Goal.query.filter_by(employee_id=user_id, status='completed').count()
    
    # By Status
    by_status = db.session.query(Goal.status, func.count(Goal.id))\
        .filter(Goal.employee_id == user_id)\
        .group_by(Goal.status).all()
        
    return jsonify({
        'total': total,
        'completed': completed,
        'by_status': {s: c for s, c in by_status}
    })
