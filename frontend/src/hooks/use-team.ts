
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { UserProfile } from '@/types/user';

export interface TeamMember extends UserProfile {
    active_appraisal_status?: string;
    goals_total?: number;
    goals_completed?: number;
}

export function useTeamMembers(params?: { department_id?: string; search?: string }) {
    return useQuery({
        queryKey: ['team', params],
        queryFn: async () => {
            // If manager, /api/users/direct-reports
            // If HR, /api/users with department filter
            // For now, let's assume a unified endpoint or use filtering
            const { data } = await apiClient.get<TeamMember[]>('/api/users/team', { params });
            return data;
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
