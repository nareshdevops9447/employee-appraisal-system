"use client";

import { useState } from "react";
import { useAppeals, useReviewAppeal } from "@/hooks/use-appeals";
import type { EnrichedAppraisalAppeal } from "@/hooks/use-appeals";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Loader2,
    MessageSquareWarning,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

type AppealStatus = "pending" | "under_review" | "upheld" | "overturned";

const STATUS_META: Record<
    AppealStatus,
    { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
    pending: { label: "Pending", variant: "outline" },
    under_review: { label: "Under Review", variant: "secondary" },
    upheld: { label: "Upheld", variant: "destructive" },
    overturned: { label: "Overturned", variant: "default" },
};

// ── Appeal Row ────────────────────────────────────────────────────────────────

function AppealRow({ appeal }: { appeal: EnrichedAppraisalAppeal }) {
    const [expanded, setExpanded] = useState(false);
    const [decision, setDecision] = useState<"under_review" | "upheld" | "overturned">(
        "under_review"
    );
    const [reviewNotes, setReviewNotes] = useState("");
    const [newRatingInput, setNewRatingInput] = useState("");
    const reviewAppeal = useReviewAppeal();

    const meta =
        STATUS_META[appeal.status as AppealStatus] ?? { label: appeal.status, variant: "outline" };
    const isResolved = appeal.status === "upheld" || appeal.status === "overturned";

    const handleSubmit = () => {
        const payload: {
            appealId: string;
            status: "under_review" | "upheld" | "overturned";
            review_notes?: string;
            new_overall_rating?: number;
        } = {
            appealId: appeal.id,
            status: decision,
            review_notes: reviewNotes.trim() || undefined,
        };

        if (decision === "overturned" && newRatingInput) {
            const r = parseFloat(newRatingInput);
            if (!isNaN(r) && r >= 1 && r <= 5) {
                payload.new_overall_rating = r;
            }
        }

        reviewAppeal.mutate(payload, {
            onSuccess: () => {
                setExpanded(false);
            },
        });
    };

    return (
        <>
            <TableRow
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setExpanded((v) => !v)}
            >
                {/* Employee */}
                <TableCell className="font-medium">
                    <div>
                        <p>{appeal.employee_name}</p>
                        {appeal.employee_email && (
                            <p className="text-xs text-muted-foreground">{appeal.employee_email}</p>
                        )}
                    </div>
                </TableCell>

                {/* Cycle */}
                <TableCell>{appeal.cycle_name || "—"}</TableCell>

                {/* Status */}
                <TableCell>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                </TableCell>

                {/* Reason (truncated) */}
                <TableCell className="max-w-[220px]">
                    <p className="truncate text-sm text-muted-foreground">
                        {appeal.employee_reason}
                    </p>
                </TableCell>

                {/* Filed date */}
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {appeal.created_at
                        ? format(new Date(appeal.created_at), "MMM d, yyyy")
                        : "—"}
                </TableCell>

                {/* Expand toggle */}
                <TableCell>
                    <Button variant="ghost" size="sm">
                        {expanded ? (
                            <ChevronUp className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                    </Button>
                </TableCell>
            </TableRow>

            {/* Expanded detail */}
            {expanded && (
                <TableRow>
                    <TableCell colSpan={6} className="bg-muted/20 py-4">
                        <div className="space-y-4 px-4">
                            {/* Employee reason */}
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                    Employee&apos;s Reason
                                </p>
                                <p className="text-sm bg-background rounded-md p-3 border leading-relaxed">
                                    {appeal.employee_reason}
                                </p>
                            </div>

                            {/* Links + current rating */}
                            <div className="flex items-center gap-6 text-sm">
                                <Link
                                    href={`/appraisals/${appeal.appraisal_id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-primary hover:underline"
                                >
                                    View Appraisal →
                                </Link>
                                {appeal.overall_rating != null && (
                                    <span className="text-muted-foreground">
                                        Current rating:{" "}
                                        <strong className="text-foreground">
                                            {appeal.overall_rating.toFixed(1)}
                                        </strong>
                                    </span>
                                )}
                                {appeal.new_overall_rating != null && (
                                    <span className="text-muted-foreground">
                                        Adjusted to:{" "}
                                        <strong className="text-foreground">
                                            {appeal.new_overall_rating.toFixed(1)}
                                        </strong>
                                    </span>
                                )}
                            </div>

                            {/* Previous HR notes (resolved appeals) */}
                            {isResolved && appeal.review_notes && (
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                        HR Notes
                                    </p>
                                    <p className="text-sm bg-background rounded-md p-3 border">
                                        {appeal.review_notes}
                                    </p>
                                    {appeal.reviewed_at && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Reviewed:{" "}
                                            {format(new Date(appeal.reviewed_at), "MMM d, yyyy HH:mm")}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Review form — only for non-resolved appeals */}
                            {!isResolved && (
                                <div className="space-y-3 pt-2 border-t">
                                    <p className="text-sm font-medium">Update Appeal</p>

                                    <div className="flex flex-wrap items-end gap-3">
                                        {/* Decision selector */}
                                        <div>
                                            <label className="text-xs text-muted-foreground mb-1 block">
                                                Decision
                                            </label>
                                            <Select
                                                value={decision}
                                                onValueChange={(v) =>
                                                    setDecision(v as typeof decision)
                                                }
                                            >
                                                <SelectTrigger className="w-[175px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="under_review">
                                                        Under Review
                                                    </SelectItem>
                                                    <SelectItem value="upheld">
                                                        Upheld — dismiss appeal
                                                    </SelectItem>
                                                    <SelectItem value="overturned">
                                                        Overturned — adjust rating
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* New rating — only when overturned */}
                                        {decision === "overturned" && (
                                            <div>
                                                <label className="text-xs text-muted-foreground mb-1 block">
                                                    New Rating (1.0 – 5.0)
                                                </label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    max="5"
                                                    step="0.1"
                                                    value={newRatingInput}
                                                    onChange={(e) =>
                                                        setNewRatingInput(e.target.value)
                                                    }
                                                    className="w-28"
                                                    placeholder="e.g. 4.0"
                                                />
                                            </div>
                                        )}

                                        {/* Notes */}
                                        <div className="flex-1 min-w-[200px]">
                                            <label className="text-xs text-muted-foreground mb-1 block">
                                                Notes
                                            </label>
                                            <Textarea
                                                value={reviewNotes}
                                                onChange={(e) => setReviewNotes(e.target.value)}
                                                placeholder="Explain your decision..."
                                                rows={2}
                                            />
                                        </div>

                                        {/* Submit */}
                                        <Button
                                            onClick={handleSubmit}
                                            disabled={reviewAppeal.isPending}
                                        >
                                            {reviewAppeal.isPending && (
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            )}
                                            Save Decision
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AppealsPage() {
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const { data: appeals, isLoading } = useAppeals(
        statusFilter === "all" ? undefined : statusFilter
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const list = appeals ?? [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <MessageSquareWarning className="h-8 w-8" />
                        Appeals
                    </h1>
                    <p className="text-muted-foreground">
                        Manage employee appraisal appeal cases.
                    </p>
                </div>

                {/* Status filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[175px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Appeals</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="upheld">Upheld</SelectItem>
                        <SelectItem value="overturned">Overturned</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Empty state */}
            {list.length === 0 ? (
                <Card>
                    <CardContent className="py-20 text-center">
                        <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <h3 className="text-lg font-semibold">No Appeals Found</h3>
                        <p className="text-muted-foreground text-sm mt-1">
                            {statusFilter === "all"
                                ? "No employees have raised appeals yet."
                                : `No appeals with status "${statusFilter}".`}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Appeal Cases</CardTitle>
                        <CardDescription>
                            {list.length} appeal{list.length !== 1 ? "s" : ""} found. Click a row
                            to review and update the decision.
                        </CardDescription>
                    </CardHeader>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead>Cycle</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Filed</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {list.map((appeal) => (
                                <AppealRow key={appeal.id} appeal={appeal} />
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
}
