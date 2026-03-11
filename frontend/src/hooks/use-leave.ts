
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { LeaveType, LeaveBalance, LeaveRequest, Holiday } from '@/types/leave';
import { toast } from 'sonner';

export function useLeaveTypes() {
    return useQuery({
        queryKey: ['leave', 'types'],
        queryFn: async () => {
            const { data } = await apiClient.get<LeaveType[]>('/api/leave/types');
            return data;
        },
    });
}

export function useLeaveBalances(year?: number) {
    return useQuery({
        queryKey: ['leave', 'balances', year],
        queryFn: async () => {
            const { data } = await apiClient.get<LeaveBalance[]>('/api/leave/balance', {
                params: { year }
            });
            return data;
        },
    });
}

export function useMyLeaveRequests() {
    return useQuery({
        queryKey: ['leave', 'requests', 'my'],
        queryFn: async () => {
            const { data } = await apiClient.get<LeaveRequest[]>('/api/leave/requests/my');
            return data;
        },
    });
}

export function useTeamLeaveRequests() {
    return useQuery({
        queryKey: ['leave', 'requests', 'team'],
        queryFn: async () => {
            const { data } = await apiClient.get<LeaveRequest[]>('/api/leave/requests/team');
            return data;
        },
    });
}

export function useCreateLeaveRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (leaveRequest: Partial<LeaveRequest>) => {
            const { data } = await apiClient.post<LeaveRequest>('/api/leave/requests', leaveRequest);
            return data;
        },
        onSuccess: () => {
            toast.success('Leave request submitted successfully');
            queryClient.invalidateQueries({ queryKey: ['leave', 'requests', 'my'] });
            queryClient.invalidateQueries({ queryKey: ['leave', 'balances'] });
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || 'Failed to submit leave request';
            toast.error(message);
            console.error(error);
        }
    });
}

export function useApproveLeaveRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
            const { data } = await apiClient.put<LeaveRequest>(`/api/leave/requests/${id}/approve`, { comment });
            return data;
        },
        onSuccess: () => {
            toast.success('Leave request approved');
            queryClient.invalidateQueries({ queryKey: ['leave', 'requests', 'team'] });
        },
        onError: (error) => {
            toast.error('Failed to approve leave request');
            console.error(error);
        }
    });
}

export function useRejectLeaveRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
            const { data } = await apiClient.put<LeaveRequest>(`/api/leave/requests/${id}/reject`, { comment });
            return data;
        },
        onSuccess: () => {
            toast.success('Leave request rejected');
            queryClient.invalidateQueries({ queryKey: ['leave', 'requests', 'team'] });
        },
        onError: (error) => {
            toast.error('Failed to reject leave request');
            console.error(error);
        }
    });
}

export function useCancelLeaveRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { data } = await apiClient.put<LeaveRequest>(`/api/leave/requests/${id}/cancel`);
            return data;
        },
        onSuccess: () => {
            toast.success('Leave request cancelled');
            queryClient.invalidateQueries({ queryKey: ['leave', 'requests', 'my'] });
            queryClient.invalidateQueries({ queryKey: ['leave', 'balances'] });
        },
        onError: (error) => {
            toast.error('Failed to cancel leave request');
            console.error(error);
        }
    });
}

export function useHolidays(year?: number) {
    return useQuery({
        queryKey: ['leave', 'holidays', year],
        queryFn: async () => {
            const { data } = await apiClient.get<Holiday[]>('/api/leave/holidays', {
                params: { year }
            });
            return data;
        },
    });
}
