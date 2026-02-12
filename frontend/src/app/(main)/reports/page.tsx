
"use client";

import { useCycleCompletion, useRatingDistribution, useGoalStatsReport, useAppraisalTrends, useDepartmentStats } from "@/hooks/use-reports";
import { RatingDistributionChart } from "@/components/reports/rating-chart";
import { GoalStatusChart } from "@/components/reports/goal-status-chart";
import { TrendChart } from "@/components/reports/trend-chart";
import { DepartmentChart } from "@/components/reports/department-chart";
import { CompletionChart } from "@/components/reports/completion-chart";
import { TimelineChart } from "@/components/reports/timeline-chart";
import { ExportButton } from "@/components/reports/export-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GoalProgressRing } from "@/components/goals/goal-progress-ring";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { addDays } from "date-fns";
import { useState } from "react";
import { DateRange } from "react-day-picker";

export default function ReportsPage() {
    const { data: completionStats, isLoading: completionLoading } = useCycleCompletion();
    const { data: ratingStats, isLoading: ratingLoading } = useRatingDistribution();
    const { data: goalStats, isLoading: goalStatsLoading } = useGoalStatsReport();
    const { data: trendStats } = useAppraisalTrends();
    const { data: departmentStats } = useDepartmentStats();

    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(2025, 0, 20),
        to: addDays(new Date(2025, 0, 20), 20),
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
                    <p className="text-muted-foreground">Analytics and insights for appraisals and goals.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <DatePickerWithRange date={date} setDate={setDate} />
                    <Select defaultValue="all">
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Department" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            <SelectItem value="Engineering">Engineering</SelectItem>
                            <SelectItem value="Sales">Sales</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select defaultValue="current-cycle">
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Cycle" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="current-cycle">2025 Annual Review</SelectItem>
                            <SelectItem value="2024-review">2024 Annual Review</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cycle Completion</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <div className="text-2xl font-bold">{completionStats?.completion_rate || 0}%</div>
                            <GoalProgressRing progress={completionStats?.completion_rate || 0} size={32} strokeWidth={4} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {completionStats?.completed || 0} of {completionStats?.total || 0} appraisals completed
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">4.2</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            +0.3 from last cycle
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">142</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Organization-wide
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                    <RatingDistributionChart data={ratingStats} />
                    <div className="flex justify-end">
                        <ExportButton data={ratingStats || []} filename="rating_distribution" />
                    </div>
                </div>

                <div className="space-y-4">
                    <GoalStatusChart data={goalStats} />
                    <div className="flex justify-end">
                        <ExportButton data={goalStats || []} filename="goal_status" />
                    </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                    <TrendChart />
                    <div className="flex justify-end">
                        {/* Supply mock data for trend chart export since it uses internal mock currently */}
                        <ExportButton data={[{ month: 'Jan', completed: 4 }, { month: 'Feb', completed: 7 }]} filename="goal_trends" />
                    </div>
                </div>

                <div className="space-y-4">
                    <CompletionChart data={departmentStats} />
                    <div className="flex justify-end">
                        <ExportButton data={departmentStats || []} filename="department_completion" />
                    </div>
                </div>

                <div className="space-y-4">
                    <TimelineChart data={trendStats} />
                    <div className="flex justify-end">
                        <ExportButton data={trendStats || []} filename="appraisal_timeline" />
                    </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                    <DepartmentChart data={departmentStats} />
                    <div className="flex justify-end">
                        <ExportButton data={departmentStats || []} filename="department_performance" />
                    </div>
                </div>
            </div>
        </div>
    );
}
