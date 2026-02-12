
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { KeyResult } from '@/types/goal';
import { toast } from 'sonner';

export function useAddKeyResult() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ goalId, data }: { goalId: string; data: Partial<KeyResult> }) => {
            const { data: result } = await apiClient.post<KeyResult>(`/api/goals/${goalId}/key-results`, data);
            return result;
        },
        onSuccess: (_, variables) => {
            toast.success('Key Result added');
            queryClient.invalidateQueries({ queryKey: ['goals', variables.goalId] });
        },
        onError: () => {
            toast.error('Failed to add key result');
        }
    });
}

export function useUpdateKeyResult() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ goalId, id, data }: { goalId: string; id: string; data: Partial<KeyResult> }) => {
            const { data: result } = await apiClient.put<KeyResult>(`/api/goals/${goalId}/key-results/${id}`, data);
            return result;
        },
        onSuccess: (_, variables) => {
            toast.success('Key Result updated');
            queryClient.invalidateQueries({ queryKey: ['goals', variables.goalId] });
        },
        onError: () => {
            toast.error('Failed to update key result');
        }
    });
}

export function useDeleteKeyResult() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ goalId, id }: { goalId: string; id: string }) => {
            await apiClient.delete(`/api/goals/${goalId}/key-results/${id}`);
        },
        onSuccess: (_, variables) => {
            toast.success('Key Result deleted');
            queryClient.invalidateQueries({ queryKey: ['goals', variables.goalId] });
        },
        onError: () => {
            toast.error('Failed to delete key result');
        }
    });
}
