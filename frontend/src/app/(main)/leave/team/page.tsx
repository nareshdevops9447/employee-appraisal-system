
"use client";

import { useTeamLeaveRequests, useApproveLeaveRequest, useRejectLeaveRequest } from "@/hooks/use-leave";
import { RequestTable } from "@/components/leave/request-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Users, MessageSquare } from "lucide-react";
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

export default function TeamLeavePage() {
    const { data: requests, isLoading } = useTeamLeaveRequests();
    const approveMutation = useApproveLeaveRequest();
    const rejectMutation = useRejectLeaveRequest();

    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
    const [comment, setComment] = useState("");
    const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);

    const openDialog = (id: string, type: "approve" | "reject") => {
        setSelectedRequestId(id);
        setActionType(type);
        setComment("");
    };

    const handleAction = () => {
        if (!selectedRequestId || !actionType) return;

        if (actionType === "approve") {
            approveMutation.mutate({ id: selectedRequestId, comment }, {
                onSuccess: () => setSelectedRequestId(null),
            });
        } else {
            rejectMutation.mutate({ id: selectedRequestId, comment }, {
                onSuccess: () => setSelectedRequestId(null),
            });
        }
    };

    if (isLoading) {
        return <TeamLeaveSkeleton />;
    }

    const pendingRequests = requests?.filter((r) => r.status === "PENDING") || [];
    const otherRequests = requests?.filter((r) => r.status !== "PENDING") || [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-premium-600">Team Leave Management</h1>
                <p className="text-muted-foreground mt-1 text-premium-400">
                    Review and manage leave requests from your team members.
                </p>
            </div>

            <div className="grid gap-6">
                <Card className="border-0 shadow-md">
                    <CardHeader className="border-b bg-amber-50/30">
                        <CardTitle className="text-lg flex items-center gap-2 text-amber-900">
                            <Users className="h-5 w-5" />
                            Pending Approvals
                            <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700 hover:bg-amber-100">
                                {pendingRequests.length}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {pendingRequests.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                No pending leave requests to review.
                            </div>
                        ) : (
                            <div className="divide-y">
                                {pendingRequests.map((request) => (
                                    <div key={request.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-premium-700">{request.user_name || `User: ${request.user_id}`}</span>
                                                <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{request.leave_type_name}</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                                                <span className="mx-2">·</span>
                                                {request.duration_days} days
                                            </p>
                                            {request.reason && (
                                                <div className="flex items-start gap-2 mt-2 text-sm bg-gray-50 p-2 rounded italic text-gray-600">
                                                    <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                    &quot;{request.reason}&quot;
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                                                onClick={() => openDialog(request.id, "approve")}
                                                disabled={approveMutation.isPending}
                                            >
                                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                                Approve
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200"
                                                onClick={() => openDialog(request.id, "reject")}
                                                disabled={rejectMutation.isPending}
                                            >
                                                <XCircle className="h-4 w-4 mr-1" />
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-4 pt-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        Recent History
                    </h2>
                    <RequestTable requests={otherRequests} showUser={true} />
                </div>
            </div>

            <Dialog open={!!selectedRequestId} onOpenChange={(open) => !open && setSelectedRequestId(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {actionType === "approve" ? (
                                <><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Approve Leave Request</>
                            ) : (
                                <><XCircle className="h-5 w-5 text-rose-600" /> Reject Leave Request</>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <label className="text-sm font-medium mb-2 block">
                            Comments (Optional)
                        </label>
                        <Textarea
                            placeholder={actionType === "approve" ? "Add a note for the approval..." : "Please provide a reason for rejection..."}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="resize-none"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedRequestId(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant={actionType === "approve" ? "default" : "destructive"}
                            onClick={handleAction}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                        >
                            {actionType === "approve" ? "Confirm Approval" : "Confirm Rejection"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function TeamLeaveSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-[300px]" />
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
        </div>
    );
}
