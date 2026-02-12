
"use client";

import { useGoal, useUpdateGoal } from "@/hooks/use-goals";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, CheckCircle2, MoreVertical, Pencil, Target, User } from "lucide-react";
import Link from "next/link";
import { GoalTimeline } from "@/components/goals/goal-timeline";
import { KeyResultItem } from "@/components/goals/key-result-item";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KeyResult } from "@/types/goal";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAddKeyResult } from "@/hooks/use-key-results";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function GoalDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const { data: goal, isLoading } = useGoal(id);
    const { data: session } = useSession();

    // Check permissions
    const isOwner = session?.user?.id === goal?.employee_id;
    // const isManager = ... (need manager check logic)
    const isOwnerOrManager = isOwner; // simplify for now

    if (isLoading) return <div className="space-y-6"><Skeleton className="h-12 w-1/2" /><Skeleton className="h-64 w-full" /></div>;
    if (!goal) return <div>Goal not found</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="capitalize">{goal.category.replace('_', ' ')}</Badge>
                        <Badge variant={goal.priority === 'high' || goal.priority === 'critical' ? 'destructive' : 'secondary'} className="capitalize">
                            {goal.priority}
                        </Badge>
                        <Badge variant={goal.status === 'completed' ? 'default' : 'outline'} className="capitalize">
                            {goal.status.replace('_', ' ')}
                        </Badge>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">{goal.title}</h1>
                </div>
                <div className="flex items-center gap-2">
                    {/* Manager Approval Actions */}
                    {/* TODO: Add proper manager check using session/role */}
                    {goal.approval_status === 'pending' && (
                        <div className="flex gap-2 mr-2">
                            <ApprovalActions goalId={goal.id} />
                        </div>
                    )}

                    {isOwnerOrManager && (
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/goals/${goal.id}/edit`}>
                                <Pencil className="w-4 h-4 mr-2" /> Edit Goal
                            </Link>
                        </Button>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-destructive">Delete Goal</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 md:grid-cols-3">

                {/* Left Column: Progress & Key Results */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Progress</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4">
                                <Progress value={goal.progress_percentage} className="h-4 flex-1" />
                                <span className="font-bold text-lg">{Math.round(goal.progress_percentage)}%</span>
                            </div>
                            {goal.description && (
                                <p className="text-muted-foreground">{goal.description}</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle>Key Results</CardTitle>
                            {isOwnerOrManager && <AddKeyResultDialog goalId={goal.id} />}
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {goal.key_results && goal.key_results.length > 0 ? (
                                goal.key_results.map(kr => (
                                    <KeyResultItem key={kr.id} keyResult={kr} isOwnerOrManager={isOwnerOrManager} />
                                ))
                            ) : (
                                <p className="text-muted-foreground italic text-sm">No key results defined.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Activity & Comments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <GoalTimeline goalId={goal.id} />
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Meta Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">Target Date</p>
                                    <p className="text-muted-foreground">{new Date(goal.target_date).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">Start Date</p>
                                    <p className="text-muted-foreground">{new Date(goal.start_date).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <Separator />
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">Assigned To</p>
                                    <p className="text-muted-foreground">{goal.employee_id}</p> {/* Fetch name if possible */}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">Approval Status</p>
                                    <Badge variant="outline" className="capitalize font-normal mt-1">{goal.approval_status}</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function AddKeyResultDialog({ goalId }: { goalId: string }) {
    const [open, setOpen] = useState(false);
    const addKeyResult = useAddKeyResult();
    const [title, setTitle] = useState("");
    const [target, setTarget] = useState(100);
    const [unit, setUnit] = useState("%");

    const handleSubmit = () => {
        addKeyResult.mutate({
            goalId,
            data: { title, target_value: target, unit, current_value: 0 }
        }, {
            onSuccess: () => {
                setOpen(false);
                setTitle("");
                setTarget(100);
                setUnit("%");
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Target className="w-4 h-4 mr-2" /> Add Key Result</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Key Result</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Title</Label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Close 5 deals" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Target Value</Label>
                            <Input type="number" value={target} onChange={e => setTarget(parseFloat(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label>Unit</Label>
                            <Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="%" />
                        </div>
                    </div>
                    <Button onClick={handleSubmit} disabled={addKeyResult.isPending} className="w-full">
                        {addKeyResult.isPending ? "Adding..." : "Add Key Result"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function ApprovalActions({ goalId }: { goalId: string }) {
    const updateGoal = useUpdateGoal();

    const handleApprove = () => {
        updateGoal.mutate({ id: goalId, data: { approval_status: 'approved' } });
    };

    const handleReject = () => {
        updateGoal.mutate({ id: goalId, data: { approval_status: 'revision_requested' } });
    };

    return (
        <>
            <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={handleApprove} disabled={updateGoal.isPending}>
                Approve
            </Button>
            <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={handleReject} disabled={updateGoal.isPending}>
                Request Revision
            </Button>
        </>
    )
}
