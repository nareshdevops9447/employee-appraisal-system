import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";

export interface AppraisalAppeal {
    id: string;
    appraisal_id: string;
    employee_reason: string;
    status: 'pending' | 'under_review' | 'upheld' | 'overturned';
    reviewed_by: string | null;
    review_notes: string | null;
    new_overall_rating: number | null;
    reviewed_at: string | null;
    created_at: string;
    updated_at: string;
}

/** Appeal enriched with employee + cycle info (from GET /api/appraisals/appeals) */
export interface EnrichedAppraisalAppeal extends AppraisalAppeal {
    employee_name: string;
    employee_email: string;
    appraisal_status: string;
    overall_rating: number | null;
    cycle_name: string;
}

// ── List All Appeals (HR) ────────────────────────────────────────

export function useAppeals(status?: string) {
    return useQuery({
        queryKey: ['appraisals', 'appeals', status ?? 'all'],
        queryFn: async () => {
            const params: Record<string, string> = {};
            if (status) params.status = status;
            const { data } = await apiClient.get<EnrichedAppraisalAppeal[]>(
                '/api/appraisals/appeals',
                { params },
            );
            return data;
        },
        staleTime: 0,
        refetchOnWindowFocus: true,
    });
}

// ── Raise Appeal (employee) ──────────────────────────────────────

interface RaiseAppealPayload {
    appraisalId: string;
    reason: string;
}

export function useRaiseAppeal() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ appraisalId, reason }: RaiseAppealPayload) => {
            const { data } = await apiClient.post<{ message: string; appeal: AppraisalAppeal }>(
                `/api/appraisals/${appraisalId}/appeal`,
                { reason },
            );
            return data;
        },
        onSuccess: (_, { appraisalId }) => {
            toast.success("Appeal raised. HR will be in touch.");
            qc.invalidateQueries({ queryKey: ["appraisals", appraisalId] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to raise appeal.");
        },
    });
}

// ── Review Appeal (HR) ──────────────────────────────────────────

interface ReviewAppealPayload {
    appealId: string;
    status: 'under_review' | 'upheld' | 'overturned';
    review_notes?: string;
    new_overall_rating?: number;
}

export function useReviewAppeal() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ appealId, ...payload }: ReviewAppealPayload) => {
            const { data } = await apiClient.put<{ message: string; appeal: AppraisalAppeal }>(
                `/api/appraisals/appeals/${appealId}/review`,
                payload,
            );
            return data;
        },
        onSuccess: () => {
            toast.success("Appeal updated.");
            qc.invalidateQueries({ queryKey: ["appraisals"] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to update appeal.");
        },
    });
}
