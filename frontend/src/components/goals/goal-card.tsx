
"use client";

import { Goal } from "@/types/goal";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GoalProgressRing } from "./goal-progress-ring";
import { Button } from "@/components/ui/button";
import { Calendar, MoreHorizontal, ArrowRight, Target, AlertTriangle, Clock, XCircle, CheckCircle2, Globe, Building2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface GoalCardProps {
    goal: Goal;
}

const PRIORITY_COLORS: Record<string, string> = {
    critical: "border-l-red-500",
    high: "border-l-orange-500",
    medium: "border-l-blue-500",
    low: "border-l-slate-300",
};

export function GoalCard({ goal }: GoalCardProps) {
    const isOverdue = new Date(goal.target_date) < new Date() && goal.status !== 'completed' && goal.status !== 'cancelled';
    const borderColor = PRIORITY_COLORS[goal.priority] || PRIORITY_COLORS.medium;

    return (
        <Card className={cn(
            "flex flex-col h-full border-l-4 border-0 shadow-sm hover:shadow-lg transition-all duration-200 hover:scale-[1.01]",
            borderColor
        )}>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant={goal.priority === 'critical' || goal.priority === 'high' ? 'destructive' : 'secondary'} className="capitalize text-xs">
                                {goal.priority}
                            </Badge>
                            <Badge variant="outline" className="capitalize text-xs">
                                {goal.category.replace('_', ' ')}
                            </Badge>
                            <Badge variant={goal.department_id ? "secondary" : "outline"} className="text-xs flex items-center gap-1">
                                {goal.department_id
                                    ? <><Building2 className="w-3 h-3" />{goal.department_name}</>
                                    : <><Globe className="w-3 h-3" />Org-wide</>
                                }
                            </Badge>
                            {isOverdue && (
                                <Badge variant="destructive" className="text-xs flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Overdue
                                </Badge>
                            )}
                            {goal.approval_status === "pending_approval" && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Pending
                                </Badge>
                            )}
                            {goal.approval_status === "rejected" && (
                                <Badge variant="destructive" className="text-xs flex items-center gap-1">
                                    <XCircle className="w-3 h-3" /> Rejected
                                </Badge>
                            )}
                            {goal.approval_status === "approved" && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Approved
                                </Badge>
                            )}
                        </div>
                        <CardTitle className="line-clamp-2 text-lg leading-tight">
                            <Link href={`/goals/${goal.id}`} className="hover:text-primary transition-colors">
                                {goal.title}
                            </Link>
                        </CardTitle>
                    </div>
                    <GoalProgressRing progress={goal.progress_percentage} size={48} />
                </div>
            </CardHeader>
            <CardContent className="flex-1 pb-3">
                {goal.description && (
                    <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                        {goal.description}
                    </p>
                )}

                {/* Show rejection reason */}
                {goal.approval_status === "rejected" && goal.rejected_reason && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 mb-4">
                        <span className="font-medium">Rejection Reason: </span>
                        {goal.rejected_reason}
                    </div>
                )}

                {/* Show manager approval comment */}
                {goal.approval_status === "approved" && goal.manager_comment && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 mb-4">
                        <span className="font-medium">Manager Comment: </span>
                        {goal.manager_comment}
                    </div>
                )}

                <div className="flex items-center text-sm text-muted-foreground gap-4">
                    <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Due {new Date(goal.target_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        <span>{goal.key_results?.length || 0} Key Results</span>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="pt-0">
                <Button variant="ghost" className="w-full justify-between hover:bg-primary/5 group" asChild>
                    <Link href={`/goals/${goal.id}`}>
                        View Details
                        <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
