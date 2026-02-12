
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DepartmentStats } from "@/hooks/use-reports";

interface CompletionChartProps {
    data?: DepartmentStats[];
}

export function CompletionChart({ data }: CompletionChartProps) {
    const chartData = data || [];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cycle Completion by Department</CardTitle>
                <CardDescription>Percentage of appraisals completed per department.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                        <XAxis type="number" unit="%" fontSize={12} stroke="#888888" />
                        <YAxis dataKey="department" type="category" width={100} fontSize={12} stroke="#888888" />
                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="completion_rate" name="Completion %" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
