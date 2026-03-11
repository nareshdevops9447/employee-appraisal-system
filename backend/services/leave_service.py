from datetime import datetime, date, timedelta
from decimal import Decimal
from extensions import db
from models.leave_request import LeaveRequest
from models.leave_balance import LeaveBalance
from models.leave_audit import LeaveAudit
from models.holiday import Holiday
from models.timesheet_entry import TimesheetEntry

class LeaveService:
    """
    Business logic for leave management.
    """

    @staticmethod
    def check_overlap(user_id, start_date, end_date, exclude_request_id=None):
        """
        Returns a list of approved or pending leave requests that overlap with the given dates.
        """
        query = LeaveRequest.query.filter(
            LeaveRequest.user_id == user_id,
            LeaveRequest.status.in_(['PENDING', 'APPROVED']),
            LeaveRequest.start_date <= end_date,
            LeaveRequest.end_date >= start_date
        )
        
        if exclude_request_id:
            query = query.filter(LeaveRequest.id != exclude_request_id)
            
        return query.all()

    @staticmethod
    def calculate_duration(start_date, end_date, is_half_day=False):
        """
        Calculates duration in days, excluding weekends and public holidays.
        """
        if is_half_day:
            return Decimal('0.5')
            
        current_date = start_date
        duration = 0
        
        # Get all holiday dates in range to avoid multiple queries
        holidays = [h.date for h in Holiday.query.filter(
            Holiday.date >= start_date,
            Holiday.date <= end_date
        ).all()]
        
        while current_date <= end_date:
            # Skip weekends (Saturday=5, Sunday=6)
            if current_date.weekday() < 5 and current_date not in holidays:
                duration += 1
            current_date += timedelta(days=1)
            
        return Decimal(str(duration))

    @staticmethod
    def get_user_balances(user_id, year=None):
        """
        Returns all leave balances for a user in a given year.
        Defaults to current year.
        """
        if not year:
            year = datetime.utcnow().year
            
        return LeaveBalance.query.filter_by(user_id=user_id, year=year).all()

    @staticmethod
    def update_pending_balance(leave_request, old_status=None):
        """
        Updates the 'pending_days' for the user's balance when a request is submitted, cancelled, or approved/rejected.
        """
        balance = LeaveBalance.query.filter_by(
            user_id=leave_request.user_id,
            leave_type_id=leave_request.leave_type_id,
            year=leave_request.start_date.year
        ).first()

        if not balance:
            # Optionally auto-create balance if it doesn't exist?
            return False

        duration = leave_request.duration_days

        if leave_request.status == 'PENDING' and old_status == 'DRAFT':
            balance.pending_days += duration
        elif leave_request.status in ['CANCELLED', 'REJECTED'] and old_status == 'PENDING':
            balance.pending_days -= duration
        elif leave_request.status == 'APPROVED' and old_status == 'PENDING':
            balance.pending_days -= duration
            balance.used_days += duration
            
        db.session.add(balance)
        return True

    @staticmethod
    def log_audit(leave_request_id, performed_by, new_status, old_status=None, comment=None):
        """
        Creates an audit log entry for a status change.
        """
        audit = LeaveAudit(
            leave_request_id=leave_request_id,
            performed_by=performed_by,
            old_status=old_status,
            new_status=new_status,
            comment=comment
        )
        db.session.add(audit)
        return audit

    @staticmethod
    def sync_to_timesheet(leave_request):
        """
        Create timesheet entries for an approved leave request.
        """
        from services.timesheet_service import TimesheetService
        
        current_date = leave_request.start_date
        while current_date <= leave_request.end_date:
            # Check if it's a weekend or holiday? 
            # Usually leave entries are created anyway to show 'on leave'
            
            # Use Decimal for hours from timesheet service if needed, 
            # but here we use float/decimal directly.
            hours = Decimal('8.0')
            if leave_request.is_half_day:
                hours = Decimal('4.0')
                
            entry = TimesheetEntry.query.filter_by(
                user_id=leave_request.user_id,
                date=current_date,
                entry_type='LEAVE'
            ).first()
            
            if not entry:
                entry = TimesheetEntry(
                    user_id=leave_request.user_id,
                    date=current_date,
                    leave_request_id=leave_request.id,
                    hours=hours,
                    entry_type='LEAVE',
                    description=f"Leave: {leave_request.leave_type.name}",
                    is_auto_generated=True
                )
                db.session.add(entry)
            else:
                entry.hours = hours
                entry.leave_request_id = leave_request.id
            
            # Sync weekly total for this date
            week_start, _ = TimesheetService.get_week_range(current_date)
            TimesheetService.sync_weekly_total(leave_request.user_id, week_start)
            
            current_date += timedelta(days=1)
        
        db.session.flush() # Ensure entries are created before transaction commits
