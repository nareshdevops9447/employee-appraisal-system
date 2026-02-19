from datetime import datetime, timezone
from extensions import db
from models.goal import Goal
from models.goal_audit import GoalAudit
from models.goal_version import GoalVersion
from services.notification_service import NotificationService
from services.hierarchy_service import HierarchyService

class ApprovalWorkflow:
    @staticmethod
    def submit_for_approval(goal, user_id, user_role):
        """
        Transition from DRAFT/REJECTED -> PENDING_APPROVAL
        """
        if goal.approval_status not in ['draft', 'rejected', 'revision_requested']:
             raise ValueError(f"Cannot submit goal in status {goal.approval_status}")

        # Check if assigned to someone else
        # If I am assigning to myself, I might not need approval? 
        # But generally, we want manager approval if employee creates, or employee approval if manager creates.
        # Current flow: Manager creates -> Pending (Employee approves).
        
        # Snapshot current version before changing status? 
        # Or snapshot on approval?
        # Let's snapshot on submission to capture what is being submitted.
        ApprovalWorkflow._create_version(goal)

        old_status = goal.approval_status
        goal.approval_status = 'pending_approval'
        goal.rejected_reason = None # Clear rejection reason
        
        db.session.add(goal)
        
        ApprovalWorkflow._log_audit(goal, old_status, 'pending_approval', user_id, user_role)
        
        # Notify Employee
        NotificationService.create_notification(
            recipient_id=goal.employee_id,
            event='goal_assigned_pending',
            goal_id=goal.id,
            triggered_by=user_id
        )
        
        db.session.commit()
        return goal

    @staticmethod
    def approve_goal(goal, user_id, user_role):
        """
        Transition from PENDING_APPROVAL -> APPROVED
        """
        if goal.approval_status != 'pending_approval':
             raise ValueError("Goal is not pending approval")
        
        # Only the assignee (employee) should approve? 
        # Or if employee submitted, manager approves.
        # Use HierarchyService to validate if needed, but for now specific roles.
        
        old_status = goal.approval_status
        goal.approval_status = 'approved'
        goal.approved_date = datetime.now(timezone.utc)
        goal.approved_by = user_id
        
        db.session.add(goal)
        
        ApprovalWorkflow._log_audit(goal, old_status, 'approved', user_id, user_role)
        
        # Notify Manager (Creator)
        if goal.created_by and goal.created_by != user_id:
            NotificationService.create_notification(
                recipient_id=goal.created_by,
                event='goal_approved',
                goal_id=goal.id,
                triggered_by=user_id
            )

        db.session.commit()
        return goal

    @staticmethod
    def reject_goal(goal, user_id, user_role, reason):
        """
        Transition from PENDING_APPROVAL -> REJECTED
        """
        if goal.approval_status != 'pending_approval':
             raise ValueError("Goal is not pending approval")
        
        if not reason:
            raise ValueError("Rejection reason is required")

        old_status = goal.approval_status
        goal.approval_status = 'rejected'
        goal.rejected_reason = reason
        
        db.session.add(goal)
        
        ApprovalWorkflow._log_audit(goal, old_status, 'rejected', user_id, user_role)
        
        # Notify Manager (Creator)
        if goal.created_by and goal.created_by != user_id:
             NotificationService.create_notification(
                recipient_id=goal.created_by,
                event='goal_rejected',
                goal_id=goal.id,
                triggered_by=user_id
            )
            
        db.session.commit()
        return goal

    @staticmethod
    def _create_version(goal):
        version = GoalVersion(
            goal_id=goal.id,
            version_number=goal.version_number,
            title=goal.title,
            description=goal.description,
            category=goal.category,
            priority=goal.priority,
            start_date=goal.start_date,
            target_date=goal.target_date,
            approval_status=goal.approval_status,
            rejected_reason=goal.rejected_reason,
            created_by=goal.created_by # Or current user?
        )
        db.session.add(version)
        goal.version_number += 1

    @staticmethod
    def _log_audit(goal, old_status, new_status, user_id, user_role):
        audit = GoalAudit(
            goal_id=goal.id,
            old_status=old_status,
            new_status=new_status,
            changed_by_user_id=user_id,
            changed_by_role=user_role,
            version_number=goal.version_number
        )
        db.session.add(audit)
