
export interface UserProfile {
    id: string;
    email: string;
    name: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    role: 'employee' | 'manager' | 'hr_admin' | 'super_admin';
    department_id?: string;
    department_name?: string;
    manager_id?: string;
    job_title?: string;
    is_active: boolean;
    joined_at?: string;
    start_date?: string;
    avatar_url?: string;
    phone?: string;
    department?: Department;
    manager?: UserProfile;
}

export interface Department {
    id: string;
    name: string;
    head_id?: string;
    parent_id?: string;
    head?: UserProfile;
}
