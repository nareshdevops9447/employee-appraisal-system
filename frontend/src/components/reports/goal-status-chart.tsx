
"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GoalStatusStats } from "@/hooks/use-reports";

interface GoalStatusChartProps {
    data?: GoalStatusStats[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function GoalStatusChart({ data }: GoalStatusChartProps) {
    const chartData = data || [
        { status: 'Active', count: 45 },
        { status: 'Completed', count: 30 },
        { status: 'Overdue', count: 10 },
        { status: 'Cancelled', count: 5 },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Goal Status</CardTitle>
                <CardDescription>Current status of all goals.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="count"
                            nameKey="status"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
