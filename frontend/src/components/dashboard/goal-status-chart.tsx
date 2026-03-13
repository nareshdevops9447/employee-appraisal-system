"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import Link from "next/link";

interface GoalStatusChartProps {
    stats: {
        completed: number;
        in_progress: number;
        not_started: number;
    } | null | undefined;
}

export function GoalStatusChart({ stats }: GoalStatusChartProps) {
    if (!stats || (stats.completed === 0 && stats.in_progress === 0 && stats.not_started === 0)) {
        return (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground w-full bg-muted/20 rounded-lg mt-4 border border-dashed">
                No goal data available yet
            </div>
        );
    }

    const data = [];
    if (stats.completed > 0) data.push({ name: "Completed", value: stats.completed, color: "#10b981" });
    if (stats.in_progress > 0) data.push({ name: "In Progress", value: stats.in_progress, color: "#3b82f6" });
    if (stats.not_started > 0) data.push({ name: "Not Started", value: stats.not_started, color: "#f59e0b" });

    return (
        <Link href="/goals" className="block h-[250px] w-full mt-4 cursor-pointer group/chart">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
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
                    <Legend verticalAlign="bottom" height={36} />
                </PieChart>
            </ResponsiveContainer>
        </Link>
    );
}
