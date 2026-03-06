"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import type { Goal } from "@/types/appraisal";

interface GoalApprovalListProps {
    goals: Goal[];
    appraisalId: string;
    userRole: "employee" | "manager" | "hr_admin";
}

export function GoalApprovalList({ goals, appraisalId, userRole }: GoalApprovalListProps) {
    const queryClient = useQueryClient();
    const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
    const [showRejectInput, setShowRejectInput] = useState<Record<string, boolean>>({});

    const approveGoal = useMutation({
        mutationFn: async (goalId: string) => {
            const { data } = await apiClient.post(`/api/goals/${goalId}/approve`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["appraisals", "me"] });
            queryClient.invalidateQueries({ queryKey: ["goals"] });
        },
    });

    const rejectGoal = useMutation({
        mutationFn: async ({ goalId, reason }: { goalId: string; reason: string }) => {
            const { data } = await apiClient.post(`/api/goals/${goalId}/reject`, {
                reason,
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["appraisals", "me"] });
            queryClient.invalidateQueries({ queryKey: ["goals"] });
        },
    });

    const pendingGoals = goals.filter((g) => g.approval_status === "pending_approval");
    const approvedGoals = goals.filter((g) => g.approval_status === "approved");
    const rejectedGoals = goals.filter((g) => g.approval_status === "rejected");

    const allApproved = goals.length > 0 && pendingGoals.length === 0 && rejectedGoals.length === 0;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Assigned Goals</h3>
                <div className="flex gap-2 text-sm">
                    <Badge variant="secondary">
                        {approvedGoals.length} approved
                    </Badge>
                    {pendingGoals.length > 0 && (
                        <Badge variant="outline">
                            {pendingGoals.length} pending
                        </Badge>
                    )}
                </div>
            </div>

            {allApproved && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                    All goals have been approved. Self-assessment is now available.
                </div>
            )}

            {goals.length === 0 && (
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                    No goals have been assigned yet. Waiting for your manager to assign goals.
                </div>
            )}

            {goals.map((goal) => (
                <Card key={goal.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                            <CardTitle className="text-base">{goal.title}</CardTitle>
                            <GoalStatusBadge status={goal.approval_status} />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {goal.description && (
                            <p className="text-sm text-muted-foreground">
                                {goal.description}
                            </p>
                        )}

                        {goal.due_date && (
                            <p className="text-xs text-muted-foreground">
                                Due: {new Date(goal.due_date).toLocaleDateString()}
                            </p>
                        )}

                        {/* Employee can approve/reject pending goals */}
                        {userRole === "employee" && goal.approval_status === "pending_approval" && (
                            <div className="flex flex-col gap-2 pt-2 border-t">
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => approveGoal.mutate(goal.id)}
                                        disabled={approveGoal.isPending}
                                    >
                                        <CheckCircle className="mr-1 h-4 w-4" />
                                        Approve
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            setShowRejectInput((prev) => ({
                                                ...prev,
                                                [goal.id]: !prev[goal.id],
                                            }))
                                        }
                                    >
                                        <XCircle className="mr-1 h-4 w-4" />
                                        Request Change
                                    </Button>
                                </div>

                                {showRejectInput[goal.id] && (
                                    <div className="space-y-2">
                                        <Textarea
                                            placeholder="Explain what change is needed..."
                                            value={rejectReason[goal.id] || ""}
                                            onChange={(e) =>
                                                setRejectReason((prev) => ({
                                                    ...prev,
                                                    [goal.id]: e.target.value,
                                                }))
                                            }
                                        />
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            disabled={
                                                !rejectReason[goal.id]?.trim() ||
                                                rejectGoal.isPending
                                            }
                                            onClick={() =>
                                                rejectGoal.mutate({
                                                    goalId: goal.id,
                                                    reason: rejectReason[goal.id],
                                                })
                                            }
                                        >
                                            Submit Change Request
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function GoalStatusBadge({ status }: { status: string }) {
    switch (status) {
        case "approved":
            return (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                    <CheckCircle className="mr-1 h-3 w-3" /> Approved
                </Badge>
            );
        case "rejected":
            return (
                <Badge variant="destructive">
                    <XCircle className="mr-1 h-3 w-3" /> Change Requested
                </Badge>
            );
        default:
            return (
                <Badge variant="outline">
                    <Clock className="mr-1 h-3 w-3" /> Pending Approval
                </Badge>
            );
    }
}