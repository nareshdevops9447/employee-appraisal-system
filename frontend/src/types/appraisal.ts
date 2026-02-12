
export type AppraisalStatus =
    | 'not_started'
    | 'self_assessment'
    | 'manager_review'
    | 'meeting_scheduled'
    | 'meeting_completed'
    | 'acknowledged'
    | 'completed'
    | 'archived';

export interface AppraisalCycle {
    id: string;
    name: string;
    description?: string;
    cycle_type: 'annual' | 'probation' | 'pip';
    status: 'draft' | 'active' | 'completed' | 'archived';
    start_date: string;
    end_date: string;
    self_assessment_due_date?: string;
    manager_review_due_date?: string;
    created_at: string;
}

export interface AppraisalQuestion {
    id: string;
    text: string;
    type: 'rating' | 'text' | 'boolean' | 'competency';
    category: string;
    order: number;
    required: boolean;
    self_applies: boolean;
    manager_applies: boolean;
}

export interface Appraisal {
    id: string;
    employee_id: string;
    manager_id: string;
    cycle_id: string;
    status: AppraisalStatus;
    self_assessment_data: Record<string, any>;
    manager_assessment_data: Record<string, any>;
    overall_rating?: number;
    meeting_date?: string;
    meeting_notes?: string;
    employee_comments?: string;
    created_at: string;
    updated_at: string;

    // Joined fields (optional depending on API response key)
    employee?: { name: string; email: string };
    manager?: { name: string; email: string };
    cycle?: AppraisalCycle;
}
