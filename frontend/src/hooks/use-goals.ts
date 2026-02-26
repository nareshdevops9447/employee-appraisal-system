
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { Goal } from '@/types/goal';
import { toast } from 'sonner';

export function useGoals(params?: { status?: string; category?: string; priority?: string; scope?: string; employee_id?: string }) {
    return useQuery({
        queryKey: ['goals', params],
        queryFn: async () => {
            const { data } = await apiClient.get<{ goals: Goal[]; total: number; page: number; per_page: number }>('/api/goals', { params });
            return data.goals;
        },
    });
}

export function useGoal(id: string) {
    return useQuery({
        queryKey: ['goals', id],
        queryFn: async () => {
            const { data } = await apiClient.get<Goal>(`/api/goals/${id}`);
            return data;
        },
        enabled: !!id,
    });
}

export function useCreateGoal() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (goal: Partial<Goal> & { employee_id?: string | null }) => {
            const { data } = await apiClient.post<Goal>('/api/goals', goal);
            return data;
        },
        onSuccess: () => {
            toast.success('Goal created successfully');
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            queryClient.invalidateQueries({ queryKey: ['goals', 'stats'] });
        },
        onError: (error) => {
            toast.error('Failed to create goal');
            console.error(error);
        }
    });
}

export function useUpdateGoal() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Goal> }) => {
            const { data: result } = await apiClient.put<Goal>(`/api/goals/${id}`, data);
            return result;
        },
        onSuccess: (data) => {
            toast.success('Goal updated successfully');
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            queryClient.invalidateQueries({ queryKey: ['goals', data.id] });
            queryClient.invalidateQueries({ queryKey: ['goals', 'stats'] });
        },
        onError: (error) => {
            toast.error('Failed to update goal');
            console.error(error);
        }
    });
}

export function useDeleteGoal() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/api/goals/${id}`);
        },
        onSuccess: () => {
            toast.success('Goal deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            queryClient.invalidateQueries({ queryKey: ['goals', 'stats'] });
        },
        onError: (error) => {
            toast.error('Failed to delete goal');
            console.error(error);
        }
    });
}

export function useGoalStats() {
    return useQuery({
        queryKey: ['goals', 'stats'],
        queryFn: async () => {
            const { data } = await apiClient.get<{
                total: number;
                completed: number;
                in_progress: number;
                not_started: number;
                average_progress: number;
            }>('/api/goals/stats/me');
            return data;
        }
    });
}
