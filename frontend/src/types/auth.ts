/**
 * Type definitions for authentication.
 */

export type Role = 'employee' | 'manager' | 'hr_admin' | 'super_admin';

export interface AuthUser {
    id: string;
    email: string;
    azure_oid?: string | null;
    role: Role;
    is_active: boolean;
    last_login?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface AuthTokens {
    access_token: string;
    refresh_token: string;
    token_type: string;
}

export interface AuthResponse extends AuthTokens {
    user: AuthUser;
}


