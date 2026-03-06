
"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface TrendChartProps {
    data?: any[];
}

export function TrendChart({ data }: TrendChartProps) {
    const chartData = data || [
        { month: 'Jan', completed: 4 },
        { month: 'Feb', completed: 7 },
        { month: 'Mar', completed: 5 },
        { month: 'Apr', completed: 12 },
        { month: 'May', completed: 18 },
        { month: 'Jun', completed: 14 },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Goal Completion Trend</CardTitle>
                <CardDescription>Goals completed over time.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={10} stroke="#888888" fontSize={12} />
                        <YAxis axisLine={false} tickLine={false} stroke="#888888" fontSize={12} />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Line type="monotone" dataKey="completed" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
