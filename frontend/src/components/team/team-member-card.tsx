
"use client";

import { TeamMember } from "@/hooks/use-team";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MoreHorizontal, User, Plus, ClipboardCheck, UserCheck, CheckCircle2, AlertCircle, Clock, Target, FileCheck, Scale, History } from "lucide-react";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TeamsContactActions } from "@/components/shared/teams-contact-actions";

interface TeamMemberCardProps {
    member: TeamMember;
}

const getAppraisalStatusConfig = (status: string | undefined) => {
    switch (status) {
        case 'not_started':
            return {
                label: 'Not Started',
                variant: 'outline' as const,
                icon: Clock,
                color: 'text-muted-foreground border-muted-foreground/30'
            };
        case 'goals_pending_approval':
            return {
                label: 'Goals Review',
                variant: 'outline' as const,
                icon: History,
                color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200'
            };
        case 'goals_approved':
            return {
                label: 'Goals Approved',
                variant: 'outline' as const,
                icon: FileCheck,
                color: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400 border-sky-200'
            };
        case 'self_assessment':
        case 'self_assessment_in_progress':
            return {
                label: 'Self Assessment',
                variant: 'secondary' as const,
                icon: User,
                color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200'
            };
        case 'manager_review':
            return {
                label: 'Manager Review',
                variant: 'secondary' as const,
                icon: ClipboardCheck,
                color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200'
            };
        case 'calibration':
            return {
                label: 'Calibration',
                variant: 'secondary' as const,
                icon: Scale,
                color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200'
            };
        case 'acknowledgement_pending':
            return {
                label: 'Awaiting Sign-off',
                variant: 'secondary' as const,
                icon: UserCheck,
                color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200'
            };
        case 'completed':
            return {
                label: 'Completed',
                variant: 'secondary' as const,
                icon: CheckCircle2,
                color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200'
            };
        case 'overdue':
            return {
                label: 'Overdue',
                variant: 'destructive' as const,
                icon: AlertCircle,
                color: ''
            };
        default:
            return null;
    }
};

export function TeamMemberCard({ member }: TeamMemberCardProps) {
    const appraisalConfig = getAppraisalStatusConfig(member.active_appraisal_status);
    
    return (
        <Card className="flex flex-col h-full transition-all duration-200 hover:shadow-md hover:border-primary/20 group">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-background group-hover:border-primary/10 transition-colors">
                        <AvatarImage src={`https://avatar.vercel.sh/${member.email}`} alt={member.name} />
                        <AvatarFallback>{member.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <h3 className="font-semibold leading-none group-hover:text-primary transition-colors">{member.name && member.name !== 'Employee' ? member.name : member.email}</h3>
                        <p className="text-sm text-muted-foreground">{member.job_title || 'Employee'}</p>
                    </div>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                                <Link href={`/profile/${member.id}`}>View Profile</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href={`/appraisals?employee_id=${member.id}`}>View Appraisals</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href={`/goals?employee_id=${member.id}`}>View Goals</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href={`/goals/new?employee_id=${member.id}`}>
                                    <Plus className="mr-2 h-4 w-4" /> Set Goal
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 pt-4">

                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Department</span>
                    <span className="font-medium">{member.department_name || '-'}</span>
                </div>

                <div className="flex items-center justify-between text-sm min-h-[28px]">
                    <span className="text-muted-foreground">Appraisal</span>
                    {appraisalConfig ? (
                        <div onClick={(e) => e.stopPropagation()}>
                            <Link href={`/appraisals?employee_id=${member.id}`}>
                                <Badge 
                                    variant={appraisalConfig.variant} 
                                    className={`capitalize flex items-center gap-1.5 px-2 py-0.5 cursor-pointer hover:opacity-80 transition-opacity ${appraisalConfig.color}`}
                                >
                                    <appraisalConfig.icon className="h-3 w-3" />
                                    {appraisalConfig.label}
                                </Badge>
                            </Link>
                        </div>
                    ) : (
                        <span className="text-xs text-muted-foreground italic">No active cycle</span>
                    )}
                </div>

                {typeof member.goals_completed !== 'undefined' && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Goals Completion</span>
                            <span className="text-muted-foreground">{member.goals_completed} / {member.goals_total}</span>
                        </div>
                        <Progress value={member.goals_total ? (member.goals_completed / member.goals_total) * 100 : 0} className="h-1.5" />
                    </div>
                )}

            </CardContent>
            <CardFooter className="pt-2">
                <TeamsContactActions email={member.email} name={member.name} className="w-full" />
            </CardFooter>
        </Card>
    );
}
