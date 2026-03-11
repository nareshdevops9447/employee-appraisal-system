from datetime import datetime, timedelta
from extensions import db
from models.timesheet_entry import TimesheetEntry
from models.weekly_timesheet import WeeklyTimesheet
from models.project import Project
from decimal import Decimal

class TimesheetService:
    @staticmethod
    def get_week_range(date_obj):
        """Get Monday and Sunday for a given date."""
        monday = date_obj - timedelta(days=date_obj.weekday())
        sunday = monday + timedelta(days=6)
        
        # datetime has .date(), but date does not.
        if hasattr(monday, 'date'):
            return monday.date(), sunday.date()
        return monday, sunday

    @staticmethod
    def get_weekly_entries(user_id, week_start):
        """Get all entries for a user for a specific week."""
        week_end = week_start + timedelta(days=6)
        return TimesheetEntry.query.filter(
            TimesheetEntry.user_id == user_id,
            TimesheetEntry.date >= week_start,
            TimesheetEntry.date <= week_end
        ).all()

    @staticmethod
    def upsert_entry(user_id, date_obj, project_id, hours, description=None, entry_type='WORK'):
        """Create or update a timesheet entry."""
        existing = TimesheetEntry.query.filter_by(
            user_id=user_id,
            date=date_obj,
            project_id=project_id
        ).first()

        if existing:
            existing.hours = Decimal(str(hours))
            existing.description = description
            existing.entry_type = entry_type
            return existing
        else:
            new_entry = TimesheetEntry(
                user_id=user_id,
                date=date_obj,
                project_id=project_id,
                hours=Decimal(str(hours)),
                description=description,
                entry_type=entry_type
            )
            db.session.add(new_entry)
            return new_entry

    @staticmethod
    def sync_weekly_total(user_id, week_start):
        """Recalculate total hours for a weekly timesheet."""
        week_end = week_start + timedelta(days=6)
        entries = TimesheetEntry.query.filter(
            TimesheetEntry.user_id == user_id,
            TimesheetEntry.date >= week_start,
            TimesheetEntry.date <= week_end
        ).all()
        
        total = sum(float(e.hours) for e in entries)
        
        weekly = WeeklyTimesheet.query.filter_by(
            user_id=user_id,
            week_start=week_start
        ).first()
        
        if not weekly:
            weekly = WeeklyTimesheet(
                user_id=user_id,
                week_start=week_start,
                week_end=week_end,
                status='DRAFT'
            )
            db.session.add(weekly)
            
        weekly.total_hours = Decimal(str(total))
        return weekly

    @staticmethod
    def get_attendance_summary(user_id, start_date, end_date):
        """
        Get summary of work hours and leave days for a date range.
        Used for appraisal integration.
        """
        entries = TimesheetEntry.query.filter(
            TimesheetEntry.user_id == user_id,
            TimesheetEntry.date >= start_date,
            TimesheetEntry.date <= end_date
        ).all()
        
        total_work_hours = sum(float(e.hours) for e in entries if e.entry_type == 'WORK')
        leave_entries = [e for e in entries if e.entry_type == 'LEAVE']
        
        # Calculate leave days (assuming 8 hours = 1 day, or 4 = 0.5)
        leave_days = sum(float(e.hours) / 8.0 for e in leave_entries)
        
        return {
            'total_work_hours': total_work_hours,
            'leave_days': float(leave_days),
            'period_start': start_date.isoformat(),
            'period_end': end_date.isoformat()
        }
