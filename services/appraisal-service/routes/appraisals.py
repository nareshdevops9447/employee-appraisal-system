from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from extensions import db
from models.appraisal import Appraisal

appraisals_bp = Blueprint('appraisals', __name__)

@appraisals_bp.route('/', methods=['GET'])
def list_appraisals():
    user_id = request.headers.get('X-User-Id')
    user_role = request.headers.get('X-User-Role')
    
    scope = request.args.get('scope', 'mine') # 'mine', 'team', 'all' (HR)
    
    query = Appraisal.query

    if scope == 'mine':
        query = query.filter_by(employee_id=user_id)
    elif scope == 'team':
        # Manager sees appraisals where they are the manager
        query = query.filter_by(manager_id=user_id)
    elif scope == 'all':
        if user_role not in ['hr_admin', 'super_admin']:
            return jsonify({'error': 'Forbidden', 'message': 'HR access required'}), 403
        # No filter
    else:
        # Default to mine
        query = query.filter_by(employee_id=user_id)
        
    # Optional filters
    cycle_id = request.args.get('cycle_id')
    status = request.args.get('status')
    
    if cycle_id:
        query = query.filter_by(cycle_id=cycle_id)
    if status:
        query = query.filter_by(status=status)
        
    appraisals = query.all()
    return jsonify([a.to_dict() for a in appraisals])


@appraisals_bp.route('/<id>', methods=['GET'])
def get_appraisal(id):
    # Access control: user must be employee, manager, or HR
    user_id = request.headers.get('X-User-Id')
    user_role = request.headers.get('X-User-Role')
    
    appraisal = Appraisal.query.get_or_404(id)
    
    is_owner = (appraisal.employee_id == user_id)
    is_manager = (appraisal.manager_id == user_id)
    is_hr = (user_role in ['hr_admin', 'super_admin'])
    
    if not (is_owner or is_manager or is_hr):
        return jsonify({'error': 'Forbidden'}), 403
        
    return jsonify(appraisal.to_dict())


@appraisals_bp.route('/<id>/self-assessment', methods=['PUT'])
def submit_self_assessment(id):
    user_id = request.headers.get('X-User-Id')
    appraisal = Appraisal.query.get_or_404(id)
    
    if appraisal.employee_id != user_id:
        return jsonify({'error': 'Forbidden'}), 403
        
    if appraisal.status not in ['not_started', 'self_assessment']:
        return jsonify({'error': 'Invalid status for self-assessment'}), 400
        
    data = request.get_json()
    appraisal.self_assessment = data.get('answers') # Expecting JSON structure
    appraisal.status = 'self_assessment' # In progress
    
    if data.get('submit') is True:
        appraisal.status = 'manager_review'
        appraisal.self_assessment_submitted_at = datetime.now(timezone.utc)
        
    db.session.commit()
    return jsonify(appraisal.to_dict())


@appraisals_bp.route('/<id>/manager-review', methods=['PUT'])
def submit_manager_review(id):
    user_id = request.headers.get('X-User-Id')
    appraisal = Appraisal.query.get_or_404(id)
    
    if appraisal.manager_id != user_id:
        return jsonify({'error': 'Forbidden'}), 403
        
    # Manager can write anytime, but usually after self-assessment
    if appraisal.status in ['not_started', 'self_assessment', 'completed', 'closed']:
         # Warn but execute? Or strict workflow? 
         # Strict: Must be in 'manager_review'
         pass
         
    data = request.get_json()
    appraisal.manager_assessment = data.get('answers')
    appraisal.overall_rating = data.get('rating')
    
    if data.get('submit') is True:
        appraisal.status = 'meeting_scheduled' # Ready for meeting
        appraisal.manager_assessment_submitted_at = datetime.now(timezone.utc)
        
    db.session.commit()
    return jsonify(appraisal.to_dict())


@appraisals_bp.route('/<id>/meeting', methods=['PUT'])
def log_meeting(id):
    user_id = request.headers.get('X-User-Id')
    appraisal = Appraisal.query.get_or_404(id)
    
    if appraisal.manager_id != user_id:
         return jsonify({'error': 'Forbidden'}), 403
         
    data = request.get_json()
    appraisal.meeting_date = datetime.fromisoformat(data['date']) if data.get('date') else None
    appraisal.meeting_notes = data.get('notes')
    
    if data.get('complete') is True:
        appraisal.status = 'meeting_completed' # OR directly to acknowledged if sign-off needed
        
    db.session.commit()
    return jsonify(appraisal.to_dict())

@appraisals_bp.route('/<id>/acknowledge', methods=['PUT'])
def acknowledge(id):
    user_id = request.headers.get('X-User-Id')
    appraisal = Appraisal.query.get_or_404(id)
    
    if appraisal.employee_id != user_id:
        return jsonify({'error': 'Forbidden'}), 403
        
    data = request.get_json()
    appraisal.employee_acknowledgement = True
    appraisal.employee_acknowledgement_date = datetime.now(timezone.utc)
    appraisal.employee_comments = data.get('comments')
    appraisal.status = 'completed' # Final state
    
    db.session.commit()
    return jsonify(appraisal.to_dict())
