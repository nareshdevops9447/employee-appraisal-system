import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";

export interface AttributeTemplate {
    id: string;
    cycle_id: string;
    title: string;
    description?: string;
    display_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateAttributeTemplateData {
    cycle_id: string;
    title: string;
    description?: string;
    display_order?: number;
}

export function useCycleAttributeTemplates(cycleId: string) {
    return useQuery({
        queryKey: ["attribute-templates", cycleId],
        queryFn: async () => {
            if (!cycleId) return [];
            const { data } = await apiClient.get<AttributeTemplate[]>(`/api/attributes/cycle/${cycleId}`);
            return data;
        },
        enabled: !!cycleId,
    });
}

export function useCreateAttributeTemplate(cycleId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateAttributeTemplateData) => {
            const { data: newTemplate } = await apiClient.post<AttributeTemplate>("/api/attributes", data);
            return newTemplate;
        },
        onSuccess: () => {
            toast.success("Attribute template created");
            queryClient.invalidateQueries({ queryKey: ["attribute-templates", cycleId] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to create attribute template");
        },
    });
}

export function useUpdateAttributeTemplate(cycleId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<CreateAttributeTemplateData> & { is_active?: boolean } }) => {
            const { data: updated } = await apiClient.put(`/api/attributes/${id}`, data);
            return updated;
        },
        onSuccess: () => {
            toast.success("Attribute template updated");
            queryClient.invalidateQueries({ queryKey: ["attribute-templates", cycleId] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to update attribute template");
        },
    });
}

export function useDeleteAttributeTemplate(cycleId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/api/attributes/${id}`);
        },
        onSuccess: () => {
            toast.success("Attribute template deleted");
            queryClient.invalidateQueries({ queryKey: ["attribute-templates", cycleId] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to delete attribute template");
        },
    });
}

export function useUploadAttributeTemplates(cycleId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("cycle_id", cycleId);

            // Fetch natively to easily handle multipart/form-data
            const response = await apiClient.post("/api/attributes/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });
            return response.data;
        },
        onSuccess: (data) => {
            toast.success(data.message || "Templates uploaded successfully");
            queryClient.invalidateQueries({ queryKey: ["attribute-templates", cycleId] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to upload templates");
        },
    });
}

export interface EmployeeAttributeRating {
    id: string;
    attribute_template_id: string;
    employee_id: string;
    cycle_id: string;
    self_rating?: number;
    self_comment?: string;
    manager_rating?: number;
    manager_comment?: string;
}

export function useEmployeeAttributeRatings(employeeId: string, cycleId: string) {
    return useQuery({
        queryKey: ["employee-attribute-ratings", employeeId, cycleId],
        queryFn: async () => {
            if (!employeeId || !cycleId) return [];
            const { data } = await apiClient.get<EmployeeAttributeRating[]>(`/api/attributes/employee-ratings/${employeeId}/${cycleId}`);
            return data;
        },
        enabled: !!employeeId && !!cycleId,
    });
}

export interface RateAttributeData {
    attribute_template_id: string;
    employee_id: string;
    cycle_id: string;
    self_rating?: number;
    self_comment?: string;
    manager_rating?: number;
    manager_comment?: string;
}

export function useRateEmployeeAttribute() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: RateAttributeData) => {
            const { data: rating } = await apiClient.post<EmployeeAttributeRating>("/api/attributes/employee-ratings", data);
            return rating;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["employee-attribute-ratings", variables.employee_id, variables.cycle_id] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to save attribute rating");
        },
    });
}
