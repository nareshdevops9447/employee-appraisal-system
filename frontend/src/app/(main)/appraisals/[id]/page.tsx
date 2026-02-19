"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAppraisal } from "@/hooks/use-appraisals";
import { useApproveGoal, useRejectGoal } from "@/hooks/use-goal-approval";
import { useSession } from "next-auth/react";
import { WorkflowStepper } from "@/components/appraisal/WorkflowStepper";
import { SelfAssessmentForm } from "@/components/appraisal/SelfAssessmentForm";
import { ManagerReviewForm } from "@/components/appraisal/ManagerReviewForm";
import { AcknowledgementForm } from "@/components/appraisal/acknowledgement-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Info, CheckCircle2, XCircle, Target, Clock, AlertTriangle } from "lucide-react";
import { GoalForAssessment } from "@/types/appraisal";

function formatStatus(status: string) {
    return status
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

function statusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
    switch (status) {
        case "completed":
        case "acknowledged":
            return "default";
        case "self_assessment":
        case "manager_review":
            return "secondary";
        default:
            return "outline";
    }
}

// ── Goal Approval Card ──
function GoalApprovalCard({
    goal,
    onApprove,
    onReject,
    isLoading,
}: {
    goal: GoalForAssessment;
    onApprove: () => void;
    onReject: (reason: string) => void;
    isLoading: boolean;
}) {
    const [rejectMode, setRejectMode] = useState(false);
    const [reason, setReason] = useState("");

    return (
        <Card className="border-l-4 border-l-amber-400">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-base">{goal.title}</CardTitle>
                        {goal.description && (
                            <CardDescription className="mt-1">{goal.description}</CardDescription>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Badge variant="outline">{goal.category}</Badge>
                        <Badge variant={goal.priority === 'high' || goal.priority === 'critical' ? 'destructive' : 'secondary'}>
                            {goal.priority}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex gap-2 text-sm text-muted-foreground">
                    <span>Target: {goal.target_date ? new Date(goal.target_date).toLocaleDateString() : 'N/A'}</span>
                </div>

                {goal.key_results && goal.key_results.length > 0 && (
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Key Results:</p>
                        {goal.key_results.map((kr) => (
                            <p key={kr.id} className="text-sm ml-2">• {kr.title}</p>
                        ))}
                    </div>
                )}

                {rejectMode ? (
                    <div className="space-y-2">
                        <Textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Explain why you're rejecting this goal..."
                            rows={2}
                        />
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="destructive"
                                disabled={!reason.trim() || isLoading}
                                onClick={() => onReject(reason)}
                            >
                                Confirm Reject
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setRejectMode(false)}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <Button size="sm" disabled={isLoading} onClick={onApprove}>
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Approve
                        </Button>
                        <Button size="sm" variant="outline" disabled={isLoading} onClick={() => setRejectMode(true)}>
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function AppraisalDetailPage() {
    const params = useParams();
    const id = (params?.id as string) || '';
    const { data: session } = useSession();
    const { data: appraisal, isLoading } = useAppraisal(id);
    const approveGoal = useApproveGoal();
    const rejectGoal = useRejectGoal();

    if (isLoading) {
        return <AppraisalDetailSkeleton />;
    }

    if (!appraisal) {
        return <div>Appraisal not found</div>;
    }

    const isEmployee = session?.user?.id === appraisal.employee_id;
    const isManager = session?.user?.id === appraisal.manager_id;

    // Goal readiness
    const readiness = appraisal.goal_readiness;
    const goalsReady = readiness?.ready || false;
    const pendingGoals = readiness?.goals?.filter((g: GoalForAssessment) => g.approval_status === 'pending_approval') || [];
    const approvedGoals = readiness?.goals?.filter((g: GoalForAssessment) => g.approval_status === 'approved') || [];
    const hasAnyGoals = (readiness?.total || 0) > 0;

    // Determine what to show in the main action area
    let ActionComponent: any = null;
    let actionTitle = "";
    let showGoalApproval = false;
    let showWaitingForGoals = false;

    if (appraisal.status === 'not_started') {
        if (isEmployee) {
            if (pendingGoals.length > 0) {
                // Employee has goals pending their approval
                showGoalApproval = true;
                actionTitle = "Review & Approve Goals";
            } else if (goalsReady) {
                // All goals approved — can start self-assessment
                ActionComponent = SelfAssessmentForm;
                actionTitle = "Start Self Assessment";
            } else {
                // No goals yet or some are draft
                showWaitingForGoals = true;
                actionTitle = "Waiting for Goals";
            }
        } else if (isManager) {
            actionTitle = hasAnyGoals
                ? `Goal Setting (${approvedGoals.length}/${readiness?.total || 0} approved)`
                : "Assign Goals to Employee";
        } else {
            actionTitle = "Goal Setting In Progress";
        }
    } else if (appraisal.status === 'self_assessment') {
        if (isEmployee) {
            ActionComponent = SelfAssessmentForm;
            actionTitle = "Complete Self Assessment";
        } else {
            actionTitle = "Waiting for Employee";
        }
    } else if (appraisal.status === 'manager_review') {
        if (isManager) {
            ActionComponent = ManagerReviewForm;
            actionTitle = "Complete Manager Review";
        } else {
            actionTitle = "Waiting for Manager";
        }
    } else if (appraisal.status === 'meeting_scheduled' || appraisal.status === 'meeting_completed') {
        if (isEmployee) {
            ActionComponent = AcknowledgementForm;
            actionTitle = "Acknowledge Review";
        } else {
            actionTitle = "Waiting for Acknowledgement";
        }
    } else if (appraisal.status === 'acknowledged' || appraisal.status === 'completed') {
        actionTitle = "Review Completed";
    }

    // Use flat fields from API response
    const cycleName = appraisal.cycle_name || 'Unknown Cycle';
    const cycleStartDate = appraisal.cycle_start_date
        ? new Date(appraisal.cycle_start_date).toLocaleDateString()
        : '-';
    const cycleEndDate = appraisal.cycle_end_date
        ? new Date(appraisal.cycle_end_date).toLocaleDateString()
        : '-';
    const selfDeadline = appraisal.self_assessment_deadline
        ? new Date(appraisal.self_assessment_deadline).toLocaleDateString()
        : null;
    const managerDeadline = appraisal.manager_review_deadline
        ? new Date(appraisal.manager_review_deadline).toLocaleDateString()
        : null;

    const employeeName = appraisal.employee_name || appraisal.employee_id;
    const employeeEmail = appraisal.employee_email || '';
    const managerName = appraisal.manager_name || appraisal.manager_id || 'N/A';
    const managerEmail = appraisal.manager_email || '';

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Performance Review</h1>
                        <p className="text-muted-foreground">Cycle: {cycleName}</p>
                    </div>
                    <Badge variant={statusBadgeVariant(appraisal.status)} className="text-sm px-3 py-1">
                        {formatStatus(appraisal.status)}
                    </Badge>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <WorkflowStepper currentStatus={appraisal.status} />
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>{actionTitle}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Goal Approval UI for employee */}
                        {showGoalApproval && (
                            <div className="space-y-4">
                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Goals Pending Your Approval</AlertTitle>
                                    <AlertDescription>
                                        Your manager has assigned {pendingGoals.length} goal(s).
                                        Review and approve them to start your self-assessment.
                                    </AlertDescription>
                                </Alert>
                                {pendingGoals.map((goal: GoalForAssessment) => (
                                    <GoalApprovalCard
                                        key={goal.id}
                                        goal={goal}
                                        isLoading={approveGoal.isPending || rejectGoal.isPending}
                                        onApprove={() => approveGoal.mutate(goal.id)}
                                        onReject={(reason) => rejectGoal.mutate({ goalId: goal.id, reason })}
                                    />
                                ))}
                                {approvedGoals.length > 0 && (
                                    <div className="pt-4 border-t">
                                        <p className="text-sm font-medium text-green-600 mb-2">
                                            ✓ {approvedGoals.length} goal(s) already approved
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Waiting for goals */}
                        {showWaitingForGoals && (
                            <Alert>
                                <Clock className="h-4 w-4" />
                                <AlertTitle>Waiting for Goals</AlertTitle>
                                <AlertDescription>
                                    Your manager needs to assign goals to you before you can start the self-assessment.
                                    You will be notified when goals are ready for your review.
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Manager view: assign goals prompt */}
                        {appraisal.status === 'not_started' && isManager && !hasAnyGoals && (
                            <Alert>
                                <Target className="h-4 w-4" />
                                <AlertTitle>Assign Goals</AlertTitle>
                                <AlertDescription>
                                    Go to the Goals page to create and assign goals to this employee.
                                    Once all goals are approved, the employee can begin their self-assessment.
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Manager view: goal progress */}
                        {appraisal.status === 'not_started' && isManager && hasAnyGoals && (
                            <div className="space-y-3">
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertTitle>Goal Setting Progress</AlertTitle>
                                    <AlertDescription>
                                        {readiness?.approved || 0} of {readiness?.total || 0} goals approved.
                                        {(readiness?.pending || 0) > 0 && ` ${readiness?.pending} pending employee approval.`}
                                        {(readiness?.rejected || 0) > 0 && ` ${readiness?.rejected} rejected.`}
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}

                        {/* Action form (SelfAssessment, ManagerReview, Acknowledgement) */}
                        {ActionComponent && <ActionComponent appraisal={appraisal} />}

                        {/* Fallback status message for non-participants */}
                        {!ActionComponent && !showGoalApproval && !showWaitingForGoals
                            && !(appraisal.status === 'not_started' && isManager) && (
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertTitle>Status</AlertTitle>
                                    <AlertDescription>
                                        {(appraisal.status === 'not_started' || appraisal.status === 'self_assessment') && !isEmployee && "The employee is currently completing their self-assessment."}
                                        {appraisal.status === 'manager_review' && !isManager && "The manager is currently reviewing the assessment."}
                                        {(appraisal.status === 'completed' || appraisal.status === 'acknowledged') && "This appraisal has been completed."}
                                        {(appraisal.status === 'meeting_scheduled' || appraisal.status === 'meeting_completed') && !isEmployee && "Waiting for the employee to acknowledge."}
                                    </AlertDescription>
                                </Alert>
                            )}

                        {/* Read-only completed sections */}
                        {!['not_started', 'self_assessment'].includes(appraisal.status) && appraisal.self_assessment && (
                            <div className="mt-8 pt-8 border-t">
                                <h3 className="font-semibold mb-2">Self Assessment Summary</h3>
                                <div className="space-y-3">
                                    {typeof appraisal.self_assessment === 'object' && !Array.isArray(appraisal.self_assessment)
                                        ? Object.entries(appraisal.self_assessment).map(([goalId, data]: [string, any]) => {
                                            const goal = readiness?.goals?.find((g: GoalForAssessment) => g.id === goalId);
                                            return (
                                                <div key={goalId} className="bg-muted/50 p-3 rounded-md">
                                                    <p className="font-medium text-sm">{goal?.title || goalId}</p>
                                                    <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                                                        <span>Rating: {data.self_rating}/5</span>
                                                        <span>Progress: {data.progress}%</span>
                                                    </div>
                                                    {data.comments && <p className="text-sm mt-1">{data.comments}</p>}
                                                </div>
                                            );
                                        })
                                        : <div className="bg-muted/50 p-4 rounded-md whitespace-pre-wrap">
                                            {String(appraisal.self_assessment)}
                                        </div>
                                    }
                                </div>
                            </div>
                        )}

                        {(appraisal.status === 'completed' || appraisal.status === 'acknowledged') && appraisal.manager_assessment && (
                            <div className="mt-8 pt-8 border-t">
                                <h3 className="font-semibold mb-2">Manager Review</h3>
                                <div className="bg-muted/50 p-4 rounded-md space-y-2">
                                    {appraisal.overall_rating && (
                                        <div className="font-medium">Rating: {appraisal.overall_rating} / 5</div>
                                    )}
                                    <div className="whitespace-pre-wrap">
                                        {typeof appraisal.manager_assessment === 'object'
                                            ? JSON.stringify(appraisal.manager_assessment, null, 2)
                                            : appraisal.manager_assessment || "No comments."}
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Participants</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Employee</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                                        {employeeName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{employeeName}</p>
                                        {employeeEmail && <p className="text-xs text-muted-foreground">{employeeEmail}</p>}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Manager</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                                        {managerName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{managerName}</p>
                                        {managerEmail && <p className="text-xs text-muted-foreground">{managerEmail}</p>}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Goal Summary Card */}
                    {readiness && readiness.total > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Goals</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total</span>
                                    <span className="font-medium">{readiness.total}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-green-600">Approved</span>
                                    <span className="font-medium">{readiness.approved}</span>
                                </div>
                                {readiness.pending > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-amber-600">Pending</span>
                                        <span className="font-medium">{readiness.pending}</span>
                                    </div>
                                )}
                                {readiness.rejected > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-red-600">Rejected</span>
                                        <span className="font-medium">{readiness.rejected}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>Cycle Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Cycle</span>
                                <span className="font-medium">{cycleName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Start Date</span>
                                <span>{cycleStartDate}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">End Date</span>
                                <span>{cycleEndDate}</span>
                            </div>
                            {selfDeadline && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Self-Assessment Due</span>
                                    <span>{selfDeadline}</span>
                                </div>
                            )}
                            {managerDeadline && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Manager Review Due</span>
                                    <span>{managerDeadline}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function AppraisalDetailSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <div className="grid gap-6 md:grid-cols-3">
                <Skeleton className="h-[400px] md:col-span-2" />
                <Skeleton className="h-[300px]" />
            </div>
        </div>
    )
}
