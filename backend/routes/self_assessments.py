"""
Self Assessment routes — for employees to evaluate their goals.
"""
from flask import Blueprint, request, jsonify, g
from extensions import db
from models.self_assessment import SelfAssessment
from models.appraisal import Appraisal
from models.goal import Goal
from services.notification_service import NotificationService
from utils.decorators import require_auth

self_assessments_bp = Blueprint('self_assessments', __name__)

@self_assessments_bp.route('/appraisal/<appraisal_id>', methods=['GET'])
@require_auth
def get_appraisal_self_assessments(appraisal_id):
    """Get all self assessments for a given appraisal."""
    ctx = g.current_user
    
    # Verify access to appraisal
    appraisal = Appraisal.query.get_or_404(appraisal_id)
    is_employee = appraisal.employee_id == ctx['user_id']
    is_manager = appraisal.manager_id == ctx['user_id']
    is_hr = ctx['role'] in ('hr_admin', 'super_admin')
    
    if not (is_employee or is_manager or is_hr):
        return jsonify({'error': 'Forbidden access to this appraisal'}), 403

    assessments = SelfAssessment.query.filter_by(appraisal_id=appraisal_id).all()
    return jsonify([a.to_dict() for a in assessments])

@self_assessments_bp.route('/', methods=['POST'])
@require_auth
def upsert_self_assessment():
    """Submit or update a self assessment for a specific goal."""
    data = request.get_json()
    ctx = g.current_user
    
    required = ['appraisal_id', 'goal_id']
    if not all(k in data for k in required):
        return jsonify({'error': 'Missing required fields: appraisal_id and goal_id'}), 400

    appraisal = Appraisal.query.get_or_404(data['appraisal_id'])
    
    # Only the employee themselves can submit a self-assessment
    if appraisal.employee_id != ctx['user_id']:
         return jsonify({'error': 'Only the employee can submit their self-assessment'}), 403
         
    # Check that appraisal is in a valid state
    if appraisal.status not in ['goals_approved', 'self_assessment_in_progress', 'manager_review']:
        return jsonify({'error': f'Cannot submit self-assessment in current appraisal state: {appraisal.status}'}), 400

    assessment = SelfAssessment.query.filter_by(
        appraisal_id=data['appraisal_id'],
        goal_id=data['goal_id']
    ).first()

    if not assessment:
        assessment = SelfAssessment(
            appraisal_id=data['appraisal_id'],
            goal_id=data['goal_id']
        )
        db.session.add(assessment)

    if 'employee_comment' in data:
        assessment.employee_comment = data['employee_comment']
    
    if 'employee_rating' in data:
        assessment.employee_rating = data['employee_rating']

    db.session.commit()
    
    # Automatically move status to self_assessment_in_progress if not already past that
    if appraisal.status == 'goals_approved':
        appraisal.status = 'self_assessment_in_progress'
        db.session.commit()
        
    return jsonify(assessment.to_dict()), 200

@self_assessments_bp.route('/appraisal/<appraisal_id>/submit', methods=['POST'])
@require_auth
def final_submit_self_assessment(appraisal_id):
    """Lock in the self-assessment and advance appraisal to manager review."""
    ctx = g.current_user
    appraisal = Appraisal.query.get_or_404(appraisal_id)
    
    if appraisal.employee_id != ctx['user_id']:
         return jsonify({'error': 'Only the employee can submit their self-assessment'}), 403
         
    if appraisal.status not in ['goals_approved', 'self_assessment_in_progress']:
         return jsonify({'error': 'Self-assessment cannot be submitted right now'}), 400

    # Ensure all performance goals have assessments
    goals = Goal.query.filter_by(employee_id=appraisal.employee_id, appraisal_cycle_id=appraisal.cycle_id, goal_type='performance').all()
    assessments = SelfAssessment.query.filter_by(appraisal_id=appraisal_id).all()

    assessed_goal_ids = {a.goal_id for a in assessments if a.employee_comment and a.employee_rating is not None}

    # Verify all performance goals are assessed
    missing = [g.id for g in goals if g.id not in assessed_goal_ids]
    if missing:
        return jsonify({'error': 'All performance goals must be assessed completely', 'missing_goal_ids': missing}), 400

    # Verify all behavioral attributes have self-ratings
    from models.attribute_template import AttributeTemplate
    from models.employee_attribute import EmployeeAttribute
    cycle_attributes = AttributeTemplate.query.filter_by(cycle_id=appraisal.cycle_id, is_active=True).all()
    if cycle_attributes:
        employee_attr_ratings = EmployeeAttribute.query.filter_by(
            employee_id=appraisal.employee_id,
            cycle_id=appraisal.cycle_id
        ).all()
        rated_attr_ids = {r.attribute_template_id for r in employee_attr_ratings if r.self_rating is not None and r.self_comment}
        missing_attrs = [a.id for a in cycle_attributes if a.id not in rated_attr_ids]
        if missing_attrs:
            return jsonify({'error': 'All behavioral attributes must have a self-rating and comment before submission.'}), 400

    appraisal.status = 'manager_review'
    
    NotificationService.create_notification(
        recipient_id=appraisal.manager_id,
        event='self_assessment_submitted',
        triggered_by=appraisal.employee_id,
        resource_type='appraisal',
        resource_id=appraisal.id
    )
    
    db.session.commit()
    
    return jsonify({'message': 'Self-assessment submitted successfully', 'appraisal': appraisal.to_dict()})
