
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { GoalComment } from '@/types/goal';
import { toast } from 'sonner';

export function useGoalComments(goalId: string) {
    return useQuery({
        queryKey: ['goals', goalId, 'comments'],
        queryFn: async () => {
            const { data } = await apiClient.get<GoalComment[]>(`/api/goals/${goalId}/comments`);
            return data;
        },
        enabled: !!goalId,
    });
}

export function useAddComment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ goalId, data }: { goalId: string; data: { content: string; comment_type: string } }) => {
            const { data: result } = await apiClient.post<GoalComment>(`/api/goals/${goalId}/comments`, data);
            return result;
        },
        onSuccess: (_, variables) => {
            toast.success('Comment added');
            queryClient.invalidateQueries({ queryKey: ['goals', variables.goalId, 'comments'] });
        },
        onError: () => {
            toast.error('Failed to add comment');
        }
    });
}
