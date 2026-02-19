"use client";

import { useCycles, useActivateCycle, useStopCycle, useDeleteCycle } from "@/hooks/use-cycles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, Play, Square, Loader2, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export default function CyclesPage() {
    const { data: cycles, isLoading } = useCycles();
    const activateCycle = useActivateCycle();
    const stopCycle = useStopCycle();
    const deleteCycle = useDeleteCycle();

    const handleActivate = (id: string) => {
        activateCycle.mutate({ id });
    };

    const handleStop = (id: string) => {
        if (confirm("Are you sure you want to stop this cycle?")) {
            stopCycle.mutate(id);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this cycle? This action cannot be undone.")) {
            deleteCycle.mutate(id, {
                onError: (error: any) => {
                    toast.error(error.response?.data?.message || "Failed to delete cycle");
                }
            });
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Appraisal Cycles</h1>
                    <p className="text-muted-foreground">Manage performance review cycles.</p>
                </div>
                <Button asChild>
                    <Link href="/admin/cycles/new">
                        <Plus className="mr-2 h-4 w-4" /> Create Cycle
                    </Link>
                </Button>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Dates</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {cycles?.map((cycle: any) => (
                            <TableRow key={cycle.id}>
                                <TableCell className="font-medium">{cycle.name}</TableCell>
                                <TableCell className="capitalize">
                                    {(cycle.cycle_type || cycle.type || 'annual').replace('_', ' ')}
                                </TableCell>
                                <TableCell>
                                    {cycle.start_date || cycle.startDate ? format(new Date(cycle.start_date || cycle.startDate), "MMM d, yyyy") : 'N/A'} -{" "}
                                    {cycle.end_date || cycle.endDate ? format(new Date(cycle.end_date || cycle.endDate), "MMM d, yyyy") : 'N/A'}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={cycle.status === "active" ? "default" : "secondary"}>
                                        {cycle.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        {/* Edit Action - Always available */}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            asChild
                                        >
                                            <Link href={`/admin/cycles/${cycle.id}/edit`}>
                                                <Pencil className="h-4 w-4" />
                                                <span className="sr-only">Edit</span>
                                            </Link>
                                        </Button>

                                        {/* Status-based Actions */}
                                        {cycle.status === "draft" && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleActivate(cycle.id)}
                                                    disabled={activateCycle.isPending}
                                                >
                                                    <Play className="mr-2 h-4 w-4" /> Activate
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => handleDelete(cycle.id)}
                                                    disabled={deleteCycle.isPending}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    <span className="sr-only">Delete</span>
                                                </Button>
                                            </>
                                        )}
                                        {cycle.status === "active" && (
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => handleStop(cycle.id)}
                                                disabled={stopCycle.isPending}
                                            >
                                                <Square className="mr-2 h-4 w-4" /> Stop
                                            </Button>
                                        )}
                                        {/* Allow delete for completed? Maybe, if safe. For now, only draft or we check backend error. */}
                                        {cycle.status === "completed" && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(cycle.id)}
                                                disabled={deleteCycle.isPending}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">Delete</span>
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {(!cycles || cycles.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                    No cycles found. Create one to get started.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}