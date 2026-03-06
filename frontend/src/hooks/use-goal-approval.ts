import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";

/**
 * Fetch pending goals for the current user (goals assigned to them pending approval).
 * Updated to include audit and version hooks.
 */
export function usePendingGoals(employeeId?: string) {
    return useQuery({
        queryKey: ["pending-goals", employeeId],
        queryFn: async () => {
            const params: Record<string, string> = {};
            if (employeeId) params.employee_id = employeeId;
            const { data } = await apiClient.get("/api/goals/readiness", { params });
            return data;
        },
        enabled: !!employeeId,
        staleTime: 10 * 1000,
    });
}

/**
 * Approve a goal assigned to the current user.
 */
export function useApproveGoal() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ goalId, comment }: { goalId: string; comment?: string }) => {
            const { data } = await apiClient.post(`/api/goals/${goalId}/approve`, { comment });
            return data;
        },
        onSuccess: () => {
            toast.success("Goal approved");
            queryClient.invalidateQueries({ queryKey: ["pending-goals"] });
            queryClient.invalidateQueries({ queryKey: ["appraisal"] });
            queryClient.invalidateQueries({ queryKey: ["goals"] });
        },
        onError: () => {
            toast.error("Failed to approve goal");
        },
    });
}

/**
 * Reject a goal assigned to the current user.
 */
export function useRejectGoal() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ goalId, reason }: { goalId: string; reason: string }) => {
            const { data } = await apiClient.post(`/api/goals/${goalId}/reject`, { reason });
            return data;
        },
        onSuccess: () => {
            toast.success("Goal rejected — manager will be notified");
            queryClient.invalidateQueries({ queryKey: ["pending-goals"] });
            queryClient.invalidateQueries({ queryKey: ["appraisal"] });
            queryClient.invalidateQueries({ queryKey: ["goals"] });
        },
        onError: () => {
            toast.error("Failed to reject goal");
        },
    });
}

export interface GoalAuditLog {
    id: string;
    goal_id: string;
    old_status: string | null;
    new_status: string | null;
    changed_by_user_id: string;
    changed_by_role: string;
    version_number: number;
    timestamp: string;
}

/**
 * Fetch audit trail for a specific goal.
 */
export function useGoalAudit(goalId: string) {
    return useQuery({
        queryKey: ["goal-audit", goalId],
        queryFn: async () => {
            const { data } = await apiClient.get<GoalAuditLog[]>(`/api/goals/${goalId}/audit`);
            return data;
        },
        enabled: !!goalId,
    });
}

export interface GoalVersion {
    id: string;
    goal_id: string;
    version_number: number;
    title: string;
    description: string;
    category: string;
    priority: string;
    start_date: string | null;
    target_date: string | null;
    approval_status: string;
    rejected_reason: string | null;
    created_at: string;
    created_by: string;
}

/**
 * Fetch version history for a specific goal.
 */
export function useGoalVersions(goalId: string) {
    return useQuery({
        queryKey: ["goal-versions", goalId],
        queryFn: async () => {
            const { data } = await apiClient.get<GoalVersion[]>(`/api/goals/${goalId}/versions`);
            return data;
        },
        enabled: !!goalId,
    });
}

/**
 * Submit a goal for approval.
 */
export function useSubmitGoal() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (goalId: string) => {
            const { data } = await apiClient.post(`/api/goals/${goalId}/submit`);
            return data;
        },
        onSuccess: () => {
            toast.success("Goal submitted for approval");
            queryClient.invalidateQueries({ queryKey: ["pending-goals"] });
            queryClient.invalidateQueries({ queryKey: ["appraisal"] });
            queryClient.invalidateQueries({ queryKey: ["goals"] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to submit goal");
        },
    });
}

/**
 * Submit all draft goals for a specific employee. (Bulk submit)
 */
export function useBulkSubmitGoals() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (employeeId: string) => {
            const { data } = await apiClient.post('/api/goals/bulk/submit', { employee_id: employeeId });
            return data;
        },
        onSuccess: (data) => {
            if (data.submitted > 0) {
                toast.success(data.message);
            } else {
                toast.info("No goals needed submission");
            }
            queryClient.invalidateQueries({ queryKey: ["pending-goals"] });
            queryClient.invalidateQueries({ queryKey: ["appraisal"] });
            queryClient.invalidateQueries({ queryKey: ["goals"] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || "Failed to bulk submit goals");
        },
    });
}
