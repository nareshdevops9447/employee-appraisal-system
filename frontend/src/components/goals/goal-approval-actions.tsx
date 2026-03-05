"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApproveGoal, useRejectGoal, useSubmitGoal } from "@/hooks/use-goal-approval";
import { Goal } from "@/types/goal";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface GoalApprovalActionsProps {
    goal: Goal;
    currentUserId: string;
    onEditClick?: () => void;
}

export function GoalApprovalActions({ goal, currentUserId, onEditClick }: GoalApprovalActionsProps) {
    const submitGoal = useSubmitGoal();
    const approveGoal = useApproveGoal();
    const rejectGoal = useRejectGoal();
    const [rejectReason, setRejectReason] = useState("");
    const [approveComment, setApproveComment] = useState("");
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);

    const isCreator = String(goal.created_by) === String(currentUserId);
    const isSystemCreated = goal.created_by === 'system';
    const isAssignee = String(goal.employee_id) === String(currentUserId);
    const isManager = !isAssignee;

    // A goal can be submitted from draft by its creator, OR by the manager if it's an HR provisioned goal.
    const showSubmit = goal.approval_status === "draft" && (isCreator || (isSystemCreated && isManager));

    // A goal can be approved/rejected if it's pending approval.
    let showApproveReject = false;
    if (goal.approval_status === "pending_approval") {
        if (isSystemCreated) {
            showApproveReject = isAssignee;
        } else {
            showApproveReject = !isCreator;
        }
    }

    // A rejected goal can be resubmitted.
    let showResubmit = false;
    if (goal.approval_status === "rejected") {
        if (isSystemCreated) {
            showResubmit = isManager;
        } else {
            showResubmit = isCreator;
        }
    }

    if (!showSubmit && !showApproveReject && !showResubmit) {
        return null;
    }

    const handleReject = () => {
        rejectGoal.mutate({ goalId: goal.id, reason: rejectReason }, {
            onSuccess: () => setIsRejectDialogOpen(false)
        });
    };

    const handleApprove = () => {
        approveGoal.mutate({ goalId: goal.id, comment: approveComment || undefined }, {
            onSuccess: () => {
                setIsApproveDialogOpen(false);
                setApproveComment("");
            }
        });
    };

    return (
        <div className="flex items-center gap-2">
            {showSubmit && (
                <Button
                    onClick={() => submitGoal.mutate(goal.id)}
                    disabled={submitGoal.isPending}
                >
                    {submitGoal.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit for Approval
                </Button>
            )}

            {showResubmit && (
                <>
                    <Button variant="outline" onClick={onEditClick}>Edit Goal</Button>
                    <Button
                        onClick={() => submitGoal.mutate(goal.id)}
                        disabled={submitGoal.isPending}
                    >
                        {submitGoal.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Resubmit
                    </Button>
                </>
            )}

            {showApproveReject && (
                <>
                    <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                variant="default"
                                disabled={approveGoal.isPending || rejectGoal.isPending}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                Approve
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Approve Goal</DialogTitle>
                                <DialogDescription>
                                    You can optionally add a comment when approving this goal.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid w-full gap-1.5">
                                    <Label htmlFor="approve-comment">Comment (optional)</Label>
                                    <Input
                                        id="approve-comment"
                                        value={approveComment}
                                        onChange={(e) => setApproveComment(e.target.value)}
                                        placeholder="e.g., Well-defined goal, approved!"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>Cancel</Button>
                                <Button
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={handleApprove}
                                    disabled={approveGoal.isPending}
                                >
                                    {approveGoal.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Confirm Approval
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="destructive" disabled={approveGoal.isPending || rejectGoal.isPending}>
                                Reject
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Reject Goal</DialogTitle>
                                <DialogDescription>
                                    Please provide a reason for rejecting this goal. The manager will be notified to make adjustments.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid w-full gap-1.5">
                                    <Label htmlFor="reason">Reason</Label>
                                    <Input
                                        id="reason"
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        placeholder="e.g., Targets are too aggressive..."
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleReject}
                                    disabled={!rejectReason || rejectGoal.isPending}
                                >
                                    {rejectGoal.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Confirm Rejection
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </>
            )}
        </div>
    );
}
