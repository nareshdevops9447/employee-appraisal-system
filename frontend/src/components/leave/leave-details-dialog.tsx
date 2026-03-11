
"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { LeaveRequest } from "@/types/leave";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, AlignLeft, MessageSquare, CheckCircle2, XCircle, Info } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface LeaveDetailsDialogProps {
    request: LeaveRequest | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function LeaveDetailsDialog({ request, open, onOpenChange }: LeaveDetailsDialogProps) {
    if (!request) return null;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
            case 'PENDING': return 'text-amber-600 bg-amber-50 border-amber-200';
            case 'REJECTED': return 'text-rose-600 bg-rose-50 border-rose-200';
            case 'CANCELLED': return 'text-slate-600 bg-slate-50 border-slate-200';
            default: return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'APPROVED': return <CheckCircle2 className="h-4 w-4" />;
            case 'PENDING': return <Clock className="h-4 w-4" />;
            case 'REJECTED': return <XCircle className="h-4 w-4" />;
            case 'CANCELLED': return <XCircle className="h-4 w-4" />;
            default: return <Info className="h-4 w-4" />;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <div className="flex items-center justify-between pr-6">
                        <DialogTitle className="text-xl">Request Details</DialogTitle>
                        <Badge variant="outline" className={getStatusColor(request.status)}>
                            <span className="flex items-center gap-1">
                                {getStatusIcon(request.status)}
                                {request.status}
                            </span>
                        </Badge>
                    </div>
                    <DialogDescription>
                        Submitted on {format(new Date(request.created_at!), 'PPP')}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Employee Info if relevant */}
                    {request.user_name && (
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 p-2 rounded-full bg-primary/10">
                                <User className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</p>
                                <p className="text-sm font-medium">{request.user_name}</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 p-2 rounded-full bg-primary/10">
                                <Calendar className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dates</p>
                                <p className="text-sm font-medium">
                                    {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 p-2 rounded-full bg-primary/10">
                                <Clock className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration</p>
                                <p className="text-sm font-medium">
                                    {request.duration_days} days
                                    {request.is_half_day && <span className="text-xs text-muted-foreground ml-1">({request.half_day_period?.replace('_', ' ')})</span>}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 p-2 rounded-full bg-primary/10">
                            <AlignLeft className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reason</p>
                            <p className="text-sm mt-1 bg-muted/30 p-3 rounded-lg border border-border/50">
                                {request.reason || "No reason provided."}
                            </p>
                        </div>
                    </div>

                    {(request.reviewed_by_name || request.reviewer_comment) && (
                        <>
                            <Separator />
                            <div className="space-y-4">
                                {request.reviewed_by_name && (
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 p-2 rounded-full bg-primary/10">
                                            <User className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reviewed By</p>
                                            <p className="text-sm font-medium">{request.reviewed_by_name}</p>
                                            {request.reviewed_at && (
                                                <p className="text-[10px] text-muted-foreground">
                                                    on {format(new Date(request.reviewed_at), 'PPP p')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {request.reviewer_comment && (
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 p-2 rounded-full bg-primary/10">
                                            <MessageSquare className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reviewer Comment</p>
                                            <p className="text-sm mt-1 bg-amber-50/50 p-3 rounded-lg border border-amber-100 italic">
                                                "{request.reviewer_comment}"
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
