"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAppraisal, useFinalizeGoals } from "@/hooks/use-appraisals";
import { useApproveGoal, useRejectGoal } from "@/hooks/use-goal-approval";
import { useRaiseAppeal } from "@/hooks/use-appeals";
import { useSession } from "next-auth/react";
import { WorkflowStepper } from "@/components/appraisal/WorkflowStepper";
import { SelfAssessmentForm } from "@/components/appraisal/SelfAssessmentForm";
import { ManagerReviewForm } from "@/components/appraisal/ManagerReviewForm";
import { AcknowledgementForm } from "@/components/appraisal/acknowledgement-form";
import { FinalSummary } from "@/components/appraisal/FinalSummary";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Info, CheckCircle2, XCircle, Target, Clock, AlertTriangle, MessageSquareWarning } from "lucide-react";
import type { GoalForAssessment } from "@/types/appraisal";

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
    const raiseAppeal = useRaiseAppeal();
    const finalizeGoals = useFinalizeGoals();
    const [appealReason, setAppealReason] = useState("");
    const [showAppealForm, setShowAppealForm] = useState(false);

    if (isLoading) {
        return <AppraisalDetailSkeleton />;
    }

    if (!appraisal) {
        return <div>Appraisal not found</div>;
    }

    const isEmployee = String(session?.user?.id) === String(appraisal.employee_id);
    const isManager = String(session?.user?.id) === String(appraisal.manager_id);

    // Goal readiness dynamically calculated since backend returns appraisal.goals
    const goalsArray: GoalForAssessment[] = (appraisal as any).goals || [];
    const totalGoals = goalsArray.length;
    const approvedCount = goalsArray.filter(g => g.approval_status === 'approved').length;
    const pendingCount = goalsArray.filter(g => g.approval_status === 'pending_approval').length;
    const rejectedCount = goalsArray.filter(g => g.approval_status === 'rejected').length;

    const readiness = {
        ready: totalGoals > 0 && approvedCount === totalGoals,
        total: totalGoals,
        approved: approvedCount,
        pending: pendingCount,
        rejected: rejectedCount,
        goals: goalsArray
    };

    const goalsReady = readiness.ready;
    const pendingGoals = goalsArray.filter(g => g.approval_status === 'pending_approval');
    const approvedGoals = goalsArray.filter(g => g.approval_status === 'approved');
    const hasAnyGoals = totalGoals > 0;

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
            } else {
                // No goals yet or some are draft (or waiting for manager to finalize)
                showWaitingForGoals = true;
                actionTitle = goalsReady ? "Waiting for Manager to Finalize Goals" : "Goal Setting Phase";
            }
        } else if (isManager) {
            actionTitle = hasAnyGoals
                ? `Goal Setting (${approvedGoals.length}/${readiness?.total || 0} approved)`
                : "Assign Goals to Employee";
        } else {
            actionTitle = "Goal Setting In Progress";
        }
    } else if (appraisal.status === 'goals_pending_approval') {
        if (isManager) {
            actionTitle = "Goals Pending Employee Approval";
        } else {
            showGoalApproval = pendingGoals.length > 0;
            actionTitle = pendingGoals.length > 0 ? "Review & Approve Goals" : "Goals Pending Approval";
        }
    } else if (appraisal.status === 'goals_approved') {
        if (isManager) {
            actionTitle = "Review & Finalize Goals";
        } else {
            actionTitle = "Goal Setting In Progress";
        }
    } else if (appraisal.status === 'self_assessment_in_progress') {
        if (isEmployee) {
            ActionComponent = SelfAssessmentForm;
            actionTitle = "Complete Self Assessment";
        } else {
            actionTitle = "Waiting for Employee Self Assessment";
        }
    } else if (appraisal.status === 'manager_review') {
        if (isManager) {
            ActionComponent = ManagerReviewForm;
            actionTitle = "Complete Manager Review";
        } else {
            actionTitle = "Waiting for Manager Review";
        }
    } else if (appraisal.status === 'calibration') {
        actionTitle = "Under HR Calibration";
    } else if (appraisal.status === 'acknowledgement_pending') {
        if (isEmployee) {
            ActionComponent = AcknowledgementForm;
            actionTitle = "Sign Off on Your Review";
        } else {
            actionTitle = "Waiting for Employee Sign-Off";
        }
    } else if (appraisal.status === 'completed') {
        actionTitle = "Appraisal Completed";
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

            {/* Deadline warning banner — shown when deadline is within 3 days */}
            {(() => {
                const selfDeadlineDate = appraisal.self_assessment_deadline ? new Date(appraisal.self_assessment_deadline) : null;
                const mgrDeadlineDate = appraisal.manager_review_deadline ? new Date(appraisal.manager_review_deadline) : null;
                const now = Date.now();
                const THREE_DAYS_MS = 3 * 86400000;

                const selfNearDeadline = isEmployee
                    && selfDeadlineDate
                    && ['goals_approved', 'self_assessment_in_progress'].includes(appraisal.status)
                    && (selfDeadlineDate.getTime() - now) < THREE_DAYS_MS
                    && (selfDeadlineDate.getTime() - now) > 0;

                const mgrNearDeadline = isManager
                    && mgrDeadlineDate
                    && appraisal.status === 'manager_review'
                    && (mgrDeadlineDate.getTime() - now) < THREE_DAYS_MS
                    && (mgrDeadlineDate.getTime() - now) > 0;

                if (!selfNearDeadline && !mgrNearDeadline) return null;

                return (
                    <Alert className="border-amber-400 bg-amber-50 text-amber-900">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800">Deadline Approaching</AlertTitle>
                        <AlertDescription className="text-amber-700">
                            {selfNearDeadline && (
                                <span>Your self-assessment is due by <strong>{selfDeadlineDate!.toLocaleDateString()}</strong>. Please complete it soon.</span>
                            )}
                            {mgrNearDeadline && (
                                <span>The manager review deadline is <strong>{mgrDeadlineDate!.toLocaleDateString()}</strong>. Please submit your review soon.</span>
                            )}
                        </AlertDescription>
                    </Alert>
                );
            })()}

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
                                        onApprove={() => approveGoal.mutate({ goalId: goal.id })}
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
                                <AlertTitle>{goalsReady ? "Waiting for Manager" : "Waiting for Goals"}</AlertTitle>
                                <AlertDescription>
                                    {goalsReady
                                        ? "Your goals are approved. Waiting for your manager to explicitly finalize the goal-setting phase before you can begin the self-assessment."
                                        : "Your manager needs to assign goals to you before you can start the self-assessment. You will be notified when goals are ready for your review."}
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

                        {/* Manager view: goal progress and Finzlize button */}
                        {['not_started', 'goals_pending_approval', 'goals_approved'].includes(appraisal.status) && isManager && hasAnyGoals && !appraisal.goals_finalized && (
                            <div className="space-y-4">
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertTitle>Goal Setting Progress</AlertTitle>
                                    <AlertDescription>
                                        {readiness?.approved || 0} of {readiness?.total || 0} goals approved.
                                        {(readiness?.pending || 0) > 0 && ` ${readiness?.pending} pending employee approval.`}
                                        {(readiness?.rejected || 0) > 0 && ` ${readiness?.rejected} rejected.`}
                                    </AlertDescription>
                                </Alert>

                                <Card className="border-primary/20 bg-primary/5">
                                    <CardContent className="pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                        <div>
                                            <h4 className="font-semibold text-lg flex items-center gap-2">
                                                <CheckCircle2 className="w-5 h-5 text-primary" />
                                                Finalize Goal Setting
                                            </h4>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Click this once the employee has added all their goals and you have approved them. This will lock the goal setting phase and move the appraisal to Self-Assessment.
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => finalizeGoals.mutate(appraisal.id)}
                                            disabled={finalizeGoals.isPending}
                                            className="shrink-0 whitespace-nowrap"
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            {finalizeGoals.isPending ? "Finalizing..." : "Finalize Goals"}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Action form (SelfAssessment, ManagerReview, Acknowledgement) */}
                        {ActionComponent && <ActionComponent appraisal={appraisal} goals={readiness?.goals || []} />}

                        {/* Fallback status message for non-participants */}
                        {!ActionComponent && !showGoalApproval && !showWaitingForGoals
                            && !(appraisal.status === 'not_started' && isManager) && (
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertTitle>Status</AlertTitle>
                                    <AlertDescription>
                                        {(appraisal.status === 'not_started' || appraisal.status === 'goals_approved' || appraisal.status === 'self_assessment_in_progress') && !isEmployee && "The employee is currently completing their self-assessment."}
                                        {appraisal.status === 'manager_review' && !isManager && "The manager is currently reviewing the assessment."}
                                        {appraisal.status === 'calibration' && "This appraisal is currently under HR calibration. The employee and manager will be notified once complete."}
                                        {appraisal.status === 'completed' && "This appraisal has been completed."}
                                        {appraisal.status === 'acknowledgement_pending' && !isEmployee && "Waiting for the employee to sign off."}
                                    </AlertDescription>
                                </Alert>
                            )}

                        {/* Read-only review: show for manager/HR on acknowledgement_pending,
                            and for everyone when completed.
                            Employees on acknowledgement_pending see FinalSummary inside AcknowledgementForm. */}
                        {(appraisal.status === 'completed' ||
                            (appraisal.status === 'acknowledgement_pending' && !isEmployee)) && (
                                <div className="mt-8 pt-8 border-t">
                                    <ManagerReviewForm
                                        appraisal={appraisal}
                                        goals={readiness?.goals || []}
                                        readOnly={true}
                                    />
                                </div>
                            )}

                        {/* Appeal section — only for employees on completed appraisals */}
                        {appraisal.status === 'completed' && isEmployee && (
                            <div className="mt-8 pt-6 border-t">
                                {!showAppealForm ? (
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-muted-foreground">
                                            If you believe the outcome is inaccurate, you may raise a formal appeal.
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowAppealForm(true)}
                                        >
                                            <MessageSquareWarning className="mr-2 h-4 w-4" />
                                            Raise an Appeal
                                        </Button>
                                    </div>
                                ) : (
                                    <Card className="border-amber-300 bg-amber-50/50">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <MessageSquareWarning className="h-5 w-5 text-amber-600" />
                                                Raise an Appeal
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <p className="text-sm text-muted-foreground">
                                                Describe why you believe this appraisal outcome is inaccurate. HR will review your appeal.
                                            </p>
                                            <Textarea
                                                value={appealReason}
                                                onChange={(e) => setAppealReason(e.target.value)}
                                                placeholder="Describe your concern in detail..."
                                                rows={4}
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => raiseAppeal.mutate({ appraisalId: appraisal.id, reason: appealReason }, { onSuccess: () => setShowAppealForm(false) })}
                                                    disabled={!appealReason.trim() || raiseAppeal.isPending}
                                                >
                                                    {raiseAppeal.isPending ? "Submitting..." : "Submit Appeal"}
                                                </Button>
                                                <Button variant="ghost" onClick={() => setShowAppealForm(false)}>
                                                    Cancel
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
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
