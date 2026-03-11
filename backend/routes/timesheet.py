from flask import Blueprint, request, jsonify, g
from extensions import db
from models.project import Project
from models.timesheet_entry import TimesheetEntry
from models.weekly_timesheet import WeeklyTimesheet
from services.timesheet_service import TimesheetService
from utils.decorators import require_auth, require_role, cache
from extensions import db, cache as cache_obj
from datetime import datetime
import uuid

timesheet_bp = Blueprint('timesheet', __name__)

@timesheet_bp.route('/projects', methods=['GET'])
@require_auth
@cache(timeout=3600)
def get_projects():
    """List all active projects."""
    projects = Project.query.filter_by(is_active=True).all()
    return jsonify([p.to_dict() for p in projects])

@timesheet_bp.route('/my/week', methods=['GET'])
@require_auth
def get_my_weekly_timesheet():
    """Get the weekly timesheet for the current user."""
    date_str = request.args.get('date')
    if date_str:
        try:
            current_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    else:
        current_date = datetime.utcnow().date()
        
    week_start, week_end = TimesheetService.get_week_range(current_date)
    
    weekly = WeeklyTimesheet.query.filter_by(
        user_id=g.current_user['user_id'],
        week_start=week_start
    ).first()
    
    entries = TimesheetService.get_weekly_entries(g.current_user['user_id'], week_start)
    
    return jsonify({
        'weekly_summary': weekly.to_dict() if weekly else {
            'week_start': week_start.isoformat(),
            'week_end': week_end.isoformat(),
            'status': 'DRAFT',
            'total_hours': 0
        },
        'entries': [e.to_dict() for e in entries]
    })

@timesheet_bp.route('/entries', methods=['POST'])
@require_auth
def upsert_entries():
    """Batch create/update timesheet entries for a user."""
    data = request.get_json()
    if not isinstance(data, list):
        return jsonify({'error': 'Input should be a list of entries'}), 400
        
    user_id = g.current_user['user_id']
    modified_weeks = set()
    
    for item in data:
        date_obj = datetime.strptime(item.get('date'), '%Y-%m-%d').date()
        project_id = item.get('project_id')
        hours = item.get('hours', 0)
        description = item.get('description', '')
        
        TimesheetService.upsert_entry(
            user_id=user_id,
            date_obj=date_obj,
            project_id=project_id,
            hours=hours,
            description=description
        )
        
        week_start, _ = TimesheetService.get_week_range(date_obj)
        modified_weeks.add(week_start)
        
    for ws in modified_weeks:
        TimesheetService.sync_weekly_total(user_id, ws)
        
    db.session.commit()
    return jsonify({'message': 'Entries updated successfully'})

@timesheet_bp.route('/submit', methods=['POST'])
@require_auth
def submit_timesheet():
    """Submit a weekly timesheet for approval."""
    data = request.get_json()
    week_start_str = data.get('week_start')
    
    if not week_start_str:
        return jsonify({'error': 'week_start is required'}), 400
        
    week_start = datetime.strptime(week_start_str, '%Y-%m-%d').date()
    
    weekly = WeeklyTimesheet.query.filter_by(
        user_id=g.current_user['user_id'],
        week_start=week_start
    ).first()
    
    if not weekly:
        # Create blank if it doesn't exist? or error?
        # Usually sync_weekly_total handles creation.
        # Let's sync just in case.
        weekly = TimesheetService.sync_weekly_total(g.current_user['user_id'], week_start)
        
    if weekly.status not in ['DRAFT', 'REJECTED']:
        return jsonify({'error': f'Cannot submit timesheet with status {weekly.status}'}), 400
        
    weekly.status = 'SUBMITTED'
    weekly.submitted_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify(weekly.to_dict())

@timesheet_bp.route('/approvals', methods=['GET'])
@require_auth
@require_role('manager', 'hr_admin', 'super_admin')
def get_pending_approvals():
    """List team timesheets pending approval."""
    # Simplified manager check - in real app, filter by manager's team
    pending = WeeklyTimesheet.query.filter_by(status='SUBMITTED').all()
    return jsonify([t.to_dict() for t in pending])

@timesheet_bp.route('/approvals/<id>/review', methods=['PUT'])
@require_auth
@require_role('manager', 'hr_admin', 'super_admin')
def review_timesheet(id):
    """Approve or reject a timesheet."""
    weekly = WeeklyTimesheet.query.get_or_404(id)
    data = request.get_json()
    
    status = data.get('status')
    if status not in ['APPROVED', 'REJECTED']:
        return jsonify({'error': 'Invalid status. Use APPROVED or REJECTED'}), 400
        
    weekly.status = status
    weekly.reviewed_by = g.current_user['user_id']
    weekly.reviewed_at = datetime.utcnow()
    weekly.reviewer_comment = data.get('comment')
    
    db.session.commit()
    return jsonify(weekly.to_dict())

@timesheet_bp.route('/summary', methods=['GET'])
@require_auth
def get_user_summary():
    """Get attendance summary for a user and range."""
    user_id = request.args.get('user_id', g.current_user['user_id'])
    start_str = request.args.get('start_date')
    end_str = request.args.get('end_date')
    
    if not start_str or not end_str:
        return jsonify({'error': 'start_date and end_date are required'}), 400
        
    start_date = datetime.strptime(start_str, '%Y-%m-%d').date()
    end_date = datetime.strptime(end_str, '%Y-%m-%d').date()
    
    summary = TimesheetService.get_attendance_summary(user_id, start_date, end_date)
    return jsonify(summary)
