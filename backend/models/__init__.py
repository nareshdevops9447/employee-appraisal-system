"""
All database models for the Employee Appraisal System.

Consolidated from: auth-service, user-service, goal-service, appraisal-service.
"""
# Auth models
from models.user_auth import UserAuth
from models.refresh_token import RefreshToken

# User models
from models.user_profile import UserProfile
from models.department import Department

# Goal models
from models.goal import Goal
from models.key_result import KeyResult
from models.goal_audit import GoalAudit
from models.goal_comment import GoalComment
from models.goal_comment_reaction import GoalCommentReaction
from models.goal_version import GoalVersion
from models.notification import Notification

# Appraisal models
from models.appraisal import Appraisal
from models.appraisal_cycle import AppraisalCycle
from models.appraisal_question import AppraisalQuestion
from models.peer_feedback import PeerFeedback
from models.team_transfer import TeamTransfer
from models.attribute_template import AttributeTemplate
from models.employee_attribute import EmployeeAttribute
from models.goal_template import GoalTemplate
from models.self_assessment import SelfAssessment
from models.manager_review import ManagerReview
from models.appraisal_review import AppraisalReview
from models.appraisal_appeal import AppraisalAppeal
