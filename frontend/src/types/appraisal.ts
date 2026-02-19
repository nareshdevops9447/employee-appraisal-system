/**
 * Appraisal Workflow Types
 * Maps to the backend state machine in services/workflow.py
 */

export type AppraisalStatus =
    | 'not_started'
    | 'goals_pending_approval'
    | 'goals_approved'
    | 'self_assessment_in_progress'
    | 'manager_review'
    | 'completed';

export interface GoalRating {
    rating: number;       // 1-5
    progress: number;     // 0-100
    comment: string;
}

export interface Goal {
    id: string;
    title: string;
    description?: string;
    employee_id: string;
    approval_status: 'pending_approval' | 'approved' | 'rejected';
    progress?: number;
    due_date?: string;
    created_at: string;
}

export interface Appraisal {
    id: string;
    cycle_id: string;
    employee_id: string;
    manager_id: string | null;
    status: AppraisalStatus;
    self_submitted: boolean;
    manager_submitted: boolean;

    // Self-assessment data
    goal_ratings: Record<string, GoalRating> | null;
    self_assessment: Record<string, any> | null;
    self_assessment_submitted_at: string | null;

    // Manager data
    manager_assessment: Record<string, any> | null;
    manager_assessment_submitted_at: string | null;
    manager_goal_ratings: Record<string, GoalRating> | null;
    overall_rating: number | null;

    // Meeting
    meeting_date: string | null;
    meeting_notes: string | null;

    // Acknowledgement
    employee_acknowledgement: boolean;
    employee_acknowledgement_date: string | null;
    employee_comments: string | null;

    // Cycle info (from joined query)
    cycle_name?: string;
    cycle_type?: string;
    cycle_status?: string;
    cycle_start_date?: string;
    cycle_end_date?: string;
    self_assessment_deadline?: string;
    manager_review_deadline?: string;

    // Goals (when fetched)
    goals?: Goal[];

    created_at: string;
    updated_at: string;
}

export interface AppraisalCycle {
    id: string;
    name: string;
    description?: string;
    cycle_type: 'annual' | 'mid_year' | 'probation';
    status: 'draft' | 'active' | 'completed';
    start_date: string;
    end_date: string;
    self_assessment_deadline?: string;
    manager_review_deadline?: string;
    created_at: string;
}

/** Labels for the workflow stepper */
export const STATUS_LABELS: Record<AppraisalStatus, string> = {
    not_started: 'Not Started',
    goals_pending_approval: 'Goals Pending Approval',
    goals_approved: 'Goals Approved',
    self_assessment_in_progress: 'Self Assessment',
    manager_review: 'Manager Review',
    completed: 'Completed',
};

/** Status order for the progress stepper */
export const STATUS_ORDER: AppraisalStatus[] = [
    'not_started',
    'goals_pending_approval',
    'goals_approved',
    'self_assessment_in_progress',
    'manager_review',
    'completed',
];