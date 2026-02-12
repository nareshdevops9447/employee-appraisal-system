
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { Appraisal, AppraisalCycle } from '@/types/appraisal';

export function useAppraisals(cycleId?: string) {
    return useQuery({
        queryKey: ['appraisals', cycleId],
        queryFn: async () => {
            const params = cycleId ? { cycle_id: cycleId } : {};
            const { data } = await apiClient.get<Appraisal[]>('/api/appraisals', { params });
            return data;
        },
    });
}

export function useAppraisal(id: string) {
    return useQuery({
        queryKey: ['appraisals', id],
        queryFn: async () => {
            const { data } = await apiClient.get<Appraisal>(`/api/appraisals/${id}`);
            return data;
        },
        enabled: !!id,
    });
}

export function useActiveCycle() {
    return useQuery({
        queryKey: ['cycles', 'active'],
        queryFn: async () => {
            // Assuming we might have an endpoint for this, or filter on client
            // For now, fetching all and filtering, or specific endpoint if exists
            // In Phase 4 we made GET /cycles. Let's assume we filter or specific endpoint
            const { data } = await apiClient.get<AppraisalCycle[]>('/api/cycles');
            return data.find(c => c.status === 'active');
        }
    })
}
