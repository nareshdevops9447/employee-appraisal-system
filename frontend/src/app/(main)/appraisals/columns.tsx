"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import Link from "next/link";

// Use a flexible type since the API now returns enriched appraisal data
interface AppraisalRow {
    id: string;
    cycle_id: string;
    cycle_name?: string;
    cycle_type?: string;
    status: string;
    updated_at: string;
    overall_rating?: number | null;
    [key: string]: any;
}

function formatCycleType(cycleType?: string | null): string {
    if (!cycleType) return "—";
    const labels: Record<string, string> = {
        annual: "Annual",
        mid_year: "Half Yearly",
        probation: "Probation",
    };
    return labels[cycleType] || cycleType;
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
        case "not_started":
            return "secondary";
        case "self_assessment":
        case "manager_review":
            return "default";
        case "completed":
        case "closed":
            return "outline";
        default:
            return "secondary";
    }
}

export const columns: ColumnDef<AppraisalRow>[] = [
    {
        accessorKey: "cycle_name",
        header: "Cycle",
        cell: ({ row }) => {
            const cycleName = row.original.cycle_name;
            return (
                <div className="font-medium">
                    {cycleName || row.original.cycle_id}
                </div>
            );
        },
    },
    {
        accessorKey: "cycle_type",
        header: "Type",
        cell: ({ row }) => {
            return (
                <Badge variant="outline">
                    {formatCycleType(row.original.cycle_type)}
                </Badge>
            );
        },
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as string;
            const label = status
                .split("_")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ");

            return (
                <Badge variant={getStatusVariant(status)}>
                    {label}
                </Badge>
            );
        },
    },
    {
        accessorKey: "updated_at",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Last Updated
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }) => {
            const date = new Date(row.getValue("updated_at"));
            return <div>{date.toLocaleDateString()}</div>;
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            return (
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/appraisals/${row.original.id}`}>
                        View <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            );
        },
    },
];