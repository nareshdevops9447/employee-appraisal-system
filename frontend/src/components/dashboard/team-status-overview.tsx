"use client";

import { useTeamMembers, TeamMember } from "@/hooks/use-team";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Users, Loader2 } from "lucide-react";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
    'not_started': '#94a3b8', // slate-400
    'goals_pending_approval': '#f59e0b', // amber-500
    'goals_approved': '#0ea5e9', // sky-500
    'self_assessment': '#3b82f6', // blue-500
    'self_assessment_in_progress': '#3b82f6', // blue-500
    'manager_review': '#a855f7', // purple-500
    'calibration': '#f43f5e', // rose-500
    'acknowledgement_pending': '#6366f1', // indigo-500
    'completed': '#10b981', // emerald-500
    'overdue': '#ef4444', // red-500
};

const STATUS_LABELS: Record<string, string> = {
    'not_started': 'Not Started',
    'goals_pending_approval': 'Goals Review',
    'goals_approved': 'Goals Approved',
    'self_assessment': 'Self Assessment',
    'self_assessment_in_progress': 'Self Assessment',
    'manager_review': 'Manager Review',
    'calibration': 'Calibration',
    'acknowledgement_pending': 'Awaiting Sign-off',
    'completed': 'Completed',
    'overdue': 'Overdue',
};

export function TeamStatusOverview() {
    const { data: team, isLoading, error } = useTeamMembers();

    console.log("TeamStatusOverview - team data:", team);
    if (error) console.error("TeamStatusOverview - error:", error);

    if (isLoading) {
        return (
            <Card className="col-span-1 border-0 shadow-md">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" /> Team Appraisal Status
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    if (!team || team.length === 0) {
        return (
            <Card className="col-span-1 border-0 shadow-md">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" /> Team Appraisal Status
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[250px] flex flex-col items-center justify-center text-center p-6">
                    <div className="bg-muted/30 p-4 rounded-full mb-4">
                        <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No team members found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        You don't have any direct reports assigned to you.
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Aggregate statuses
    const counts: Record<string, number> = {};
    team.forEach((member: TeamMember) => {
        const status = member.active_appraisal_status || 'not_started';
        counts[status] = (counts[status] || 0) + 1;
    });

    const data = Object.entries(counts).map(([status, count]) => ({
        name: STATUS_LABELS[status] || status,
        value: count,
        color: STATUS_COLORS[status] || '#cbd5e1'
    })).sort((a, b) => b.value - a.value);

    return (
        <Card className="col-span-1 border-0 shadow-md">
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" /> Team Appraisal Status
                </CardTitle>
                <p className="text-xs text-muted-foreground">Distribution across your {team.length} team members</p>
            </CardHeader>
            <CardContent>
                {data.length > 0 ? (
                    <Link href="/team" className="block h-[250px] w-full mt-2 cursor-pointer group/chart">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--background)", color: "var(--foreground)" }} 
                                    itemStyle={{ color: "var(--foreground)" }}
                                />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={60} 
                                    iconType="circle"
                                    wrapperStyle={{ fontSize: '10px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </Link>
                ) : (
                    <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                        No appraisal data found
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
