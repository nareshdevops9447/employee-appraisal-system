"""
Goal Approval Workflow — submit, approve, reject goals.
Migrated from goal-service/services/approval_workflow.py.
"""
from datetime import datetime, timezone
from extensions import db
from models.goal import Goal
from models.goal_audit import GoalAudit
from models.goal_version import GoalVersion
from models.user_profile import UserProfile
from services.notification_service import NotificationService



class ApprovalWorkflow:
    @staticmethod
    def submit_for_approval(goal, user_id, user_role):
        """Transition from DRAFT/REJECTED -> PENDING_APPROVAL"""
        if goal.approval_status not in ['draft', 'rejected', 'revision_requested']:
            raise ValueError(f"Cannot submit goal in status {goal.approval_status}")

        ApprovalWorkflow._create_version(goal)

        old_status = goal.approval_status
        goal.approval_status = 'pending_approval'
        goal.rejected_reason = None

        db.session.add(goal)

        ApprovalWorkflow._log_audit(goal, old_status, 'pending_approval', user_id, user_role)

        # Notify based on who is doing the submission
        profile = UserProfile.query.get(goal.employee_id)
        if user_id == goal.employee_id:
            # Employee submitting — notify manager
            if profile and profile.manager_id:
                event = 'goal_resubmitted' if old_status in ['rejected', 'revision_requested'] else 'goal_submitted'
                NotificationService.create_notification(
                    recipient_id=profile.manager_id,
                    event=event,
                    goal_id=goal.id,
                    triggered_by=user_id,
                )
        else:
            # Manager/Admin assigning — notify employee
            NotificationService.create_notification(
                recipient_id=goal.employee_id,
                event='goal_assigned_pending',
                goal_id=goal.id,
                triggered_by=user_id,
            )

        db.session.commit()

        return goal

    @staticmethod
    def approve_goal(goal, user_id, user_role, comment=''):
        """Transition from PENDING_APPROVAL -> APPROVED"""
        if goal.approval_status != 'pending_approval':
            raise ValueError("Goal is not pending approval")

        old_status = goal.approval_status
        goal.approval_status = 'approved'
        goal.approved_date = datetime.now(timezone.utc)
        goal.approved_by = user_id
        if comment:
            goal.manager_comment = comment

        db.session.add(goal)

        ApprovalWorkflow._log_audit(goal, old_status, 'approved', user_id, user_role)

        # Notify the other party
        recipient_id = goal.employee_id
        if user_id == goal.employee_id:
            profile = UserProfile.query.get(goal.employee_id)
            if profile and profile.manager_id:
                recipient_id = profile.manager_id

        if recipient_id:
            NotificationService.create_notification(
                recipient_id=recipient_id,
                event='goal_approved',
                goal_id=goal.id,
                triggered_by=user_id,
            )

        db.session.commit()

        return goal

    @staticmethod
    def reject_goal(goal, user_id, user_role, reason):
        """Transition from PENDING_APPROVAL -> REJECTED"""
        if goal.approval_status != 'pending_approval':
            raise ValueError("Goal is not pending approval")

        if not reason:
            raise ValueError("Rejection reason is required")

        old_status = goal.approval_status
        goal.approval_status = 'rejected'
        goal.rejected_reason = reason

        db.session.add(goal)

        ApprovalWorkflow._log_audit(goal, old_status, 'rejected', user_id, user_role)

        # Notify the other party
        recipient_id = goal.employee_id
        if user_id == goal.employee_id:
            profile = UserProfile.query.get(goal.employee_id)
            if profile and profile.manager_id:
                recipient_id = profile.manager_id

        if recipient_id:
            NotificationService.create_notification(
                recipient_id=recipient_id,
                event='goal_rejected',
                goal_id=goal.id,
                triggered_by=user_id,
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
            created_by=goal.created_by,
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
            version_number=goal.version_number,
        )
        db.session.add(audit)
