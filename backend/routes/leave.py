from flask import Blueprint, request, jsonify, g
from datetime import datetime
from extensions import db
from models.leave_type import LeaveType
from models.leave_balance import LeaveBalance
from models.leave_request import LeaveRequest
from models.holiday import Holiday
from services.leave_service import LeaveService
from utils.decorators import require_auth, require_role, cache
from extensions import db, cache as cache_obj

leave_bp = Blueprint('leave', __name__)

@leave_bp.route('/types', methods=['GET'])
@require_auth
@cache(timeout=3600)
def get_leave_types():
    """List all active leave types."""
    types = LeaveType.query.filter_by(is_active=True).all()
    return jsonify([t.to_dict() for t in types])

@leave_bp.route('/balance', methods=['GET'])
@require_auth
@cache(timeout=600, query_params=['year', 'employee_id'])
def get_balances():
    """Get leave balances. Admins/managers can query others."""
    from models.user_profile import UserProfile
    year = request.args.get('year', type=int, default=datetime.utcnow().year)
    employee_id = request.args.get('employee_id')
    
    target_id = g.current_user['user_id']
    if employee_id and employee_id != target_id:
        if g.current_user['role'] not in ('hr_admin', 'super_admin'):
            profile = UserProfile.query.get(employee_id)
            if not profile or profile.manager_id != g.current_user['user_id']:
                return jsonify({'error': 'Forbidden'}), 403
        target_id = employee_id

    balances = LeaveService.get_user_balances(target_id, year)
    return jsonify([b.to_dict() for b in balances])

@leave_bp.route('/requests', methods=['POST'])
@require_auth
def create_leave_request():
    """Submit a new leave request."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
        
    leave_type_id = data.get('leave_type_id')
    start_date = datetime.strptime(data.get('start_date'), '%Y-%m-%d').date()
    end_date = datetime.strptime(data.get('end_date'), '%Y-%m-%d').date()
    is_half_day = data.get('is_half_day', False)
    
    # 1. Check for overlapping requests
    overlaps = LeaveService.check_overlap(g.current_user['user_id'], start_date, end_date)
    if overlaps:
        return jsonify({
            'error': 'Overlap detected',
            'overlapping_requests': [r.to_dict() for r in overlaps]
        }), 409
        
    # 2. Check balance (optional but recommended)
    # TODO: Add strict balance enforcement if required
    
    duration = LeaveService.calculate_duration(start_date, end_date, is_half_day)
    
    if duration <= 0:
        return jsonify({'error': 'Duration cannot be 0 days. Please ensure you have selected working days.'}), 400
        
    # 3. Ensure start and end dates are working days
    holidays = [h.date for h in Holiday.query.filter(Holiday.year == start_date.year).all()]
    
    if start_date.weekday() >= 5 or start_date in holidays:
        return jsonify({'error': 'Leave cannot start on a weekend or bank holiday.'}), 400
        
    if end_date.weekday() >= 5 or end_date in holidays:
        return jsonify({'error': 'Leave cannot end on a weekend or bank holiday.'}), 400
    
    request_obj = LeaveRequest(
        user_id=g.current_user['user_id'],
        leave_type_id=leave_type_id,
        start_date=start_date,
        end_date=end_date,
        duration_days=duration,
        is_half_day=is_half_day,
        half_day_period=data.get('half_day_period'),
        reason=data.get('reason'),
        status='PENDING' # Direct submit for now
    )
    
    db.session.add(request_obj)
    db.session.flush()
    
    # Update balance counters
    LeaveService.update_pending_balance(request_obj, old_status='DRAFT')
    
    # Log audit
    LeaveService.log_audit(request_obj.id, g.current_user['user_id'], 'PENDING', old_status='DRAFT')
    
    db.session.commit()
    return jsonify(request_obj.to_dict()), 201

@leave_bp.route('/requests/my', methods=['GET'])
@require_auth
def get_my_requests():
    """List current user's leave requests."""
    requests = LeaveRequest.query.filter_by(user_id=g.current_user['user_id']).order_by(LeaveRequest.created_at.desc()).all()
    return jsonify([r.to_dict() for r in requests])

@leave_bp.route('/requests/<id>/cancel', methods=['PUT'])
@require_auth
def cancel_leave_request(id):
    """Cancel own leave request."""
    request_obj = LeaveRequest.query.get_or_404(id)
    if request_obj.user_id != g.current_user['user_id']:
        return jsonify({'error': 'Forbidden'}), 403
        
    if request_obj.status not in ['PENDING', 'APPROVED']:
        return jsonify({'error': f'Cannot cancel request with status {request_obj.status}'}), 400
        
    old_status = request_obj.status
    request_obj.status = 'CANCELLED'
    
    LeaveService.update_pending_balance(request_obj, old_status=old_status)
    LeaveService.log_audit(id, g.current_user['user_id'], 'CANCELLED', old_status=old_status)
    
    db.session.commit()
    return jsonify(request_obj.to_dict())

@leave_bp.route('/requests/team', methods=['GET'])
@require_auth
@require_role('manager', 'hr_admin', 'super_admin')
def get_team_requests():
    """List team's pending leave requests for approval."""
    # This assumes g.user is a manager
    # We fetch requests where user.manager_id == g.current_user['user_id']
    from models.user_profile import UserProfile
    requests = db.session.query(LeaveRequest).join(UserProfile, LeaveRequest.user_id == UserProfile.id)\
        .filter(UserProfile.manager_id == g.current_user['user_id'])\
        .order_by(LeaveRequest.created_at.desc()).all()
    
    return jsonify([r.to_dict() for r in requests])

@leave_bp.route('/requests/<id>/approve', methods=['PUT'])
@require_auth
@require_role('manager', 'hr_admin', 'super_admin')
def approve_leave_request(id):
    """Approve a leave request."""
    leave_req = LeaveRequest.query.get_or_404(id)
    data = request.get_json() or {}
    
    if leave_req.status != 'PENDING':
        return jsonify({'error': 'Only pending requests can be approved'}), 400
        
    leave_req.status = 'APPROVED'
    leave_req.reviewed_by = g.current_user['user_id']
    leave_req.reviewed_at = datetime.utcnow()
    leave_req.reviewer_comment = data.get('comment')
    
    LeaveService.update_pending_balance(leave_req, old_status='PENDING')
    LeaveService.log_audit(id, g.current_user['user_id'], 'APPROVED', old_status='PENDING', comment=data.get('comment'))
    
    # Sync to timesheet (Monolith Advantage)
    LeaveService.sync_to_timesheet(leave_req)
    
    db.session.commit()
    return jsonify(leave_req.to_dict())

@leave_bp.route('/requests/<id>/reject', methods=['PUT'])
@require_auth
@require_role('manager', 'hr_admin', 'super_admin')
def reject_leave_request(id):
    """Reject a leave request."""
    leave_req = LeaveRequest.query.get_or_404(id)
    data = request.get_json() or {}
    
    if leave_req.status != 'PENDING':
        return jsonify({'error': 'Only pending requests can be rejected'}), 400
        
    leave_req.status = 'REJECTED'
    leave_req.reviewed_by = g.current_user['user_id']
    leave_req.reviewed_at = datetime.utcnow()
    leave_req.reviewer_comment = data.get('comment')
    
    LeaveService.update_pending_balance(leave_req, old_status='PENDING')
    LeaveService.log_audit(id, g.current_user['user_id'], 'REJECTED', old_status='PENDING', comment=data.get('comment'))
    
    db.session.commit()
    return jsonify(leave_req.to_dict())

@leave_bp.route('/holidays', methods=['GET'])
@require_auth
def get_holidays():
    """List all holidays for a year."""
    year = request.args.get('year', type=int, default=datetime.utcnow().year)
    holidays = Holiday.query.filter_by(year=year).order_by(Holiday.date).all()
    return jsonify([h.to_dict() for h in holidays])

@leave_bp.route('/holidays', methods=['POST'])
@require_role('hr_admin', 'super_admin')
def create_holiday():
    """Add a new holiday (admin only)."""
    data = request.get_json()
    if not data or not data.get('name') or not data.get('date'):
        return jsonify({'error': 'Name and date are required'}), 400
        
    name = data.get('name')
    holiday_date = datetime.strptime(data.get('date'), '%Y-%m-%d').date()
    is_optional = data.get('is_optional', False)
    
    # Check if holiday exists
    existing = Holiday.query.filter_by(date=holiday_date).first()
    if existing:
        return jsonify({'error': 'A holiday already exists on this date'}), 409
        
    holiday = Holiday(
        name=name,
        date=holiday_date,
        year=holiday_date.year,
        is_optional=is_optional
    )
    
    db.session.add(holiday)
    db.session.commit()
    return jsonify(holiday.to_dict()), 201
