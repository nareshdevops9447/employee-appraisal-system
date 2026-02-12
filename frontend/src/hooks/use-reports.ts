
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
            // Mocking response for now if endpoint isn't ready
            return {
                total: 100,
                completed: 65,
                in_progress: 25,
                not_started: 10,
                completion_rate: 65
            } as CycleCompletionStats;
            // const { data } = await apiClient.get<CycleCompletionStats>('/api/reports/cycle-completion', { params: { cycle_id: cycleId } });
            // return data;
        }
    });
}

export function useRatingDistribution(cycleId?: string) {
    return useQuery({
        queryKey: ['reports', 'rating-distribution', cycleId],
        queryFn: async () => {
            // Mocking response
            return [
                { rating: 1, count: 2 },
                { rating: 2, count: 5 },
                { rating: 3, count: 18 },
                { rating: 4, count: 45 },
                { rating: 5, count: 12 },
            ] as RatingDistribution[];
            // const { data } = await apiClient.get<RatingDistribution[]>('/api/reports/rating-distribution', { params: { cycle_id: cycleId } });
            // return data;
        }
    });
}

export function useGoalStatsReport() {
    return useQuery({
        queryKey: ['reports', 'goal-stats'],
        queryFn: async () => {
            // Mocking response
            return [
                { status: 'Active', count: 120 },
                { status: 'Completed', count: 45 },
                { status: 'Overdue', count: 12 },
                { status: 'Cancelled', count: 5 },
            ] as GoalStatusStats[];
            // const { data } = await apiClient.get<GoalStatusStats[]>('/api/reports/goal-stats');
            // return data;
        }
    });
}

export function useDepartmentStats() {
    return useQuery({
        queryKey: ['reports', 'department-stats'],
        queryFn: async () => {
            return [
                { department: 'Sales', avg_rating: 4.2, completion_rate: 85 },
                { department: 'Engineering', avg_rating: 3.9, completion_rate: 72 },
                { department: 'Marketing', avg_rating: 4.5, completion_rate: 90 },
                { department: 'HR', avg_rating: 4.1, completion_rate: 95 },
                { department: 'Product', avg_rating: 4.0, completion_rate: 78 },
            ] as DepartmentStats[];
        }
    });
}

export function useAppraisalTrends() {
    return useQuery({
        queryKey: ['reports', 'appraisal-trends'],
        queryFn: async () => {
            return [
                { date: 'Jan', not_started: 80, in_progress: 20, completed: 0 },
                { date: 'Feb', not_started: 60, in_progress: 35, completed: 5 },
                { date: 'Mar', not_started: 40, in_progress: 45, completed: 15 },
                { date: 'Apr', not_started: 20, in_progress: 40, completed: 40 },
                { date: 'May', not_started: 10, in_progress: 30, completed: 60 },
                { date: 'Jun', not_started: 5, in_progress: 20, completed: 75 },
            ] as AppraisalTrend[];
        }
    });
}
