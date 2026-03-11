export type LeaveStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveType {
    id: string;
    name: string;
    description?: string;
    default_days_per_year: number;
    is_paid: boolean;
    requires_approval: boolean;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface LeaveBalance {
    id: string;
    user_id: string;
    leave_type_id: string;
    leave_type_name: string;
    year: number;
    total_days: number;
    used_days: number;
    pending_days: number;
    remaining_days: number;
    created_at?: string;
    updated_at?: string;
}

export interface LeaveRequest {
    id: string;
    user_id: string;
    user_name?: string;
    leave_type_id: string;
    leave_type_name: string;
    start_date: string;
    end_date: string;
    duration_days: number;
    is_half_day: boolean;
    half_day_period?: 'FIRST_HALF' | 'SECOND_HALF';
    reason?: string;
    status: LeaveStatus;
    reviewed_by?: string;
    reviewed_by_name?: string;
    reviewed_at?: string;
    reviewer_comment?: string;
    created_at?: string;
    updated_at?: string;
}

export interface LeaveAudit {
    id: string;
    leave_request_id: string;
    performed_by: string;
    performed_by_name: string;
    old_status?: LeaveStatus;
    new_status: LeaveStatus;
    comment?: string;
    created_at: string;
}

export interface Holiday {
    id: string;
    name: string;
    date: string;
    year: number;
    is_optional: boolean;
}
