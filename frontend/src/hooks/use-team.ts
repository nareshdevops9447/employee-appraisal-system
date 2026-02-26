
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { UserProfile } from '@/types/user';

export interface TeamMember extends UserProfile {
    active_appraisal_status?: string;
    goals_total?: number;
    goals_completed?: number;
}

export function useTeamMembers(params?: { department_id?: string; search?: string; scope?: string }) {
    return useQuery({
        queryKey: ['team', params],
        queryFn: async () => {
            const { data } = await apiClient.get<TeamMember[]>('/api/users/team', { params });
            // Map full_name → name for component compatibility
            return data.map((m) => ({
                ...m,
                name: m.name || (m as any).display_name || m.full_name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email,
            }));
        },
    });
}

export function useTeamMember(id: string) {
    return useQuery({
        queryKey: ['team', id],
        queryFn: async () => {
            const { data } = await apiClient.get<TeamMember>(`/api/users/${id}`);
            return data;
        },
        enabled: !!id,
    });
}
