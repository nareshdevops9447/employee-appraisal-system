
export type TimesheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type TimesheetEntryType = 'WORK' | 'LEAVE' | 'HOLIDAY' | 'COMP_OFF';

export interface Project {
    id: string;
    code: string;
    name: string;
    description: string;
    is_active: boolean;
}

export interface TimesheetEntry {
    id?: string;
    user_id: string;
    date: string; // ISO date string
    project_id: string;
    project_code?: string;
    project_name?: string;
    hours: number;
    entry_type: TimesheetEntryType;
    description: string;
    is_auto_generated: boolean;
}

export interface WeeklyTimesheet {
    id?: string;
    user_id: string;
    week_start: string; // ISO date string (Monday)
    week_end: string;   // ISO date string (Sunday)
    total_hours: number;
    status: TimesheetStatus;
    submitted_at?: string;
    reviewed_by?: string;
    reviewed_at?: string;
    reviewer_comment?: string;
}

export interface TimesheetSummary {
    weekly_summary: WeeklyTimesheet;
    entries: TimesheetEntry[];
}
