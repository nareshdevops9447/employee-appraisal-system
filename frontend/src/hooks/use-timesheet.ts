
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { Project, TimesheetEntry, WeeklyTimesheet, TimesheetSummary } from '@/types/timesheet';
import { toast } from 'sonner';

export function useProjects() {
    return useQuery({
        queryKey: ['timesheet', 'projects'],
        queryFn: async () => {
            const { data } = await apiClient.get<Project[]>('/api/timesheet/projects');
            return data;
        },
    });
}

export function useWeeklyTimesheet(date?: string) {
    return useQuery({
        queryKey: ['timesheet', 'weekly', date],
        queryFn: async () => {
            const { data } = await apiClient.get<TimesheetSummary>('/api/timesheet/my/week', {
                params: { date }
            });
            return data;
        },
    });
}

export function useUpsertEntries() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (entries: Partial<TimesheetEntry>[]) => {
            const { data } = await apiClient.post('/api/timesheet/entries', entries);
            return data;
        },
        onSuccess: () => {
            toast.success('Timesheet entries saved');
            queryClient.invalidateQueries({ queryKey: ['timesheet', 'weekly'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to save entries');
        }
    });
}

export function useSubmitTimesheet() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (weekStart: string) => {
            const { data } = await apiClient.post<WeeklyTimesheet>('/api/timesheet/submit', { week_start: weekStart });
            return data;
        },
        onSuccess: () => {
            toast.success('Timesheet submitted for approval');
            queryClient.invalidateQueries({ queryKey: ['timesheet', 'weekly'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to submit timesheet');
        }
    });
}

export function usePendingTimesheets() {
    return useQuery({
        queryKey: ['timesheet', 'approvals'],
        queryFn: async () => {
            const { data } = await apiClient.get<WeeklyTimesheet[]>('/api/timesheet/approvals');
            return data;
        },
    });
}

export function useReviewTimesheet() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status, comment }: { id: string; status: 'APPROVED' | 'REJECTED'; comment?: string }) => {
            const { data } = await apiClient.put<WeeklyTimesheet>(`/api/timesheet/approvals/${id}/review`, { status, comment });
            return data;
        },
        onSuccess: (_, variables) => {
            toast.success(`Timesheet ${variables.status.toLowerCase()}`);
            queryClient.invalidateQueries({ queryKey: ['timesheet', 'approvals'] });
        },
        onError: () => {
            toast.error('Failed to review timesheet');
        }
    });
}

export function useAttendanceSummary(userId: string, startDate: string, endDate: string) {
    return useQuery({
        queryKey: ['timesheet', 'summary', userId, startDate, endDate],
        queryFn: async () => {
            const { data } = await apiClient.get<{
                total_work_hours: number;
                leave_days: number;
                period_start: string;
                period_end: string;
            }>('/api/timesheet/summary', {
                params: { user_id: userId, start_date: startDate, end_date: endDate }
            });
            return data;
        },
        enabled: !!userId && !!startDate && !!endDate,
    });
}

export function useCalendarEvents(start: Date, end: Date, userId?: string) {
    return useQuery({
        queryKey: ['timesheet', 'calendar', start.toISOString(), end.toISOString(), userId],
        queryFn: async () => {
            const { data } = await apiClient.get<any[]>('/api/timesheet/calendar', {
                params: {
                    start: start.toISOString(),
                    end: end.toISOString(),
                    ...(userId ? { user_id: userId } : {})
                }
            });
            // Convert string dates to Date objects for react-big-calendar
            return data.map(event => ({
                ...event,
                start: new Date(event.start),
                end: new Date(event.end)
            }));
        },
        enabled: !!start && !!end,
    });
}
