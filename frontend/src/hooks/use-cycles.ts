
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";

export interface AppraisalCycle {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: "draft" | "active" | "completed" | "archived";
    type: "annual" | "quarterly" | "probation";
}

export interface CreateCycleData {
    name: string;
    start_date: string;
    end_date: string;
    type: "annual" | "quarterly" | "probation";
    questions: { text: string; type: string; category: string }[];
}

export function useCycles() {
    return useQuery({
        queryKey: ["cycles"],
        queryFn: async () => {
            const { data } = await apiClient.get<AppraisalCycle[]>("/api/cycles");
            return data;
        },
    });
}

export function useCreateCycle() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateCycleData) => {
            const { data: newCycle } = await apiClient.post<AppraisalCycle>("/api/cycles", data);
            return newCycle;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["cycles"] });
            toast.success("Appraisal cycle created successfully");
        },
        onError: (error) => {
            toast.error("Failed to create appraisal cycle");
            console.error(error);
        },
    });
}

export function useActivateCycle() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, criteria }: { id: string; criteria?: any }) => {
            const { data } = await apiClient.post(`/api/cycles/${id}/activate`, criteria);
            return data;
        },
        onSuccess: () => {
            toast.success("Cycle activated successfully");
            queryClient.invalidateQueries({ queryKey: ["cycles"] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to activate cycle");
        },
    });
}

export function useStopCycle() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { data } = await apiClient.post(`/api/cycles/${id}/stop`);
            return data;
        },
        onSuccess: () => {
            toast.success("Cycle stopped (reverted to draft)");
            queryClient.invalidateQueries({ queryKey: ["cycles"] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to stop cycle");
        },
    });
}

export function useUpdateCycle() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<CreateCycleData> }) => {
            const { data: updated } = await apiClient.put(`/api/cycles/${id}`, data);
            return updated;
        },
        onSuccess: () => {
            toast.success("Cycle updated successfully");
            queryClient.invalidateQueries({ queryKey: ["cycles"] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to update cycle");
        },
    });
}
