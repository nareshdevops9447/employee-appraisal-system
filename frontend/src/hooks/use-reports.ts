"use client";

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export interface CycleCompletionStats {
    total: number;
    completed: number;
    in_progress: number;
    not_started: number;
    completion_rate: number;
}

export interface RatingDistribution {
    rating: number;
    count: number;
}

export interface GoalStatusStats {
    status: string;
    count: number;
}

export interface DepartmentStats {
    department: string;
    avg_rating: number;
    completion_rate: number;
}

export interface AppraisalTrend {
    date: string;
    not_started: number;
    in_progress: number;
    completed: number;
}

export function useCycleCompletion(cycleId?: string) {
    return useQuery({
        queryKey: ['reports', 'cycle-completion', cycleId],
        queryFn: async () => {
            const { data } = await apiClient.get<CycleCompletionStats>('/api/reports/cycle-completion', { params: { cycle_id: cycleId } });
            return data;
        },
    });
}

export function useRatingDistribution(cycleId?: string) {
    return useQuery({
        queryKey: ['reports', 'rating-distribution', cycleId],
        queryFn: async () => {
            const { data } = await apiClient.get<RatingDistribution[]>('/api/reports/rating-distribution', { params: { cycle_id: cycleId } });
            return data;
        },
    });
}

export function useGoalStatsReport() {
    return useQuery({
        queryKey: ['reports', 'goal-stats'],
        queryFn: async () => {
            const { data } = await apiClient.get<GoalStatusStats[]>('/api/reports/goal-stats');
            return data;
        },
    });
}

export function useDepartmentStats() {
    return useQuery({
        queryKey: ['reports', 'department-stats'],
        queryFn: async () => {
            const { data } = await apiClient.get<DepartmentStats[]>('/api/reports/department-stats');
            return data;
        },
    });
}

export function useAppraisalTrends() {
    return useQuery({
        queryKey: ['reports', 'appraisal-trends'],
        queryFn: async () => {
            const { data } = await apiClient.get<AppraisalTrend[]>('/api/reports/appraisal-trends');
            return data;
        },
    });
}
