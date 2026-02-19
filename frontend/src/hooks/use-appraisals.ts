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

export function useAppraisals(cycleId?: string, scope?: string) {
    const params: Record<string, string> = {};
    if (cycleId) params.cycle_id = cycleId;
    if (scope) params.scope = scope;

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

// ── POST /api/appraisals/self-save (draft) ─────────────────────────

interface SelfSavePayload {
    appraisal_id: string;
    goal_ratings?: Record<string, GoalRating>;
    answers?: Record<string, any>;
}

export function useSelfSave() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (payload: SelfSavePayload) => {
            const { data } = await apiClient.post(
                '/api/appraisals/self-save',
                payload
            );
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.myAppraisal });
        },
    });
}

// ── POST /api/appraisals/self-submit ───────────────────────────────

interface SelfSubmitPayload {
    appraisal_id: string;
    goal_ratings: Record<string, GoalRating>;
    answers?: Record<string, any>;
}

export function useSelfSubmit() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (payload: SelfSubmitPayload) => {
            const { data } = await apiClient.post(
                '/api/appraisals/self-submit',
                payload
            );
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.myAppraisal });
            qc.invalidateQueries({ queryKey: KEYS.active });
        },
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

// ── GET /api/cycles (filter active) ────────────────────────────────

export function useActiveCycle() {
    return useQuery({
        queryKey: KEYS.activeCycle,
        queryFn: async () => {
            const { data } = await apiClient.get<AppraisalCycle[]>('/api/cycles');
            return data.find((c) => c.status === 'active') ?? null;
        },
    });
}