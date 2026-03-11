
"use client";

import { usePendingTimesheets, useReviewTimesheet } from "@/hooks/use-timesheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Users, Clock, MessageSquare } from "lucide-react";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";

export default function TimesheetApprovalsPage() {
    const { data: pending, isLoading } = usePendingTimesheets();
    const reviewMutation = useReviewTimesheet();

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [comment, setComment] = useState("");
    const [actionType, setActionType] = useState<"APPROVED" | "REJECTED" | null>(null);

    const openDialog = (id: string, type: "APPROVED" | "REJECTED") => {
        setSelectedId(id);
        setActionType(type);
        setComment("");
    };

    const handleAction = () => {
        if (!selectedId || !actionType) return;

        reviewMutation.mutate({ id: selectedId, status: actionType, comment }, {
            onSuccess: () => setSelectedId(null),
        });
    };

    if (isLoading) return <TimesheetApprovalsSkeleton />;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Timesheet Approvals</h1>
                <p className="text-muted-foreground mt-1">
                    Review and approve weekly timesheets from your team.
                </p>
            </div>

            <div className="grid gap-6">
                {pending?.length === 0 ? (
                    <Card className="border-0 shadow-sm bg-muted/20">
                        <CardContent className="p-12 text-center text-muted-foreground">
                            <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No timesheets pending approval.</p>
                        </CardContent>
                    </Card>
                ) : (
                    pending?.map((timesheet) => (
                        <Card key={timesheet.id} className="border-0 shadow-md hover:shadow-lg transition-all">
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Users className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">User ID: {timesheet.user_id}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Week: {format(parseISO(timesheet.week_start), "MMM d")} - {format(parseISO(timesheet.week_end), "MMM d, yyyy")}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 pt-2">
                                            <div className="flex items-center gap-1 text-sm font-semibold text-premium-600">
                                                <Clock className="h-4 w-4" />
                                                {timesheet.total_hours} Hours
                                            </div>
                                            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                                                PENDING REVIEW
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 self-end md:self-center">
                                        <Button
                                            variant="outline"
                                            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                            onClick={() => openDialog(timesheet.id!, "APPROVED")}
                                            disabled={reviewMutation.isPending}
                                        >
                                            <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="text-rose-600 border-rose-200 hover:bg-rose-50"
                                            onClick={() => openDialog(timesheet.id!, "REJECTED")}
                                            disabled={reviewMutation.isPending}
                                        >
                                            <XCircle className="h-4 w-4 mr-2" /> Reject
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <Dialog open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {actionType === "APPROVED" ? (
                                <><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Approve Timesheet</>
                            ) : (
                                <><XCircle className="h-5 w-5 text-rose-600" /> Reject Timesheet</>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <label className="text-sm font-medium mb-2 block">
                            Comments (Optional for approval, recommended for rejection)
                        </label>
                        <Textarea
                            placeholder={actionType === "APPROVED" ? "Add a note for the approval..." : "Please provide a reason for rejection..."}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="resize-none"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedId(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant={actionType === "APPROVED" ? "default" : "destructive"}
                            onClick={handleAction}
                            disabled={reviewMutation.isPending}
                        >
                            {actionType === "APPROVED" ? "Confirm Approval" : "Confirm Rejection"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function TimesheetApprovalsSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-[300px]" />
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-lg" />
                ))}
            </div>
        </div>
    );
}
