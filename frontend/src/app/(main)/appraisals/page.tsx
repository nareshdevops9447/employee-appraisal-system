"use client";

import { useActiveAppraisal } from "@/hooks/use-appraisals";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { WorkflowStepper } from "@/components/appraisal/WorkflowStepper";
import { GoalApprovalList } from "@/components/appraisal/GoalApprovalList";
import { SelfAssessmentForm } from "@/components/appraisal/SelfAssessmentForm";
import { ManagerReviewForm } from "@/components/appraisal/ManagerReviewForm";
import { FinalSummary } from "@/components/appraisal/FinalSummary";
import { AcknowledgementForm } from "@/components/appraisal/acknowledgement-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, ClipboardList } from "lucide-react";
import Link from "next/link";
import type { AppraisalStatus } from "@/types/appraisal";

export default function AppraisalWorkflowPage() {
    const { data: session } = useSession();
    const searchParams = useSearchParams();
    const employeeIdParam = searchParams?.get('employee_id');

    // If employee_id is provided, we view that employee's active appraisal.
    // Otherwise we view the current user's.
    const { data: appraisalData, isLoading, error } = useActiveAppraisal(employeeIdParam || undefined);

    const userRole = (session?.user as any)?.role || "employee";
    const userId = (session?.user as any)?.id || "";

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
                <AlertCircle className="h-10 w-10 text-destructive" />
                <p className="text-destructive font-medium">
                    Failed to load appraisal data
                </p>
                <p className="text-sm text-muted-foreground">
                    {(error as any)?.message || "Please try again later."}
                </p>
            </div>
        );
    }

    // No active appraisal
    if (!appraisalData || !appraisalData.id) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
                <ClipboardList className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium text-lg">No Active Appraisal</p>
                <p className="text-sm text-muted-foreground max-w-md text-center mb-4">
                    There is no active appraisal cycle for you right now.
                    Your HR administrator will initiate one when it's time.
                </p>
                <Button variant="outline" asChild>
                    <Link href="/appraisals/history">
                        View Appraisal History
                    </Link>
                </Button>
            </div>
        );
    }

    const appraisal = appraisalData;
    const goals = appraisal.goals || [];
    const status = appraisal.status as AppraisalStatus;

    // Determine if user is the employee or the manager for this appraisal
    const isEmployee = String(appraisal.employee_id) === String(userId);
    const isManager = String(appraisal.manager_id) === String(userId);

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {isEmployee ? "My Appraisal" : `Appraisal Review`}
                    </h1>
                    {appraisal.cycle_name && (
                        <p className="text-muted-foreground">
                            {appraisal.cycle_name} — {formatType(appraisal.cycle_type)}
                        </p>
                    )}
                </div>
                {isEmployee && (
                    <Button variant="outline" asChild>
                        <Link href="/appraisals/history">
                            View History
                        </Link>
                    </Button>
                )}
            </div>

            {/* Workflow stepper */}
            <Card>
                <CardContent className="pt-6 pb-4">
                    <WorkflowStepper currentStatus={status} />
                </CardContent>
            </Card>

            {/* Status-dependent content */}
            <StatusView
                status={status}
                appraisal={appraisal}
                goals={goals}
                isEmployee={isEmployee}
                isManager={isManager}
                userRole={userRole}
            />
        </div>
    );
}

// ── Renders the correct component based on status ──────────────────

function StatusView({
    status,
    appraisal,
    goals,
    isEmployee,
    isManager,
    userRole,
}: {
    status: AppraisalStatus;
    appraisal: any;
    goals: any[];
    isEmployee: boolean;
    isManager: boolean;
    userRole: string;
}) {
    switch (status) {
        case "not_started":
            return (
                <Card>
                    <CardContent className="py-12 text-center">
                        <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-1">
                            {isManager ? "Goal Setting In Progress" : "Waiting for Goals"}
                        </h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            {isManager
                                ? "Assign goals from the Team Goals tab, or click below to review and finalize this employee's goals."
                                : "Your manager will assign performance goals for this review cycle. You'll be notified when they're ready."}
                        </p>
                        {isManager && (
                            <div className="mt-6 flex justify-center">
                                <Button asChild>
                                    <Link href={`/appraisals/${appraisal.id}`}>
                                        Review & Finalize Goals
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            );

        case "goals_pending_approval":
            return (
                <GoalApprovalList
                    goals={goals}
                    appraisalId={appraisal.id}
                    userRole={isEmployee ? "employee" : isManager ? "manager" : "hr_admin"}
                />
            );

        case "goals_approved":
        case "self_assessment_in_progress":
            if (isEmployee) {
                return (
                    <SelfAssessmentForm
                        appraisal={appraisal}
                        goals={goals}
                    />
                );
            }
            return (
                <Card>
                    <CardContent className="py-12 text-center">
                        <h3 className="text-lg font-semibold mb-1">
                            Self-Assessment In Progress
                        </h3>
                        <p className="text-muted-foreground">
                            The employee is currently working on their
                            self-assessment. You'll be notified when it's ready
                            for your review.
                        </p>
                    </CardContent>
                </Card>
            );

        case "manager_review":
            if (isManager) {
                return (
                    <ManagerReviewForm
                        appraisal={appraisal}
                        goals={goals}
                    />
                );
            }
            // Employee sees read-only view
            return (
                <Card>
                    <CardContent className="py-12 text-center">
                        <h3 className="text-lg font-semibold mb-1">
                            Awaiting Manager Review
                        </h3>
                        <p className="text-muted-foreground">
                            Your self-assessment has been submitted. Your
                            manager is reviewing your performance. You'll be
                            notified when the review is complete.
                        </p>
                        {appraisal.self_assessment_submitted_at && (
                            <p className="text-xs text-muted-foreground mt-2">
                                Submitted:{" "}
                                {new Date(
                                    appraisal.self_assessment_submitted_at
                                ).toLocaleString()}
                            </p>
                        )}
                    </CardContent>
                </Card>
            );

        case "acknowledgement_pending":
            if (isEmployee) {
                return (
                    <AcknowledgementForm appraisal={appraisal} goals={goals} />
                );
            }
            return (
                <Card>
                    <CardContent className="py-12 text-center">
                        <h3 className="text-lg font-semibold mb-1">
                            Awaiting Employee Sign-Off
                        </h3>
                        <p className="text-muted-foreground">
                            You've submitted the review. Waiting for the employee to acknowledge and sign off.
                        </p>
                    </CardContent>
                </Card>
            );

        case "completed":
            return (
                <FinalSummary appraisal={appraisal} goals={goals} />
            );

        default:
            return (
                <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                        Unknown status: {status}
                    </CardContent>
                </Card>
            );
    }
}

function formatType(type?: string): string {
    const labels: Record<string, string> = {
        annual: "Annual Review",
        mid_year: "Half-Yearly Review",
        probation: "Probation Review",
    };
    return labels[type ?? ""] ?? type ?? "";
}