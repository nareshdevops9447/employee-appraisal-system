"""
Peer Feedback routes — request, submit, and list peer reviews for appraisals.
"""
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from extensions import db
from models.peer_feedback import PeerFeedback
from models.appraisal import Appraisal
from utils.decorators import require_auth

peer_feedback_bp = Blueprint('peer_feedback', __name__)


@peer_feedback_bp.route('/request', methods=['POST'])
@require_auth
def request_peer_feedback():
    """Request peer feedback for an appraisal.

    Body: { appraisal_id, reviewer_id }
    Employee, manager, or HR can request.
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    appraisal_id = data.get('appraisal_id')
    reviewer_id = data.get('reviewer_id')

    if not appraisal_id or not reviewer_id:
        return jsonify({'error': 'appraisal_id and reviewer_id are required'}), 400

    appraisal = Appraisal.query.get_or_404(appraisal_id)
    ctx = g.current_user

    # Authorization: employee, manager, or HR
    is_employee = appraisal.employee_id == ctx['user_id']
    is_manager = appraisal.manager_id == ctx['user_id']
    is_hr = ctx['role'] in ('hr_admin', 'super_admin')

    if not (is_employee or is_manager or is_hr):
        return jsonify({'error': 'Only the employee, manager, or HR can request peer feedback'}), 403

    # Prevent self-review
    if reviewer_id == appraisal.employee_id:
        return jsonify({'error': 'An employee cannot be their own peer reviewer'}), 400

    # Prevent duplicate
    existing = PeerFeedback.query.filter_by(
        appraisal_id=appraisal_id,
        reviewer_id=reviewer_id,
    ).first()
    if existing:
        return jsonify({'error': 'A peer feedback request already exists for this reviewer'}), 409

    feedback = PeerFeedback(
        appraisal_id=appraisal_id,
        reviewer_id=reviewer_id,
        status='pending',
    )
    db.session.add(feedback)
    db.session.commit()

    return jsonify(feedback.to_dict()), 201


@peer_feedback_bp.route('/<feedback_id>/submit', methods=['POST'])
@require_auth
def submit_peer_feedback(feedback_id):
    """Submit feedback for a peer review request.

    Body: { rating: 1-5, comments: "optional text" }
    Only the assigned reviewer can submit.
    """
    feedback = PeerFeedback.query.get_or_404(feedback_id)
    ctx = g.current_user

    if feedback.reviewer_id != ctx['user_id']:
        return jsonify({'error': 'Only the assigned reviewer can submit this feedback'}), 403

    if feedback.status == 'submitted':
        return jsonify({'error': 'This feedback has already been submitted'}), 400

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    rating = data.get('rating')
    if rating is None:
        return jsonify({'error': 'rating is required (1-5)'}), 400

    try:
        rating = float(rating)
    except (TypeError, ValueError):
        return jsonify({'error': 'rating must be a number between 1 and 5'}), 400

    if rating < 1 or rating > 5:
        return jsonify({'error': 'rating must be between 1 and 5'}), 400

    feedback.feedback = {
        'rating': rating,
        'comments': data.get('comments', ''),
    }
    feedback.status = 'submitted'
    feedback.submitted_at = datetime.now(timezone.utc)

    db.session.commit()
    return jsonify(feedback.to_dict()), 200


@peer_feedback_bp.route('/appraisal/<appraisal_id>', methods=['GET'])
@require_auth
def list_peer_feedbacks(appraisal_id):
    """Get all peer feedbacks for an appraisal.

    Access: employee, manager, or HR.
    """
    appraisal = Appraisal.query.get_or_404(appraisal_id)
    ctx = g.current_user

    is_employee = appraisal.employee_id == ctx['user_id']
    is_manager = appraisal.manager_id == ctx['user_id']
    is_hr = ctx['role'] in ('hr_admin', 'super_admin')

    if not (is_employee or is_manager or is_hr):
        return jsonify({'error': 'Forbidden access to this appraisal\'s peer feedback'}), 403

    feedbacks = PeerFeedback.query.filter_by(appraisal_id=appraisal_id).all()
    return jsonify([f.to_dict() for f in feedbacks])


@peer_feedback_bp.route('/pending', methods=['GET'])
@require_auth
def my_pending_feedbacks():
    """Get all pending peer feedback requests assigned to the current user."""
    ctx = g.current_user
    feedbacks = PeerFeedback.query.filter_by(
        reviewer_id=ctx['user_id'],
        status='pending',
    ).all()
    return jsonify([f.to_dict() for f in feedbacks])


@peer_feedback_bp.route('/<feedback_id>', methods=['GET'])
@require_auth
def get_peer_feedback(feedback_id):
    """Get details of a specific peer feedback."""
    feedback = PeerFeedback.query.get_or_404(feedback_id)
    ctx = g.current_user

    # Access: the reviewer, the appraisal employee/manager, or HR
    appraisal = Appraisal.query.get(feedback.appraisal_id)
    is_reviewer = feedback.reviewer_id == ctx['user_id']
    is_employee = appraisal and appraisal.employee_id == ctx['user_id']
    is_manager = appraisal and appraisal.manager_id == ctx['user_id']
    is_hr = ctx['role'] in ('hr_admin', 'super_admin')

    if not (is_reviewer or is_employee or is_manager or is_hr):
        return jsonify({'error': 'Forbidden'}), 403

    return jsonify(feedback.to_dict())


@peer_feedback_bp.route('/<feedback_id>', methods=['DELETE'])
@require_auth
def cancel_peer_feedback(feedback_id):
    """Cancel a pending peer feedback request.

    Cannot cancel already-submitted feedback.
    Employee, manager, or HR can cancel.
    """
    feedback = PeerFeedback.query.get_or_404(feedback_id)
    ctx = g.current_user

    if feedback.status == 'submitted':
        return jsonify({'error': 'Cannot cancel submitted feedback'}), 400

    appraisal = Appraisal.query.get(feedback.appraisal_id)
    is_employee = appraisal and appraisal.employee_id == ctx['user_id']
    is_manager = appraisal and appraisal.manager_id == ctx['user_id']
    is_hr = ctx['role'] in ('hr_admin', 'super_admin')

    if not (is_employee or is_manager or is_hr):
        return jsonify({'error': 'Only the employee, manager, or HR can cancel a peer feedback request'}), 403

    db.session.delete(feedback)
    db.session.commit()

    return jsonify({'message': 'Peer feedback request cancelled'}), 200
