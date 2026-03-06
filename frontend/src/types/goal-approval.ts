export type ApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'closed';

export interface GoalAuditLog {
    id: string;
    goal_id: string;
    old_status: string;
    new_status: string;
    changed_by_user_id: string;
    changed_by_role: string;
    version_number: number;
    timestamp: string;
}

export interface GoalVersion {
    id: string;
    goal_id: string;
    version_number: number;
    title: string;
    description: string;
    category: string;
    priority: string;
    start_date: string;
    target_date: string;
    approval_status: string;
    rejected_reason?: string;
    created_at: string;
    created_by: string;
}

export interface Notification {
    id: string;
    recipient_id: string;
    event: string;
    goal_id?: string;
    triggered_by: string;
    is_read: boolean;
    created_at: string;
}
