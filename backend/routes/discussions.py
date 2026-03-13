from flask import Blueprint, request, jsonify, g
from extensions import db
from models.discussion import Discussion
from models.user_profile import UserProfile
from utils.decorators import require_auth
from datetime import datetime

discussions_bp = Blueprint('discussions', __name__)

@discussions_bp.route('/<employee_id>', methods=['GET'])
@require_auth
def get_discussions(employee_id):
    """Get all discussions for a specific employee."""
    try:
        current_user = g.current_user
        # Build query
        query = Discussion.query.filter_by(employee_id=employee_id)
        
        # If the requester is the employee
        if current_user['user_id'] == employee_id:
            # Employee can only see public notes
            query = query.filter_by(is_private=False)
            
        # If the requester is a manager
        elif current_user['role'] in ['manager', 'hr_admin', 'super_admin']:
            # Managers can see all public notes for this employee, 
            # PLUS any private notes where THEY are the manager.
            # (A manager shouldn't see another manager's private notes)
            from sqlalchemy import or_, and_
            query = query.filter(
                or_(
                    Discussion.is_private == False,
                    and_(Discussion.is_private == True, Discussion.manager_id == current_user['user_id'])
                )
            )
        else:
             return jsonify({'error': 'Unauthorized to view these discussions'}), 403

        # Order by meeting date descending
        discussions = query.order_by(Discussion.meeting_date.desc(), Discussion.created_at.desc()).all()
        
        return jsonify([d.to_dict() for d in discussions]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@discussions_bp.route('', methods=['POST'])
@require_auth
def create_discussion():
    """Create a new discussion note."""
    try:
        current_user = g.current_user
        if current_user['role'] not in ['manager', 'super_admin', 'hr_admin']:
            return jsonify({'error': 'Unauthorized to create discussions'}), 403
            
        data = request.json
        employee_id = data.get('employee_id')
        content = data.get('content')
        meeting_date_str = data.get('meeting_date')
        
        if not all([employee_id, content, meeting_date_str]):
            return jsonify({'error': 'Missing required fields'}), 400
            
        # Optional: verify current_user is actually the manager of this employee 
        # (skipping strict strict hierarchy check for simplicity and admin override)
        
        meeting_date = datetime.strptime(meeting_date_str, '%Y-%m-%d').date()
            
        new_discussion = Discussion(
            employee_id=employee_id,
            manager_id=current_user['user_id'],
            content=content,
            is_private=data.get('is_private', False),
            meeting_date=meeting_date
        )
        
        db.session.add(new_discussion)
        db.session.commit()
        
        return jsonify({'message': 'Discussion created successfully', 'discussion': new_discussion.to_dict()}), 201
        
    except ValueError:
         return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@discussions_bp.route('/<discussion_id>', methods=['PUT'])
@require_auth
def update_discussion(discussion_id):
    """Update an existing discussion."""
    try:
        current_user = g.current_user
        discussion = Discussion.query.get(discussion_id)
        if not discussion:
            return jsonify({'error': 'Discussion not found'}), 404
            
        # Only the author (manager) can edit it
        if discussion.manager_id != current_user['user_id'] and current_user['role'] not in ['super_admin']:
            return jsonify({'error': 'Unauthorized to edit this discussion'}), 403
            
        data = request.json
        
        if 'content' in data:
            discussion.content = data['content']
            
        if 'is_private' in data:
            discussion.is_private = data['is_private']
            
        if 'meeting_date' in data:
            try:
                discussion.meeting_date = datetime.strptime(data['meeting_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
                
        db.session.commit()
        
        return jsonify({'message': 'Discussion updated successfully', 'discussion': discussion.to_dict()}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@discussions_bp.route('/<discussion_id>', methods=['DELETE'])
@require_auth
def delete_discussion(discussion_id):
    """Delete a discussion."""
    try:
        current_user = g.current_user
        discussion = Discussion.query.get(discussion_id)
        if not discussion:
            return jsonify({'error': 'Discussion not found'}), 404
            
        # Only the author (manager) can delete it
        if discussion.manager_id != current_user['user_id'] and current_user['role'] not in ['super_admin']:
            return jsonify({'error': 'Unauthorized to delete this discussion'}), 403
            
        db.session.delete(discussion)
        db.session.commit()
        
        return jsonify({'message': 'Discussion deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
