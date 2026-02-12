
"use client";

import { Goal } from "@/types/goal";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GoalProgressRing } from "./goal-progress-ring";
import { Button } from "@/components/ui/button";
import { Calendar, MoreHorizontal, ArrowRight, Target, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface GoalCardProps {
    goal: Goal;
}

export function GoalCard({ goal }: GoalCardProps) {
    const isOverdue = new Date(goal.target_date) < new Date() && goal.status !== 'completed' && goal.status !== 'cancelled';

    return (
        <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={goal.priority === 'critical' || goal.priority === 'high' ? 'destructive' : 'secondary'} className="capitalize text-xs">
                                {goal.priority}
                            </Badge>
                            <Badge variant="outline" className="capitalize text-xs">
                                {goal.category.replace('_', ' ')}
                            </Badge>
                            {isOverdue && (
                                <Badge variant="destructive" className="text-xs flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Overdue
                                </Badge>
                            )}
                        </div>
                        <CardTitle className="line-clamp-2 text-lg leading-tight">
                            <Link href={`/goals/${goal.id}`} className="hover:underline">
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
                <Button variant="ghost" className="w-full justify-between hover:bg-muted/50 group" asChild>
                    <Link href={`/goals/${goal.id}`}>
                        View Details
                        <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
