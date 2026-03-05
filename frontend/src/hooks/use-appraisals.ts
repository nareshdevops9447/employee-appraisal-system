/**
 * React Query hooks for the appraisal workflow.
 *
 * Hooks:
 *   useMyAppraisal()       → GET /api/appraisals/me
 *   useActiveAppraisal()   → GET /api/appraisals/active
 *   useAppraisals()        → GET /api/appraisals
 *   useAppraisal(id)       → GET /api/appraisals/:id
 *   useSelfSave()          → POST /api/appraisals/self-save
 *   useSelfSubmit()        → POST /api/appraisals/self-submit
 *   useManagerSubmit()     → POST /api/appraisals/manager-submit
 *   useActiveCycle()       → GET /api/cycles (filter active)
 */

import {
    useQuery,
    useMutation,
    useQueryClient,
    UseQueryOptions,
} from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import type { Appraisal, AppraisalCycle, GoalRating } from '@/types/appraisal';

// ── Keys ───────────────────────────────────────────────────────────

const KEYS = {
    myAppraisal: ['appraisals', 'me'] as const,
    active: ['appraisals', 'active'] as const,
    list: (params?: Record<string, string>) =>
        ['appraisals', params ?? {}] as const,
    detail: (id: string) => ['appraisals', id] as const,
    activeCycle: ['cycles', 'active'] as const,
};

// ── GET /api/appraisals/me ─────────────────────────────────────────

export function useMyAppraisal() {
    return useQuery({
        queryKey: KEYS.myAppraisal,
        queryFn: async () => {
            const { data } = await apiClient.get<Appraisal>('/api/appraisals/me');
            return data;
        },
        staleTime: 0,
        refetchOnWindowFocus: true,
    });
}

// ── GET /api/appraisals/active ─────────────────────────────────────

export function useActiveAppraisal(employeeId?: string) {
    return useQuery({
        queryKey: [...KEYS.active, employeeId],
        queryFn: async () => {
            const params = employeeId ? { employee_id: employeeId } : {};
            const { data } = await apiClient.get<Appraisal | null>(
                '/api/appraisals/active',
                { params }
            );
            return data;
        },
        staleTime: 0,
        refetchOnWindowFocus: true,
    });
}

// ── GET /api/appraisals ────────────────────────────────────────────

export function useAppraisals(cycleId?: string, scope?: string, status?: string) {
    const params: Record<string, string> = {};
    if (cycleId) params.cycle_id = cycleId;
    if (scope) params.scope = scope;
    if (status) params.status = status;

    return useQuery({
        queryKey: KEYS.list(params),
        queryFn: async () => {
            const { data } = await apiClient.get<Appraisal[]>(
                '/api/appraisals',
                { params }
            );
            return data;
        },
        staleTime: 0,
        refetchOnWindowFocus: true,
    });
}

// ── GET /api/appraisals/:id ────────────────────────────────────────

export function useAppraisal(id: string) {
    return useQuery({
        queryKey: KEYS.detail(id),
        queryFn: async () => {
            const { data } = await apiClient.get<Appraisal>(
                `/api/appraisals/${id}`
            );
            return data;
        },
        enabled: !!id,
        staleTime: 0,
        refetchOnWindowFocus: true,
    });
}



// ── POST /api/appraisals/manager-submit ────────────────────────────

interface ManagerSubmitPayload {
    appraisal_id: string;
    goal_ratings?: Record<string, GoalRating>;
    answers?: Record<string, any>;
    overall_rating: number;
    feedback?: string;
}

export function useManagerSubmit() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (payload: ManagerSubmitPayload) => {
            const { data } = await apiClient.post(
                '/api/appraisals/manager-submit',
                payload
            );
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['appraisals'] });
        },
    });
}

// ── POST /api/appraisals/:id/finalize-goals ────────────────────────

export function useFinalizeGoals() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { data } = await apiClient.post(
                `/api/appraisals/${id}/finalize-goals`
            );
            return data;
        },
        onSuccess: () => {
            toast.success('Goals finalized successfully. The appraisal will now move to self-assessment.');
            qc.invalidateQueries({ queryKey: ['appraisals'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to finalize goals.');
        }
    });
}

// ── POST /api/appraisals/:id/calibrate ─────────────────────────────

interface CalibratePayload {
    appraisalId: string;
    overall_rating: number;
    calibration_notes?: string;
}

export function useCalibrateAppraisal() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async ({ appraisalId, ...payload }: CalibratePayload) => {
            const { data } = await apiClient.post(
                `/api/appraisals/${appraisalId}/calibrate`,
                payload,
            );
            return data;
        },
        onSuccess: () => {
            toast.success('Appraisal calibrated and moved to sign-off.');
            qc.invalidateQueries({ queryKey: ['appraisals'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Calibration failed.');
        },
    });
}

// ── GET /api/cycles (filter active) ────────────────────────────────

export function useAllActiveCycles() {
    return useQuery({
        queryKey: ['cycles', 'all-active'],
        queryFn: async () => {
            const { data } = await apiClient.get<AppraisalCycle[]>('/api/cycles');
            return data.filter((c) => c.status === 'active');
        },
    });
}

export function useActiveCycle() {
    return useQuery({
        queryKey: KEYS.activeCycle,
        queryFn: async () => {
            const { data } = await apiClient.get<AppraisalCycle[]>('/api/cycles');
            const active = data.filter((c) => c.status === 'active');
            // Return the active cycle. If multiple are active, return the first one.
            return active[0] ?? null;
        },
    });
}