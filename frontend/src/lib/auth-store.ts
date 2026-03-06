/**
 * Zustand auth store — client-side auth state synced with NextAuth session.
 */
import { create } from 'zustand';
import type { Role } from '@/types/auth';

interface AuthState {
    user: {
        id: string;
        email: string;
        name?: string | null;
        role: Role;
    } | null;
    isLoading: boolean;
    isAuthenticated: boolean;

    /** Sync store with NextAuth session data */
    syncSession: (session: {
        user?: {
            id?: string;
            email?: string | null;
            name?: string | null;
            role?: Role;
        };
    } | null) => void;

    /** Clear auth state (on logout) */
    clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isLoading: true,
    isAuthenticated: false,

    syncSession: (session) => {
        if (session?.user?.email) {
            set({
                user: {
                    id: session.user.id || '',
                    email: session.user.email,
                    name: session.user.name,
                    role: session.user.role || 'employee',
                },
                isAuthenticated: true,
                isLoading: false,
            });
        } else {
            set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
            });
        }
    },

    clearAuth: () =>
        set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
        }),
}));
