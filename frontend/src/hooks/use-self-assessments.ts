import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Appraisal } from "@/types/appraisal";

export interface SelfAssessment {
    id: string;
    appraisal_id: string;
    goal_id: string;
    employee_comment?: string;
    employee_rating?: number;
    created_at: string;
    updated_at: string;
}

export interface UpsertSelfAssessmentData {
    appraisal_id: string;
    goal_id: string;
    employee_comment?: string;
    employee_rating?: number;
}

export function useAppraisalSelfAssessments(appraisalId: string) {
    return useQuery({
        queryKey: ["self-assessments", appraisalId],
        queryFn: async () => {
            if (!appraisalId) return [];
            const { data } = await apiClient.get<SelfAssessment[]>(`/api/self-assessments/appraisal/${appraisalId}`);
            return data;
        },
        enabled: !!appraisalId,
    });
}

export function useUpsertSelfAssessment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: UpsertSelfAssessmentData) => {
            const { data: assessment } = await apiClient.post<SelfAssessment>("/api/self-assessments", data);
            return assessment;
        },
        onSuccess: (_, variables) => {
            toast.success("Self-assessment saved");
            queryClient.invalidateQueries({ queryKey: ["self-assessments", variables.appraisal_id] });
            queryClient.invalidateQueries({ queryKey: ["appraisal", variables.appraisal_id] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to save self-assessment");
        },
    });
}

export function useSubmitSelfAssessment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (appraisalId: string) => {
            const { data } = await apiClient.post<{ message: string; appraisal: Appraisal }>(`/api/self-assessments/appraisal/${appraisalId}/submit`);
            return data;
        },
        onSuccess: (data) => {
            toast.success("Self-assessment submitted successfully!");
            queryClient.invalidateQueries({ queryKey: ["appraisal", data.appraisal.id] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to submit self-assessment");
        },
    });
}
