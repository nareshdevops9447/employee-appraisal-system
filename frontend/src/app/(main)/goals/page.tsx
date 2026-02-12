
"use client";

import { useGoals, useGoalStats } from "@/hooks/use-goals";
import { columns } from "./columns";
import { DataTable } from "@/components/shared/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, LayoutGrid, List as ListIcon } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { GoalFilters } from "@/components/goals/goal-filters";
import { GoalCard } from "@/components/goals/goal-card";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { GoalProgressRing } from "@/components/goals/goal-progress-ring";

import { Suspense } from "react";

export default function GoalsPage() {
    return (
        <Suspense fallback={<GoalsPageSkeleton />}>
            <GoalsContent />
        </Suspense>
    )
}

function GoalsContent() {
    const searchParams = useSearchParams();
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

    // Extract filters from URL
    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || undefined;
    const priority = searchParams.get('priority') || undefined;
    // const title = searchParams.get('title'); // handled by useGoals if implemented in API, or client side

    const { data: goals, isLoading: goalsLoading } = useGoals({ status, category, priority });
    const { data: stats, isLoading: statsLoading } = useGoalStats();

    // Basic client-side filtering for title if API doesn't support it yet
    const filteredGoals = goals?.filter(goal => {
        const titleFilter = searchParams.get('title')?.toLowerCase();
        if (!titleFilter) return true;
        return goal.title.toLowerCase().includes(titleFilter);
    });

    const activeTab = "my-goals"; // TODO: Implement Team Goals tab logic

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight">Goals</h1>
                    <p className="text-muted-foreground">
                        Track and manage your performance objectives.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-muted p-1 rounded-md flex items-center">
                        <Button
                            variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setViewMode('cards')}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setViewMode('table')}
                        >
                            <ListIcon className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button asChild>
                        <Link href="/goals/new">
                            <Plus className="mr-2 h-4 w-4" /> New Goal
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.in_progress || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.completed || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <div className="text-2xl font-bold">{Math.round(stats?.average_progress || 0)}%</div>
                            <GoalProgressRing progress={stats?.average_progress || 0} size={32} strokeWidth={4} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="my-goals" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="my-goals">My Goals</TabsTrigger>
                    <TabsTrigger value="team-goals" disabled>Team Goals (Coming Soon)</TabsTrigger>
                </TabsList>

                <TabsContent value="my-goals" className="space-y-4">
                    <GoalFilters />

                    {goalsLoading ? (
                        <GoalsPageSkeleton />
                    ) : filteredGoals?.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">No goals found matching your filters.</p>
                        </div>
                    ) : viewMode === 'table' ? (
                        <Card>
                            <CardContent className="p-0">
                                <DataTable columns={columns} data={filteredGoals || []} />
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredGoals?.map((goal) => (
                                <GoalCard key={goal.id} goal={goal} />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function GoalsPageSkeleton() {
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
                <Card key={i} className="h-[200px] flex flex-col justify-between">
                    <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                    <CardContent><Skeleton className="h-4 w-full" /></CardContent>
                    <CardContent><Skeleton className="h-10 w-full" /></CardContent>
                </Card>
            ))}
        </div>
    )
}
