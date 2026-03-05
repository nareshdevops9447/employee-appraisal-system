import {
    useQuery,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export interface ManagerGoalReview {
    id: string;
    appraisal_id: string;
    goal_id: string;
    manager_comment: string | null;
    manager_rating: number | null;
    created_at: string;
    updated_at: string;
}

export interface AppraisalReview {
    id: string;
    appraisal_id: string;
    strengths: string | null;
    development_areas: string | null;
    overall_comment: string | null;
    overall_rating: number | null;
    calculated_rating: number | null;
    goals_avg_rating: number | null;
    attributes_avg_rating: number | null;
}

interface ManagerReviewsData {
    goal_reviews: ManagerGoalReview[];
    overall_review: AppraisalReview | null;
}

const KEYS = {
    all: ['manager-reviews'] as const,
    appraisal: (appraisalId: string) => [...KEYS.all, appraisalId] as const,
};

export function useManagerReviews(appraisalId: string) {
    return useQuery({
        queryKey: KEYS.appraisal(appraisalId),
        queryFn: async () => {
            const { data } = await apiClient.get<ManagerReviewsData>(`/api/manager-reviews/appraisal/${appraisalId}`);
            return data;
        },
        enabled: !!appraisalId,
    });
}

// ── Upsert Goal Review ──
interface UpsertGoalReviewPayload {
    appraisal_id: string;
    goal_id: string;
    manager_rating?: number;
    manager_comment?: string;
}

export function useUpsertManagerGoalReview() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: UpsertGoalReviewPayload) => {
            const { data } = await apiClient.post<ManagerGoalReview>('/api/manager-reviews/goal', payload);
            return data;
        },
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: KEYS.appraisal(variables.appraisal_id) });
        }
    });
}

// ── Upsert Overall Review ──
interface UpsertOverallReviewPayload {
    appraisal_id: string;
    overall_rating?: number;
    overall_comment?: string;
    strengths?: string;
    development_areas?: string;
}

export function useUpsertAppraisalReview() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: UpsertOverallReviewPayload) => {
            const { data } = await apiClient.post<AppraisalReview>('/api/manager-reviews/overall', payload);
            return data;
        },
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: KEYS.appraisal(variables.appraisal_id) });
        }
    });
}

// ── Final Submit ──
export function useSubmitManagerReview() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (appraisalId: string) => {
            const { data } = await apiClient.post(`/api/manager-reviews/appraisal/${appraisalId}/submit`);
            return data;
        },
        onSuccess: (_, appraisalId) => {
            qc.invalidateQueries({ queryKey: KEYS.appraisal(appraisalId) });
            qc.invalidateQueries({ queryKey: ['appraisals'] });
        }
    });
}
