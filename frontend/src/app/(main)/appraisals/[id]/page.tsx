
"use client";

import { useParams } from "next/navigation";
import { useAppraisal } from "@/hooks/use-appraisals";
import { useSession } from "next-auth/react";
import { WorkflowStepper } from "@/components/appraisal/workflow-stepper";
import { SelfAssessmentForm } from "@/components/appraisal/self-assessment-form";
import { ManagerReviewForm } from "@/components/appraisal/manager-review-form";
import { AcknowledgementForm } from "@/components/appraisal/acknowledgement-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default function AppraisalDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const { data: session } = useSession();
    const { data: appraisal, isLoading } = useAppraisal(id);

    if (isLoading) {
        return <AppraisalDetailSkeleton />;
    }

    if (!appraisal) {
        return <div>Appraisal not found</div>;
    }

    const isEmployee = session?.user?.id === appraisal.employee_id;
    const isManager = session?.user?.id === appraisal.manager_id; // OR role-based check if manager_id logic is complex

    // Determine what to show in the main action area
    let ActionComponent = null;
    let actionTitle = "";

    if (appraisal.status === 'self_assessment') {
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
            // Can show read-only self assessment here
        }
    } else if (appraisal.status === 'meeting_completed' || appraisal.status === 'completed') {
        // Assuming 'completed' is the state before 'acknowledged' in some flows, or check 'meeting_completed' specifically
        // If status is 'completed' AND not yet acknowledged (how to track? maybe 'completed' means done by manager, waiting ack?)
        // Let's assume 'meeting_completed' is the status for Ack.
        if (isEmployee) {
            ActionComponent = AcknowledgementForm;
            actionTitle = "Acknowledge Review";
        } else {
            actionTitle = "Waiting for Acknowledgement";
        }
    } else if (appraisal.status === 'acknowledged') {
        actionTitle = "Review Completed";
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Performance Review</h1>
                        <p className="text-muted-foreground">
                            Cycle: {appraisal.cycle_id}
                        </p>
                    </div>
                    <Badge variant={
                        appraisal.status === 'completed' ? 'default' :
                            appraisal.status === 'self_assessment' ? 'secondary' : 'outline'
                    } className="text-sm px-3 py-1">
                        {appraisal.status.replace('_', ' ').toUpperCase()}
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
                        {ActionComponent ? (
                            <ActionComponent appraisal={appraisal} />
                        ) : (
                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertTitle>Status</AlertTitle>
                                <AlertDescription>
                                    {appraisal.status === 'self_assessment' && !isEmployee && "The employee is currently completing their self-assessment."}
                                    {appraisal.status === 'manager_review' && !isManager && "The manager is currently reviewing the assessment."}
                                    {(appraisal.status === 'completed' || appraisal.status === 'acknowledged') && "This appraisal has been completed."}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Read-only views for completed sections */}
                        {appraisal.status !== 'self_assessment' && appraisal.self_assessment_data && (
                            <div className="mt-8 pt-8 border-t">
                                <h3 className="font-semibold mb-2">Self Assessment</h3>
                                <div className="bg-muted/50 p-4 rounded-md whitespace-pre-wrap">
                                    {appraisal.self_assessment_data.content || "No content provided."}
                                </div>
                            </div>
                        )}

                        {(appraisal.status === 'completed' || appraisal.status === 'acknowledged') && appraisal.manager_assessment_data && (
                            <div className="mt-8 pt-8 border-t">
                                <h3 className="font-semibold mb-2">Manager Review</h3>
                                <div className="bg-muted/50 p-4 rounded-md space-y-2">
                                    <div className="font-medium">Rating: {appraisal.overall_rating} / 5</div>
                                    <div className="whitespace-pre-wrap">{appraisal.manager_assessment_data.comments || "No comments."}</div>
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
                                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium">
                                        {appraisal.employee?.name?.charAt(0) || 'E'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{appraisal.employee?.name || appraisal.employee_id}</p>
                                        <p className="text-xs text-muted-foreground">{appraisal.employee?.email}</p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Manager</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium">
                                        {appraisal.manager?.name?.charAt(0) || 'M'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{appraisal.manager?.name || appraisal.manager_id}</p>
                                        <p className="text-xs text-muted-foreground">{appraisal.manager?.email}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Cycle Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Start Date</span>
                                <span>{appraisal.cycle ? new Date(appraisal.cycle.start_date).toLocaleDateString() : '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Due Date</span>
                                <span>{appraisal.cycle ? new Date(appraisal.cycle.end_date).toLocaleDateString() : '-'}</span>
                            </div>
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
