"use client";

import { useAppraisals } from "@/hooks/use-appraisals";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Loader2, ArrowLeft, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
        case "not_started":
            return "secondary";
        case "goals_approved":
        case "self_assessment_in_progress":
        case "manager_review":
        case "acknowledgement_pending":
            return "default";
        case "completed":
        case "closed":
            return "outline";
        default:
            return "secondary";
    }
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

export default function AppraisalHistoryPage() {
    // scope="mine" is default when not provided
    const { data: appraisals, isLoading } = useAppraisals();

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col gap-2 relative">
                <Button variant="ghost" size="sm" asChild className="w-fit mb-2 text-muted-foreground">
                    <Link href="/appraisals">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Current Appraisal
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold tracking-tight">Appraisal History</h1>
                <p className="text-muted-foreground">View your past performance reviews and ratings.</p>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Cycle Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last Updated</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {appraisals?.map((appraisal: any) => (
                            <TableRow key={appraisal.id}>
                                <TableCell className="font-medium">{appraisal.cycle_name || "—"}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">
                                        {formatCycleType(appraisal.cycle_type)}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={getStatusVariant(appraisal.status)}>
                                        {appraisal.status
                                            .split("_")
                                            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                                            .join(" ")}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {appraisal.updated_at ? format(new Date(appraisal.updated_at), "MMM d, yyyy") : '—'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href={`/appraisals/${appraisal.id}`}>
                                            View <ExternalLink className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {(!appraisals || appraisals.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                    No past appraisals found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
