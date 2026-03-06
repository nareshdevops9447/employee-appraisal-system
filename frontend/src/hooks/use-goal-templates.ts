import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";

export interface GoalTemplate {
    id: string;
    cycle_id: string;
    cycle_name?: string | null;
    cycle_type?: string | null;
    title: string;
    description?: string;
    category: "performance" | "development" | "project" | "mission_aligned";
    display_order: number;
    is_active: boolean;
    department_id?: string | null;
    department_name?: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateGoalTemplateData {
    cycle_id: string;
    title: string;
    description?: string;
    category?: "performance" | "development" | "project" | "mission_aligned";
    display_order?: number;
    department_id?: string | null;
}

export function useCycleGoalTemplates(cycleId: string, departmentId?: string) {
    return useQuery({
        queryKey: ["goal-templates", cycleId, departmentId],
        queryFn: async () => {
            if (!cycleId) return [];
            const params: Record<string, string> = {};
            if (departmentId) params.department_id = departmentId;
            const { data } = await apiClient.get<GoalTemplate[]>(
                `/api/goal-templates/cycle/${cycleId}`,
                { params }
            );
            return data;
        },
        enabled: !!cycleId,
    });
}

/** Returns templates relevant to the current user's department + org-wide ones.
 *  Designed for the manager's "Push to Team" flow. */
export function useMyDepartmentTemplates(cycleId: string) {
    return useQuery({
        queryKey: ["goal-templates", "my-department", cycleId],
        queryFn: async () => {
            if (!cycleId) return [];
            const { data } = await apiClient.get<GoalTemplate[]>(
                `/api/goal-templates/my-department/${cycleId}`
            );
            return data;
        },
        enabled: !!cycleId,
    });
}

export function useCreateGoalTemplate(cycleId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateGoalTemplateData) => {
            const { data: newTemplate } = await apiClient.post<GoalTemplate>("/api/goal-templates", data);
            return newTemplate;
        },
        onSuccess: () => {
            toast.success("Goal template created");
            queryClient.invalidateQueries({ queryKey: ["goal-templates", cycleId] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to create goal template");
        },
    });
}

export function useUpdateGoalTemplate(cycleId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<CreateGoalTemplateData> & { is_active?: boolean } }) => {
            const { data: updated } = await apiClient.put(`/api/goal-templates/${id}`, data);
            return updated;
        },
        onSuccess: () => {
            toast.success("Goal template updated");
            queryClient.invalidateQueries({ queryKey: ["goal-templates", cycleId] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to update goal template");
        },
    });
}

export function useDeleteGoalTemplate(cycleId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/api/goal-templates/${id}`);
        },
        onSuccess: () => {
            toast.success("Goal template deleted");
            queryClient.invalidateQueries({ queryKey: ["goal-templates", cycleId] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to delete goal template");
        },
    });
}

export function useUploadGoalTemplates(cycleId: string, departmentId?: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("cycle_id", cycleId);
            if (departmentId) formData.append("department_id", departmentId);

            const response = await apiClient.post("/api/goal-templates/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            return response.data;
        },
        onSuccess: (data) => {
            toast.success(data.message || "Templates uploaded successfully");
            queryClient.invalidateQueries({ queryKey: ["goal-templates", cycleId] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to upload templates");
        },
    });
}

export interface PushTemplatesToTeamData {
    template_ids: string[];
    cycle_id: string;
    employee_id?: string;
}

export function usePushTemplatesToTeam() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: PushTemplatesToTeamData) => {
            const { data: result } = await apiClient.post("/api/goals/push-templates-to-team", data);
            return result;
        },
        onSuccess: (data) => {
            toast.success(data.message || "Templates pushed to team successfully!");
            queryClient.invalidateQueries({ queryKey: ["goals"] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to push templates to team");
        },
    });
}
