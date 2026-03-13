"use client";

import { useSession } from "next-auth/react";
import { useMe } from "@/hooks/use-user";
import { useActiveAppraisal, useAppraisals } from "@/hooks/use-appraisals";
import { useGoalStats } from "@/hooks/use-goals";
import { StatCard } from "@/components/shared/stat-card";
import {
    Target,
    ClipboardList,
    CalendarDays,
    AlertCircle,
    CheckCircle2,
    Clock,
    FileText,
    UserCheck,
    ArrowRight,
    Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GoalStatusChart } from "@/components/dashboard/goal-status-chart";
import { TeamStatusOverview } from "@/components/dashboard/team-status-overview";

/* ─── Appraisal lifecycle steps ───────────────────────────────── */
const LIFECYCLE_STEPS = [
    { key: "not_started", label: "Not Started", icon: Clock },
    { key: "goals_pending", label: "Goals Pending", icon: Target },
    { key: "goals_approved", label: "Goals Approved", icon: CheckCircle2 },
    { key: "self_assessment_in_progress", label: "Self Assessment", icon: FileText },
    { key: "manager_review", label: "Manager Review", icon: UserCheck },
    { key: "acknowledgement_pending", label: "Acknowledgement", icon: ClipboardList },
    { key: "completed", label: "Completed", icon: CheckCircle2 },
];

function getStepIndex(status: string): number {
    const idx = LIFECYCLE_STEPS.findIndex(s => s.key === status);
    return idx >= 0 ? idx : 0;
}

export default function DashboardPage() {
    const { data: session } = useSession();
    const { data: activeAppraisal, isLoading: appraisalLoading } = useActiveAppraisal();
    const { data: goalStats, isLoading: goalsLoading } = useGoalStats();
    const { data: me, isLoading: meLoading } = useMe();

    if (appraisalLoading || goalsLoading || meLoading) {
        return <DashboardSkeleton />;
    }

    // Derive display values from the active appraisal
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
        if (appraisalStatus === "goals_approved" || appraisalStatus === "self_assessment_in_progress") {
            pendingActions += 1;
        }
        if (
            session?.user?.role === "manager" &&
            appraisalStatus === "manager_review"
        ) {
            pendingActions += 1;
        }
    }

    const currentStepIndex = getStepIndex(appraisalStatus);

    // Calculate action items dynamically
    const actionItems = [];

    if (hasCycle) {
        if (appraisalStatus === "goals_approved") {
            actionItems.push({
                title: "Start Self-Assessment",
                description: `Your goals are approved. Ready for self evaluation.`,
                href: `/appraisals/${activeAppraisal.id}`,
                urgency: "high",
                icon: FileText,
                color: "text-red-600",
                bg: "bg-red-100",
            });
        } else if (appraisalStatus === "self_assessment_in_progress") {
            actionItems.push({
                title: "Complete Self-Assessment",
                description: cycleEndDate ? `Due before ${cycleEndDate}` : "Finish your evaluation.",
                href: `/appraisals/${activeAppraisal.id}`,
                urgency: "high",
                icon: FileText,
                color: "text-red-600",
                bg: "bg-red-100",
            });
        } else if (appraisalStatus === "not_started" || appraisalStatus === "goals_pending_approval") {
            actionItems.push({
                title: "Finalize Appraisal Goals",
                description: `Set your goals for the ${cycleName} cycle`,
                href: `/goals`,
                urgency: "medium",
                icon: Target,
                color: "text-amber-600",
                bg: "bg-amber-100",
            });
        } else if (appraisalStatus === "acknowledgement_pending") {
             actionItems.push({
                title: "Sign Off on Review",
                description: `Your manager has completed your review.`,
                href: `/appraisals/${activeAppraisal.id}`,
                urgency: "high",
                icon: ClipboardList,
                color: "text-red-600",
                bg: "bg-red-100",
            });
        }
        
        if (session?.user?.role === "manager" && appraisalStatus === "manager_review") {
            actionItems.push({
                title: "Manager Review Required",
                description: "Review your team's self-assessments.",
                href: `/team`,
                urgency: "high",
                icon: UserCheck,
                color: "text-red-600",
                bg: "bg-red-100",
            });
        }
    }

    if (goalStats && goalStats.in_progress > 0) {
        actionItems.push({
            title: "Update Goal Progress",
            description: `You have ${goalStats.in_progress} goals in progress.`,
            href: `/goals`,
            urgency: "low",
            icon: Target,
            color: "text-emerald-600",
            bg: "bg-emerald-100",
        });
    } else if (goalStats && goalStats.total === 0) {
         actionItems.push({
            title: "Set Your Goals",
            description: "You haven't set any goals yet.",
            href: `/goals/new`,
            urgency: "medium",
            icon: Target,
            color: "text-amber-600",
            bg: "bg-amber-100",
        });
    }

    actionItems.push({
        title: "Submit Weekly Timesheet",
        description: "Log your hours for the current week.",
        href: `/timesheet`,
        urgency: "medium",
        icon: Clock,
        color: "text-amber-600",
        bg: "bg-amber-100",
    });

    if (["manager", "hr_admin", "super_admin"].includes(session?.user?.role || "")) {
        actionItems.push({
            title: "Review Team Leave",
            description: "Check pending time-off requests.",
            href: `/leave/team`,
            urgency: "low",
            icon: Users,
            color: "text-emerald-600",
            bg: "bg-emerald-100",
        });
    }

    return (
        <div className="space-y-6">
            {/* Header ... (Keep existing Header, Stat Cards, Stepper, Recent Activity) */}
            <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                        <p className="text-muted-foreground mt-1">
                            Welcome back, {me?.first_name || session?.user?.name || "User"}. Here&apos;s what&apos;s happening.
                        </p>
                    </div>
                    {me?.start_date && (
                        <div className="text-right">
                            <p className="text-sm font-medium">Date of Hire</p>
                            <p className="text-sm text-muted-foreground">
                                {new Date(me.start_date).toLocaleDateString()}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Stat Cards */}
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
                    gradient="from-blue-500/10 via-transparent to-transparent"
                    iconBg="bg-blue-100"
                    iconColor="text-blue-600"
                />
                <StatCard
                    title="My Goals"
                    value={goalStats?.total || 0}
                    description={`${goalStats?.completed || 0} completed, ${goalStats?.in_progress || 0} in progress`}
                    icon={Target}
                    href="/goals"
                    gradient="from-violet-500/10 via-transparent to-transparent"
                    iconBg="bg-violet-100"
                    iconColor="text-violet-600"
                />
                <StatCard
                    title="Appraisal Status"
                    value={hasCycle ? formatStatus(appraisalStatus) : "Not Started"}
                    description={hasCycle ? formatCycleType(cycleType) : "N/A"}
                    icon={ClipboardList}
                    href={hasCycle && activeAppraisal?.id ? `/appraisals/${activeAppraisal.id}` : "/appraisals"}
                    gradient="from-emerald-500/10 via-transparent to-transparent"
                    iconBg="bg-emerald-100"
                    iconColor="text-emerald-600"
                />
                <StatCard
                    title="Pending Actions"
                    value={pendingActions}
                    description="Requires your attention"
                    icon={AlertCircle}
                    href="/appraisals"
                    gradient={pendingActions > 0 ? "from-amber-500/15 via-transparent to-transparent" : "from-gray-500/5 via-transparent to-transparent"}
                    iconBg={pendingActions > 0 ? "bg-amber-100" : "bg-gray-100"}
                    iconColor={pendingActions > 0 ? "text-amber-600" : "text-gray-500"}
                />
            </div>

            {/* Lifecycle Stepper */}
            {hasCycle && (
                <Card className="border-0 shadow-md overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Appraisal Lifecycle</CardTitle>
                        <p className="text-xs text-muted-foreground">Your progress through the current review cycle</p>
                    </CardHeader>
                    <CardContent className="pb-6">
                        <div className="flex items-center justify-between relative">
                            {/* Progress line */}
                            <div className="absolute top-5 left-5 right-5 h-0.5 bg-muted" />
                            <div
                                className="absolute top-5 left-5 h-0.5 bg-primary transition-all duration-500"
                                style={{ width: `calc(${(currentStepIndex / (LIFECYCLE_STEPS.length - 1)) * 100}% - 40px)` }}
                            />

                            {LIFECYCLE_STEPS.map((step, i) => {
                                const StepIcon = step.icon;
                                const isCompleted = i < currentStepIndex;
                                const isCurrent = i === currentStepIndex;
                                return (
                                    <div key={step.key} className="flex flex-col items-center relative z-10">
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 ${isCompleted
                                            ? "bg-primary text-primary-foreground shadow-md"
                                            : isCurrent
                                                ? "bg-primary/20 text-primary ring-2 ring-primary ring-offset-2 shadow-lg"
                                                : "bg-muted text-muted-foreground"
                                            }`}>
                                            <StepIcon className="h-4 w-4" />
                                        </div>
                                        <span className={`text-[10px] mt-2 text-center max-w-[70px] leading-tight ${isCurrent ? "font-semibold text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                                            }`}>
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Content Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Team Status Overview (Manager only) */}
                {["manager", "hr_admin", "super_admin"].includes((session?.user as any)?.role || "") && (
                    <TeamStatusOverview />
                )}

                {/* Recent Activity */}
                <Card className="col-span-1 border-0 shadow-md">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {hasCycle ? (
                            <div className="space-y-3">
                                <Link 
                                    href="/appraisals"
                                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <ClipboardList className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{cycleName}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Status: {formatStatus(appraisalStatus)}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant={appraisalStatus === "not_started" ? "secondary" : "default"}>
                                        {formatCycleType(cycleType)}
                                    </Badge>
                                </Link>
                                {goalStats && goalStats.total > 0 && (
                                    <Link 
                                        href="/goals"
                                        className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Target className="h-4 w-4 text-violet-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">Goals Progress</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {goalStats.completed} of {goalStats.total} goals completed
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-semibold text-primary">
                                            {Math.round(goalStats.average_progress || 0)}%
                                        </span>
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                                    <Clock className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <p className="text-muted-foreground text-sm">No recent activity to show.</p>
                                <p className="text-xs text-muted-foreground mt-1">Activity will appear once an appraisal cycle starts.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Goal Overview Chart */}
                <Card className="col-span-1 border-0 shadow-md flex flex-col">
                    <CardHeader className="pb-2">
                        <CardTitle>My Goal Progress</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 pb-4">
                        <GoalStatusChart stats={goalStats} />
                    </CardContent>
                </Card>

                {/* Action Center */}
                <Card className="col-span-1 border-0 shadow-md flex flex-col">
                    <CardHeader className="pb-3 border-b border-border/50 mb-4">
                        <CardTitle className="flex items-center">
                            Action Center 
                            {actionItems.filter(i => i.urgency === 'high').length > 0 && (
                                <span className="ml-2 flex h-2 w-2 rounded-full bg-red-600" />
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 flex-1 overflow-y-auto max-h-[350px] pr-2">
                        {actionItems.length > 0 ? (
                            actionItems.map((item, idx) => {
                                const Icon = item.icon;
                                return (
                                    <Button key={idx} asChild variant="ghost" className="w-full justify-between group h-auto py-3 px-3 hover:bg-muted/50 border border-transparent hover:border-border transition-all">
                                        <Link href={item.href}>
                                            <div className="flex items-start gap-3 text-left">
                                                <div className={`mt-0.5 h-8 w-8 rounded-full ${item.bg} flex items-center justify-center shrink-0`}>
                                                    <Icon className={`h-4 w-4 ${item.color}`} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm text-foreground">{item.title}</p>
                                                    <p className="text-xs text-muted-foreground font-normal mt-0.5">{item.description}</p>
                                                </div>
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                                        </Link>
                                    </Button>
                                );
                            })
                        ) : (
                            <div className="text-center py-6 text-sm text-muted-foreground my-auto">
                                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                                <p>You&apos;re all caught up!</p>
                            </div>
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
            <Skeleton className="h-24 rounded-lg" />
        </div>
    );
}