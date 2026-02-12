
"use client";

import { useCycles, useActivateCycle, useStopCycle, AppraisalCycle } from "@/hooks/use-cycles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, PauseCircle } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivateCycleDialog } from "@/components/admin/activate-cycle-dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function formatDate(dateString: string) {
    if (!dateString) return 'N/A';
    try {
        return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
        return 'Invalid Date';
    }
}

export default function CyclesPage() {
    const { data: cycles, isLoading } = useCycles();
    const activateCycle = useActivateCycle();
    const stopCycle = useStopCycle();

    const handleActivate = (id: string, criteria: any) => {
        activateCycle.mutate({ id, criteria });
    };

    const handleStop = (id: string) => {
        stopCycle.mutate(id);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Appraisal Cycles</h1>
                    <p className="text-muted-foreground">Manage review periods and cycles.</p>
                </div>
                <Button asChild>
                    <Link href="/admin/cycles/new">
                        <Plus className="mr-2 h-4 w-4" /> Create Cycle
                    </Link>
                </Button>
            </div>

            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-[200px] w-full" />
                    ))}
                </div>
            ) : cycles?.length === 0 ? (
                <div className="text-center py-12 bg-muted/20 rounded-lg">
                    <p className="text-muted-foreground">No appraisal cycles found.</p>
                    <Button variant="link" asChild className="mt-2">
                        <Link href="/admin/cycles/new">Create your first cycle</Link>
                    </Button>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {cycles?.map((cycle) => (
                        <Card key={cycle.id}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-lg font-semibold">{cycle.name}</CardTitle>
                                <Badge variant={cycle.status === 'active' ? 'default' : cycle.status === 'completed' ? 'secondary' : 'outline'}>
                                    {cycle.status}
                                </Badge>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div className="text-sm text-muted-foreground">
                                    <p>Type: <span className="capitalize">{cycle.type}</span></p>
                                    <p>
                                        {formatDate(cycle.startDate)} - {formatDate(cycle.endDate)}
                                    </p>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    {cycle.status === 'draft' && (
                                        <>
                                            <ActivateCycleDialog
                                                cycleId={cycle.id}
                                                onActivate={handleActivate}
                                            />
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/admin/cycles/${cycle.id}/edit`}>
                                                    <Edit className="mr-2 h-3 w-3" /> Edit
                                                </Link>
                                            </Button>
                                        </>
                                    )}
                                    {cycle.status === 'active' && (
                                        <>
                                            <ActivateCycleDialog
                                                cycleId={cycle.id}
                                                onActivate={handleActivate}
                                                isSync={true}
                                            />
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" size="sm">
                                                        <PauseCircle className="mr-2 h-3 w-3" /> Stop
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Stop Cycle?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will revert the cycle to "Draft" status. You can edit it and re-activate later. Existing appraisals will remain but may be paused.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleStop(cycle.id)}>Stop Cycle</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
