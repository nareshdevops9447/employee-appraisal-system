"use client";

import { useSession } from "next-auth/react";
import { useActiveAppraisal, useAppraisals } from "@/hooks/use-appraisals";
import { useGoalStats } from "@/hooks/use-goals";
import { StatCard } from "@/components/shared/stat-card";
import {
    Target,
    ClipboardList,
    CalendarDays,
    AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
    const { data: session } = useSession();
    const { data: activeAppraisal, isLoading: appraisalLoading } = useActiveAppraisal();
    const { data: goalStats, isLoading: goalsLoading } = useGoalStats();

    if (appraisalLoading || goalsLoading) {
        return <DashboardSkeleton />;
    }

    // Derive display values from the active appraisal (which now includes cycle details)
    const hasCycle = !!activeAppraisal;
    const cycleName = activeAppraisal?.cycle_name || "None";
    const cycleType = activeAppraisal?.cycle_type || null;
    const cycleEndDate = activeAppraisal?.cycle_end_date
        ? new Date(activeAppraisal.cycle_end_date).toLocaleDateString()
        : null;
    const appraisalStatus = activeAppraisal?.status || "not_started";

    // Count pending actions
    let pendingActions = 0;
    if (activeAppraisal) {
        if (appraisalStatus === "not_started" || appraisalStatus === "self_assessment") {
            pendingActions += 1; // Self-assessment due
        }
        if (
            session?.user?.role === "manager" &&
            appraisalStatus === "manager_review"
        ) {
            pendingActions += 1; // Manager review due
        }
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
                    value={cycleName}
                    description={
                        hasCycle
                            ? `${formatCycleType(cycleType)} · Ends: ${cycleEndDate}`
                            : "No active review cycle"
                    }
                    icon={CalendarDays}
                    href={hasCycle && activeAppraisal?.id ? `/appraisals/${activeAppraisal.id}` : "/appraisals"}
                />
                <StatCard
                    title="My Goals"
                    value={goalStats?.total || 0}
                    description={`${goalStats?.completed || 0} completed, ${goalStats?.in_progress || 0} in progress`}
                    icon={Target}
                    href="/goals"
                />
                <StatCard
                    title="Appraisal Status"
                    value={hasCycle ? formatStatus(appraisalStatus) : "Not Started"}
                    description={hasCycle ? formatCycleType(cycleType) : "N/A"}
                    icon={ClipboardList}
                    href={hasCycle && activeAppraisal?.id ? `/appraisals/${activeAppraisal.id}` : "/appraisals"}
                />
                <StatCard
                    title="Pending Actions"
                    value={pendingActions}
                    description="Requires your attention"
                    icon={AlertCircle}
                    href="/appraisals"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {hasCycle ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between rounded-md border p-3">
                                    <div>
                                        <p className="font-medium text-sm">{cycleName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Status: {formatStatus(appraisalStatus)}
                                        </p>
                                    </div>
                                    <Badge variant={appraisalStatus === "not_started" ? "secondary" : "default"}>
                                        {formatCycleType(cycleType)}
                                    </Badge>
                                </div>
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm">
                                No recent activity to show.
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        {hasCycle && appraisalStatus === "not_started" && (
                            <Button asChild className="w-full justify-start">
                                <Link href={`/appraisals/${activeAppraisal.id}`}>
                                    <ClipboardList className="mr-2 h-4 w-4" /> Start Self-Assessment
                                </Link>
                            </Button>
                        )}
                        {hasCycle && appraisalStatus === "self_assessment" && (
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
                        {session?.user?.role === "manager" && (
                            <Button asChild variant="outline" className="w-full justify-start">
                                <Link href="/team">
                                    <Target className="mr-2 h-4 w-4" /> Manage Team Goals
                                </Link>
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function formatStatus(status: string) {
    return status
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function formatCycleType(cycleType: string | null) {
    if (!cycleType) return "";
    const labels: Record<string, string> = {
        annual: "Annual",
        mid_year: "Half Yearly",
        probation: "Probation",
    };
    return labels[cycleType] || cycleType;
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
    );
}