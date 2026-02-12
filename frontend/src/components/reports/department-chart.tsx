
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface DepartmentChartProps {
    data?: any[];
}

export function DepartmentChart({ data }: DepartmentChartProps) {
    const chartData = data || [
        { department: 'Sales', avgRating: 4.2, completion: 85 },
        { department: 'Engineering', avgRating: 3.8, completion: 70 },
        { department: 'Marketing', avgRating: 4.5, completion: 92 },
        { department: 'HR', avgRating: 4.0, completion: 100 },
        { department: 'Product', avgRating: 3.9, completion: 75 },
    ];

    return (
        <Card className="col-span-2">
            <CardHeader>
                <CardTitle>Department Performance</CardTitle>
                <CardDescription>Average rating and completion rate by department.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="department" axisLine={false} tickLine={false} stroke="#888888" fontSize={12} />
                        <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} stroke="#888888" fontSize={12} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} stroke="#888888" fontSize={12} unit="%" />
                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="avgRating" name="Avg Rating" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={30} />
                        <Bar yAxisId="right" dataKey="completion" name="Completion %" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
