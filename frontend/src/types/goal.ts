
export type GoalStatus = 'draft' | 'active' | 'in_progress' | 'completed' | 'cancelled' | 'deferred';
export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';
export type GoalCategory = 'performance' | 'development' | 'project' | 'mission_aligned';

export interface KeyResult {
    id: string;
    goal_id: string;
    title: string;
    description?: string;
    target_value: number;
    current_value: number;
    unit: string;
    status: 'not_started' | 'in_progress' | 'completed';
    due_date: string;
    created_at: string;
    updated_at: string;
}

export interface GoalComment {
    id: string;
    goal_id: string;
    author_id: string;
    content: string;
    comment_type: 'update' | 'feedback' | 'blocker' | 'achievement';
    created_at: string;
    author?: { name: string; avatar?: string };
}

export interface Goal {
    id: string;
    employee_id: string;
    title: string;
    description?: string;
    category: GoalCategory;
    priority: GoalPriority;
    status: GoalStatus;
    progress_percentage: number;
    start_date: string;
    target_date: string;
    completed_date?: string;
    parent_goal_id?: string;
    appraisal_cycle_id?: string;
    created_by: string;
    approved_by?: string;
    // approval_status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'closed'
    approval_status: string;
    approved_date?: string;
    rejected_reason?: string;
    version_number: number;
    created_at: string;
    updated_at: string;

    key_results?: KeyResult[];
    comments?: GoalComment[];
    children?: Goal[];
}
