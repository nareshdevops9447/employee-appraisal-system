
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Appraisal } from "@/types/appraisal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import Link from "next/link";

export const columns: ColumnDef<Appraisal>[] = [
    {
        accessorKey: "cycle_id", // We need cycle name, but API returns ID for now. Maybe update hook to fetch cycle details? 
        // Or just show ID for now, or join data. Let's assume we can get cycle name later.
        header: "Cycle",
        cell: ({ row }) => {
            return <div>Cycle {row.getValue("cycle_id")}</div>;
        }
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as string;
            let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
            if (status === 'completed') variant = "default";
            if (status === 'in_progress') variant = "secondary";

            return (
                <Badge variant={variant} className="capitalize">
                    {status.replace('_', ' ')}
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
            return <div>{date.toLocaleDateString()}</div>
        }
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const appraisal = row.original;
            return (
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/appraisals/${appraisal.id}`}>
                        View <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            );
        },
    },
];
