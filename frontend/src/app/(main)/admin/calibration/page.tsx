"use client";

import { useState } from "react";
import { useAppraisals, useCalibrateAppraisal } from "@/hooks/use-appraisals";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Loader2, Scale, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

// ── Helpers ──────────────────────────────────────────────────────────────────

function RatingPill({ rating }: { rating: number | null | undefined }) {
    if (rating == null) {
        return <span className="text-muted-foreground text-sm">—</span>;
    }
    const r = Math.round(rating);
    const colors: Record<number, string> = {
        1: "bg-red-100 text-red-700 border-red-200",
        2: "bg-orange-100 text-orange-700 border-orange-200",
        3: "bg-amber-100 text-amber-700 border-amber-200",
        4: "bg-green-100 text-green-700 border-green-200",
        5: "bg-emerald-100 text-emerald-700 border-emerald-200",
    };
    return (
        <span
            className={`inline-block px-2 py-0.5 rounded border text-sm font-semibold ${colors[r] ?? "bg-muted text-muted-foreground"}`}
        >
            {rating.toFixed(1)}
        </span>
    );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function CalibrationRow({ appraisal }: { appraisal: any }) {
    const [expanded, setExpanded] = useState(false);
    const [ratingInput, setRatingInput] = useState("");
    const [notes, setNotes] = useState("");
    const calibrate = useCalibrateAppraisal();

    const employeeName = appraisal.employee_name || appraisal.employee_id;
    const managerName = appraisal.manager_name || "—";
    const cycleName = appraisal.cycle_name || "—";

    const parsedRating = parseFloat(ratingInput);
    const ratingValid = !isNaN(parsedRating) && parsedRating >= 1 && parsedRating <= 5;

    const handleSubmit = () => {
        if (!ratingValid) return;
        calibrate.mutate(
            {
                appraisalId: appraisal.id,
                overall_rating: parsedRating,
                calibration_notes: notes.trim() || undefined,
            },
            {
                onSuccess: () => {
                    setExpanded(false);
                    setRatingInput("");
                    setNotes("");
                },
            }
        );
    };

    return (
        <>
            <TableRow
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setExpanded((v) => !v)}
            >
                <TableCell className="font-medium">
                    <Link
                        href={`/appraisals/${appraisal.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:underline text-primary"
                    >
                        {employeeName}
                    </Link>
                    {appraisal.employee_email && (
                        <p className="text-xs text-muted-foreground">
                            {appraisal.employee_email}
                        </p>
                    )}
                </TableCell>
                <TableCell>{managerName}</TableCell>
                <TableCell>{cycleName}</TableCell>
                <TableCell>
                    <RatingPill rating={appraisal.overall_rating} />
                </TableCell>
                <TableCell>
                    <RatingPill rating={appraisal.calculated_rating} />
                </TableCell>
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

            {expanded && (
                <TableRow>
                    <TableCell colSpan={6} className="bg-muted/20 py-4">
                        <div className="space-y-4 px-4">
                            <p className="text-sm font-medium">
                                Set calibrated overall rating for{" "}
                                <span className="text-primary">{employeeName}</span>
                            </p>

                            {/* Goal breakdown (if available) */}
                            {appraisal.goals && appraisal.goals.length > 0 && (
                                <div className="rounded-md border bg-background overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/40">
                                                <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                                                    Goal
                                                </th>
                                                <th className="text-center px-3 py-2 font-medium text-muted-foreground">
                                                    Self
                                                </th>
                                                <th className="text-center px-3 py-2 font-medium text-muted-foreground">
                                                    Manager
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {appraisal.goals.map((g: any) => (
                                                <tr key={g.id} className="border-b last:border-0">
                                                    <td className="px-3 py-2">{g.title}</td>
                                                    <td className="px-3 py-2 text-center">
                                                        <RatingPill rating={g.self_rating} />
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        <RatingPill rating={g.manager_rating} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Calibration form */}
                            <div className="flex items-end gap-3 flex-wrap pt-1">
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">
                                        Calibrated Rating (1.0 – 5.0)
                                    </label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="5"
                                        step="0.1"
                                        value={ratingInput}
                                        onChange={(e) => setRatingInput(e.target.value)}
                                        className="w-32"
                                        placeholder="e.g. 3.5"
                                    />
                                </div>
                                <div className="flex-1 min-w-[200px]">
                                    <label className="text-xs text-muted-foreground mb-1 block">
                                        Calibration Notes (optional)
                                    </label>
                                    <Textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Reason for override..."
                                        rows={2}
                                    />
                                </div>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={!ratingValid || calibrate.isPending}
                                >
                                    {calibrate.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                    )}
                                    Confirm &amp; Move to Sign-Off
                                </Button>
                            </div>
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CalibrationPage() {
    const { data: appraisals, isLoading } = useAppraisals(
        undefined,
        "all",
        "calibration"
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const list = appraisals ?? [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Scale className="h-8 w-8" />
                    Calibration
                </h1>
                <p className="text-muted-foreground">
                    Review manager ratings and set calibrated final scores before employee
                    sign-off.
                </p>
            </div>

            {/* Empty state */}
            {list.length === 0 ? (
                <Card>
                    <CardContent className="py-20 text-center">
                        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold">
                            No Appraisals Pending Calibration
                        </h3>
                        <p className="text-muted-foreground text-sm mt-1">
                            All appraisals have been calibrated, or no active cycle requires
                            calibration.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Pending Calibration</CardTitle>
                        <CardDescription>
                            {list.length} appraisal{list.length !== 1 ? "s" : ""} awaiting HR
                            calibration. Click a row to set the calibrated rating and move it to
                            employee sign-off.
                        </CardDescription>
                    </CardHeader>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead>Manager</TableHead>
                                <TableHead>Cycle</TableHead>
                                <TableHead>Manager Rating</TableHead>
                                <TableHead>Calc. Rating</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {list.map((a: any) => (
                                <CalibrationRow key={a.id} appraisal={a} />
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
}
