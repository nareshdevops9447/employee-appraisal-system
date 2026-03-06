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
    | 'calibration'
    | 'acknowledgement_pending'
    | 'completed';

export interface GoalRating {
    rating: number;       // 1-5
    progress: number;     // 0-100
    comment: string;
}

/** Key result on a goal */
export interface KeyResult {
    id: string;
    title: string;
    description?: string;
    target_value?: number;
    current_value?: number;
    unit?: string;
    status?: string;
    due_date?: string;
}

/** Goal as returned inside appraisal / readiness data */
export interface GoalForAssessment {
    id: string;
    title: string;
    description?: string;
    category?: string;
    priority?: string;
    employee_id: string;
    approval_status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
    status?: string;
    progress?: number;
    weight?: number;
    goal_type?: 'performance' | 'development';
    self_rating?: number | null;
    self_comment?: string | null;
    manager_rating?: number | null;
    manager_comment?: string | null;
    target_date?: string;
    start_date?: string;
    key_results?: KeyResult[];
    created_at: string;
}

/** Goal readiness summary attached to appraisal detail response */
export interface GoalReadiness {
    ready: boolean;
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    goals: GoalForAssessment[];
}

export interface Goal {
    id: string;
    title: string;
    description?: string;
    employee_id: string;
    approval_status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
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
    goals_finalized: boolean;

    // Self-assessment data
    goal_ratings: Record<string, GoalRating> | null;
    self_assessment: Record<string, unknown> | null;
    self_assessment_submitted_at: string | null;

    // Manager data
    manager_assessment: Record<string, unknown> | null;
    manager_assessment_submitted_at: string | null;
    manager_goal_ratings: Record<string, GoalRating> | null;
    overall_rating: number | null;
    calculated_rating: number | null;
    goals_avg_rating: number | null;
    attributes_avg_rating: number | null;

    // Phase 2: enriched manager review fields
    strengths: string | null;
    development_areas: string | null;
    overall_comment: string | null;

    // Meeting
    meeting_date: string | null;
    meeting_notes: string | null;

    // Acknowledgement
    employee_acknowledgement: boolean;
    employee_acknowledgement_date: string | null;
    employee_comments: string | null;
    is_dispute: boolean | null;

    // Eligibility
    eligibility_status: string | null;
    eligibility_reason: string | null;
    is_prorated: boolean;

    // Cycle info (from joined query)
    cycle_name?: string;
    cycle_type?: string;
    cycle_status?: string;
    cycle_start_date?: string;
    cycle_end_date?: string;
    self_assessment_deadline?: string;
    manager_review_deadline?: string;

    // Employee / Manager names (from joined query)
    employee_name?: string;
    employee_email?: string;
    manager_name?: string;
    manager_email?: string;

    // Goals (when fetched)
    goals?: GoalForAssessment[];

    // Goal readiness (for detail view)
    goal_readiness?: GoalReadiness;

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
    eligibility_cutoff_date?: string;
    self_assessment_deadline?: string;
    manager_review_deadline?: string;
    goals_weight?: number;
    attributes_weight?: number;
    requires_calibration?: boolean;
    created_at: string;
}

/** Labels for the workflow stepper */
export const STATUS_LABELS: Record<AppraisalStatus, string> = {
    not_started: 'Not Started',
    goals_pending_approval: 'Goals Pending Approval',
    goals_approved: 'Goals Approved',
    self_assessment_in_progress: 'Self Assessment',
    manager_review: 'Manager Review',
    calibration: 'Calibration',
    acknowledgement_pending: 'Awaiting Sign-Off',
    completed: 'Completed',
};

/** Status order for the progress stepper */
export const STATUS_ORDER: AppraisalStatus[] = [
    'not_started',
    'goals_pending_approval',
    'goals_approved',
    'self_assessment_in_progress',
    'manager_review',
    'calibration',
    'acknowledgement_pending',
    'completed',
];
