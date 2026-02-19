
"use client";

import { TeamMember } from "@/hooks/use-team";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Mail, MoreHorizontal, User, Plus } from "lucide-react";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TeamMemberCardProps {
    member: TeamMember;
}

export function TeamMemberCard({ member }: TeamMemberCardProps) {
    return (
        <Card className="flex flex-col h-full">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={`https://avatar.vercel.sh/${member.email}`} alt={member.name} />
                        <AvatarFallback>{member.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <h3 className="font-semibold leading-none">{member.name && member.name !== 'Employee' ? member.name : member.email}</h3>
                        <p className="text-sm text-muted-foreground">{member.job_title || 'Employee'}</p>
                    </div>
                </div>
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
            </CardHeader>
            <CardContent className="flex-1 space-y-4 pt-4">

                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Department</span>
                    <span className="font-medium">{member.department_id || '-'}</span>
                </div>

                {member.active_appraisal_status && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Appraisal</span>
                        <Badge variant={member.active_appraisal_status === 'overdue' ? 'destructive' : 'secondary'} className="capitalize">
                            {member.active_appraisal_status.replace('_', ' ')}
                        </Badge>
                    </div>
                )}

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
                <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href={`mailto:${member.email}`}>
                        <Mail className="mr-2 h-3 w-3" /> Email
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
