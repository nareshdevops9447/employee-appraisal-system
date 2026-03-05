"use client";

import { useGoal, useGoals } from "@/hooks/use-goals";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, MoreVertical, Pencil, Target, User, ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { KeyResultItem } from "@/components/goals/key-result-item";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAddKeyResult } from "@/hooks/use-key-results";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoalApprovalActions } from "@/components/goals/goal-approval-actions";
import { GoalCommentTimeline } from "@/components/goals/goal-comment-timeline";
import { GoalAuditTrail } from "@/components/goals/goal-audit-trail";
import { GoalVersionHistory } from "@/components/goals/goal-version-history";
import { useUser } from "@/hooks/use-user";
import { useDeleteGoal } from "@/hooks/use-goals";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";


export default function GoalDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = (params?.id as string) || '';
    const { data: goal, isLoading } = useGoal(id);
    const { data: allGoals } = useGoals({});
    const { data: session } = useSession();
    const { data: assignedUser } = useUser(goal?.employee_id);
    const deleteGoal = useDeleteGoal();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // Prev/Next navigation
    const { prevGoal, nextGoal, currentIndex, totalGoals } = useMemo(() => {
        if (!allGoals || !id) return { prevGoal: null, nextGoal: null, currentIndex: -1, totalGoals: 0 };
        const idx = allGoals.findIndex(g => g.id === id);
        return {
            prevGoal: idx > 0 ? allGoals[idx - 1] : null,
            nextGoal: idx < allGoals.length - 1 ? allGoals[idx + 1] : null,
            currentIndex: idx,
            totalGoals: allGoals.length,
        };
    }, [allGoals, id]);

    // Check permissions
    const isOwner = session?.user?.id === goal?.employee_id;
    const isManager = session?.user?.id === assignedUser?.manager_id;
    const isAdmin = session?.user?.role === 'hr_admin' || session?.user?.role === 'super_admin';
    const canEditOrDelete = isOwner || isManager || isAdmin;
    const isApproved = goal?.approval_status === 'approved';
    const canEditStructure = canEditOrDelete && (!isApproved || isAdmin);
    if (isLoading) return <div className="space-y-6"><Skeleton className="h-12 w-1/2" /><Skeleton className="h-64 w-full" /></div>;
    if (!goal) return <div>Goal not found</div>;

    return (
        <div className="space-y-6">
            {/* Breadcrumb + Prev/Next Navigation */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                    <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground" asChild>
                        <Link href="/goals">
                            <ArrowLeft className="h-4 w-4" />
                            Goals
                        </Link>
                    </Button>
                    <span className="text-muted-foreground">/</span>
                    <span className="font-medium truncate max-w-[300px]">{goal.title}</span>
                </div>
                {totalGoals > 1 && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                            {currentIndex + 1} of {totalGoals}
                        </span>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={!prevGoal}
                                onClick={() => prevGoal && router.push(`/goals/${prevGoal.id}`)}
                                title={prevGoal ? `Previous: ${prevGoal.title}` : 'No previous goal'}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={!nextGoal}
                                onClick={() => nextGoal && router.push(`/goals/${nextGoal.id}`)}
                                title={nextGoal ? `Next: ${nextGoal.title}` : 'No next goal'}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="capitalize">{goal.category.replace('_', ' ')}</Badge>
                        <Badge variant={goal.priority === 'high' || goal.priority === 'critical' ? 'destructive' : 'secondary'} className="capitalize">
                            {goal.priority}
                        </Badge>
                        <Badge variant={goal.approval_status === 'approved' ? 'default' : 'outline'} className="capitalize">
                            {goal.approval_status?.replace('_', ' ')}
                        </Badge>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">{goal.title}</h1>
                </div>
                <div className="flex items-center gap-2">
                    {/* Approval Actions */}
                    <GoalApprovalActions
                        goal={goal}
                        currentUserId={session?.user?.id || ''}
                        onEditClick={() => router.push(`/goals/${goal.id}/edit`)}
                    />

                    {canEditStructure && (
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/goals/${goal?.id}/edit`}>
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
                            {canEditStructure && (
                                <>
                                    <DropdownMenuItem asChild>
                                        <Link href={`/goals/${goal?.id}/edit`}>
                                            <Pencil className="w-4 h-4 mr-2" />
                                            Edit
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={() => setShowDeleteDialog(true)}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete Goal
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the goal
                            &quot;<strong>{goal.title}</strong>&quot; and all its associated key results and comments.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                deleteGoal.mutate(goal.id, {
                                    onSuccess: () => {
                                        router.push('/goals');
                                    }
                                });
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>


            {/* Main Content Grid */}
            <div className="grid gap-6 md:grid-cols-3">

                {/* Left Column: Progress & Key Results */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="border-0 shadow-md">
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

                    <Card className="border-0 shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle>Key Results</CardTitle>
                            {canEditStructure && <AddKeyResultDialog goalId={goal.id} />}
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {goal.key_results && goal.key_results.length > 0 ? (
                                goal.key_results.map(kr => (
                                    <KeyResultItem key={kr.id} keyResult={kr} isOwnerOrManager={canEditOrDelete} />

                                ))
                            ) : (
                                <p className="text-muted-foreground italic text-sm">No key results defined.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Timeline & Comments */}
                    <GoalCommentTimeline
                        goalId={goal.id}
                        canComment={true}
                        currentUserId={session?.user?.id || ''}
                    />

                    <GoalAuditTrail goalId={goal.id} />
                </div>

                {/* Right Column: Meta Info */}
                <div className="space-y-6">
                    <Card className="border-0 shadow-md">
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
                            {goal.category === 'performance' && goal.weight !== undefined && (
                                <>
                                    <div className="flex items-center gap-2">
                                        <Target className="w-4 h-4 text-muted-foreground" />
                                        <div>
                                            <p className="font-medium">Total Goal Weight</p>
                                            <p className="text-muted-foreground">{goal.weight}%</p>
                                        </div>
                                    </div>
                                    <Separator />
                                </>
                            )}
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">Assigned To</p>
                                    <p className="text-muted-foreground">
                                        {assignedUser
                                            ? (assignedUser.name || assignedUser.email || goal.employee_id)
                                            : goal.employee_id
                                        }
                                    </p>
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

                    {goal.version_number > 1 && (
                        <GoalVersionHistory goalId={goal.id} currentVersion={goal.version_number} />
                    )}
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
