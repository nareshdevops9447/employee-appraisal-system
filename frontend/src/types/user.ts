
export interface UserProfile {
    id: string;
    email: string;
    name: string;
    role: 'employee' | 'manager' | 'hr_admin' | 'super_admin';
    department_id?: string;
    manager_id?: string;
    job_title?: string;
    is_active: boolean;
    joined_at: string;
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
