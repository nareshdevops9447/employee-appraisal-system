
"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppraisalTrend } from "@/hooks/use-reports";

interface TimelineChartProps {
    data?: AppraisalTrend[];
}

export function TimelineChart({ data }: TimelineChartProps) {
    const chartData = data || [];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Appraisal Progress Timeline</CardTitle>
                <CardDescription>Status breakdown over time.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        margin={{
                            top: 10,
                            right: 30,
                            left: 0,
                            bottom: 0,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={12} stroke="#888888" />
                        <YAxis axisLine={false} tickLine={false} fontSize={12} stroke="#888888" />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Area type="monotone" dataKey="completed" stackId="1" stroke="#4ade80" fill="#4ade80" />
                        <Area type="monotone" dataKey="in_progress" stackId="1" stroke="#facc15" fill="#facc15" />
                        <Area type="monotone" dataKey="not_started" stackId="1" stroke="#f87171" fill="#f87171" />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
