from flask import Blueprint, request, jsonify, g, current_app
from extensions import db
from models.manager_review import ManagerReview
from models.appraisal import Appraisal
from models.appraisal_review import AppraisalReview
from utils.decorators import require_auth, require_role
from datetime import datetime, timezone

manager_reviews_bp = Blueprint('manager_reviews', __name__)


@manager_reviews_bp.route('/appraisal/<appraisal_id>', methods=['GET'])
@require_auth
def get_appraisal_manager_reviews(appraisal_id):
    """
    Get all individual manager goal reviews and the overall appraisal review for a specific appraisal.
    """
    appraisal = Appraisal.query.get_or_404(appraisal_id)
    ctx = g.current_user

    # Permission check: employee, manager, or HR
    is_owner = appraisal.employee_id == ctx['user_id']
    is_manager = appraisal.manager_id == ctx['user_id']
    is_hr = ctx['role'] in ('hr_admin', 'super_admin')

    if not (is_owner or is_manager or is_hr):
        return jsonify({'error': 'Forbidden access to these manager reviews'}), 403

    goal_reviews = ManagerReview.query.filter_by(appraisal_id=appraisal_id).all()
    overall_review = AppraisalReview.query.filter_by(appraisal_id=appraisal_id).first()

    return jsonify({
        'goal_reviews': [r.to_dict() for r in goal_reviews],
        'overall_review': overall_review.to_dict() if overall_review else None
    })


@manager_reviews_bp.route('/goal', methods=['POST'])
@require_auth
def upsert_manager_goal_review():
    """
    Creates or updates a manager's review (rating and comment) for a specific goal.
    This acts as a draft save.
    """
    ctx = g.current_user
    data = request.get_json()

    required = ['appraisal_id', 'goal_id']
    if not all(k in data for k in required):
        return jsonify({'error': 'Missing appraisal_id or goal_id required fields'}), 400

    appraisal = Appraisal.query.get_or_404(data['appraisal_id'])

    # Only manager can do this
    if appraisal.manager_id != ctx['user_id']:
        return jsonify({'error': 'Only the assigned manager can review these goals'}), 403

    if appraisal.status != 'manager_review':
        return jsonify({'error': f'Cannot save manager review while appraisal is in {appraisal.status} status'}), 400

    review = ManagerReview.query.filter_by(
        appraisal_id=data['appraisal_id'],
        goal_id=data['goal_id']
    ).first()

    if not review:
        review = ManagerReview(
            appraisal_id=data['appraisal_id'],
            goal_id=data['goal_id']
        )
        db.session.add(review)

    if 'manager_rating' in data:
        rating = data['manager_rating']
        if rating is not None and (float(rating) < 1 or float(rating) > 5):
            return jsonify({'error': 'Rating must be between 1 and 5'}), 400
        review.manager_rating = rating

    if 'manager_comment' in data:
        review.manager_comment = data['manager_comment']

    db.session.commit()
    return jsonify(review.to_dict()), 200


@manager_reviews_bp.route('/overall', methods=['POST'])
@require_auth
def upsert_overall_appraisal_review():
    """
    Creates or updates the manager's overall review for an appraisal.
    This acts as a draft save.
    """
    ctx = g.current_user
    data = request.get_json()

    if not data or not data.get('appraisal_id'):
        return jsonify({'error': 'Missing appraisal_id field'}), 400

    appraisal = Appraisal.query.get_or_404(data['appraisal_id'])

    # Only manager can do this
    if appraisal.manager_id != ctx['user_id']:
        return jsonify({'error': 'Only the assigned manager can review this appraisal'}), 403

    if appraisal.status != 'manager_review':
        return jsonify({'error': f'Cannot save manager review while appraisal is in {appraisal.status} status'}), 400

    review = AppraisalReview.query.filter_by(appraisal_id=data['appraisal_id']).first()

    if not review:
        review = AppraisalReview(appraisal_id=data['appraisal_id'])
        db.session.add(review)

    if 'overall_rating' in data:
        rating = data['overall_rating']
        if rating is not None and (float(rating) < 1 or float(rating) > 5):
             return jsonify({'error': 'Rating must be between 1 and 5'}), 400
        review.overall_rating = rating
        
    if 'overall_comment' in data:
        review.overall_comment = data['overall_comment']
        
    if 'strengths' in data:
        review.strengths = data['strengths']
        
    if 'development_areas' in data:
        review.development_areas = data['development_areas']

    db.session.commit()
    return jsonify(review.to_dict()), 200


@manager_reviews_bp.route('/appraisal/<appraisal_id>/submit', methods=['POST'])
@require_auth
def submit_manager_review(appraisal_id):
    """
    Finalizes the manager's review. Validates that all goals and attributes have been assessed.
    """
    ctx = g.current_user
    appraisal = Appraisal.query.get_or_404(appraisal_id)

    # Only manager can do this
    if appraisal.manager_id != ctx['user_id']:
        return jsonify({'error': 'Only the assigned manager can submit this review'}), 403

    if appraisal.status != 'manager_review':
        return jsonify({'error': f'Appraisal is not ready for manager submission (status: {appraisal.status})'}), 400

    # Validation: Ensure all performance goals have a manager rating
    from models.goal import Goal
    performance_goals = Goal.query.filter_by(
        employee_id=appraisal.employee_id,
        appraisal_cycle_id=appraisal.cycle_id,
        goal_type='performance'
    ).all()

    goal_reviews = ManagerReview.query.filter_by(appraisal_id=appraisal_id).all()
    reviewed_goal_ids = {r.goal_id for r in goal_reviews if r.manager_rating is not None and r.manager_comment}

    unreviewed_goals = [g.id for g in performance_goals if g.id not in reviewed_goal_ids]
    if unreviewed_goals:
        return jsonify({'error': 'All mandatory performance goals must be rated and commented on before submission.'}), 400
        
    # Validation: Ensure all attributes have a manager rating
    from models.attribute_template import AttributeTemplate
    from models.employee_attribute import EmployeeAttribute
    
    cycle_attributes = AttributeTemplate.query.filter_by(cycle_id=appraisal.cycle_id, is_active=True).all()
    employee_attributes = EmployeeAttribute.query.filter_by(
        employee_id=appraisal.employee_id,
        cycle_id=appraisal.cycle_id
    ).all()
    
    reviewed_attr_ids = {a.attribute_template_id for a in employee_attributes if a.manager_rating is not None and a.manager_comment}
    
    unreviewed_attrs = [a.id for a in cycle_attributes if a.id not in reviewed_attr_ids]
    if unreviewed_attrs:
        return jsonify({'error': 'All behavioral attributes must be rated and commented on before submission.'}), 400
        
    # Validation: Ensure overall appraisal review exists
    overall_review = AppraisalReview.query.filter_by(appraisal_id=appraisal_id).first()
    if not overall_review or overall_review.overall_rating is None:
        return jsonify({'error': 'An overall rating must be provided before submission.'}), 400

    # Auto-calculate scores
    try:
        from services.review_service import ReviewService
        ReviewService.calculate_scores(appraisal.id)
    except Exception as e:
        current_app.logger.warning(f'Score calculation failed for appraisal {appraisal.id}: {e}')

    # Update appraisal status — route to calibration if cycle requires it
    appraisal.manager_submitted = True
    appraisal.manager_assessment_submitted_at = datetime.now(timezone.utc)

    requires_calibration = appraisal.cycle and getattr(appraisal.cycle, 'requires_calibration', False)
    next_status = 'calibration' if requires_calibration else 'acknowledgement_pending'
    appraisal.status = next_status

    db.session.commit()

    # Notify employee (only when going straight to acknowledgement, not calibration)
    if next_status == 'acknowledgement_pending':
        try:
            from services.notification_service import NotificationService
            NotificationService.create_notification(
                recipient_id=appraisal.employee_id,
                event='manager_review_submitted',
                triggered_by=ctx['user_id'],
                resource_type='appraisal',
                resource_id=appraisal.id,
            )
            db.session.commit()
        except Exception as e:
            current_app.logger.warning(f'Could not send acknowledgement notification for appraisal {appraisal.id}: {e}')

    return jsonify({
        'message': 'Manager review submitted successfully.' + (' Pending calibration.' if requires_calibration else ''),
        'appraisal': appraisal.to_dict()
    }), 200
