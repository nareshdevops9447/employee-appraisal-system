
"use client";

import { useSession } from "next-auth/react";
import { useActiveCycle, useAppraisals } from "@/hooks/use-appraisals";
import { useGoalStats } from "@/hooks/use-goals";
import { StatCard } from "@/components/shared/stat-card";
import {
    Target,
    ClipboardList,
    CalendarDays,
    AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
    const { data: session } = useSession();
    const { data: activeCycle, isLoading: cycleLoading } = useActiveCycle();
    const { data: myAppraisals, isLoading: appraisalsLoading } = useAppraisals(activeCycle?.id);
    const { data: goalStats, isLoading: goalsLoading } = useGoalStats();

    const activeAppraisal = myAppraisals?.find(a => a.cycle_id === activeCycle?.id);

    if (cycleLoading || goalsLoading || appraisalsLoading) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome back, {session?.user?.name}. Here&apos;s what&apos;s happening clearly.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Active Cycle"
                    value={activeCycle ? activeCycle.name : "None"}
                    description={activeCycle ? `Ends: ${new Date(activeCycle.end_date).toLocaleDateString()}` : "No active review cycle"}
                    icon={CalendarDays}
                />
                <StatCard
                    title="My Goals"
                    value={goalStats?.total || 0}
                    description={`${goalStats?.completed || 0} completed, ${goalStats?.in_progress || 0} in progress`}
                    icon={Target}
                />
                <StatCard
                    title="Appraisal Status"
                    value={activeAppraisal ? formatStatus(activeAppraisal.status) : "Not Started"}
                    description={activeCycle ? "Current Cycle" : "N/A"}
                    icon={ClipboardList}
                />
                <StatCard
                    title="Pending Actions"
                    value={activeAppraisal && activeAppraisal.status === 'self_assessment' ? 1 : 0}
                    description="Requires your attention"
                    icon={AlertCircle}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-sm">No recent activity to show.</p>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        {activeCycle && (!activeAppraisal || activeAppraisal.status === 'not_started') && (
                            <Button asChild className="w-full justify-start">
                                <Link href="/appraisals">
                                    <ClipboardList className="mr-2 h-4 w-4" /> Start Self-Assessment
                                </Link>
                            </Button>
                        )}
                        {activeAppraisal && activeAppraisal.status === 'self_assessment' && (
                            <Button asChild className="w-full justify-start" variant="default">
                                <Link href={`/appraisals/${activeAppraisal.id}`}>
                                    <ClipboardList className="mr-2 h-4 w-4" /> Continue Assessment
                                </Link>
                            </Button>
                        )}
                        <Button asChild variant="outline" className="w-full justify-start">
                            <Link href="/goals/new">
                                <Target className="mr-2 h-4 w-4" /> Create New Goal
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function formatStatus(status: string) {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-[200px]" />
                <Skeleton className="h-4 w-[300px]" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-lg" />
                ))}
            </div>
        </div>
    )
}
