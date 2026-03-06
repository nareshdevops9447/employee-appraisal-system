
"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RatingDistribution } from "@/hooks/use-reports";

interface RatingDistributionChartProps {
    data?: RatingDistribution[];
}

export function RatingDistributionChart({ data }: RatingDistributionChartProps) {
    // Mock data if undefined
    const chartData = data || [
        { rating: 1, count: 2 },
        { rating: 2, count: 5 },
        { rating: 3, count: 15 },
        { rating: 4, count: 8 },
        { rating: 5, count: 3 },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Rating Distribution</CardTitle>
                <CardDescription>Distribution of appraisal ratings across the organization.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <XAxis
                            dataKey="rating"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="count" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
