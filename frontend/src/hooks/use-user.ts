
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { UserProfile } from '@/types/user';

export function useUser(id?: string) {
    return useQuery({
        queryKey: ['users', id],
        queryFn: async () => {
            const { data } = await apiClient.get<UserProfile>(`/api/users/${id}`);
            return data;
        },
        enabled: !!id,
    });
}

export function useMe() {
    return useQuery({
        queryKey: ['users', 'me'],
        queryFn: async () => {
            const { data } = await apiClient.get<UserProfile>('/api/users/me');
            return data;
        },
    });
}
