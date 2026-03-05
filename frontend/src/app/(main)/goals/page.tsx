
"use client";

import { useGoals, useGoalStats } from "@/hooks/use-goals";
import { columns } from "./columns";
import { DataTable } from "@/components/shared/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, LayoutGrid, List as ListIcon, Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, Target, Clock } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { GoalFilters } from "@/components/goals/goal-filters";
import { GoalCard } from "@/components/goals/goal-card";
import { TeamGoalsPanel } from "@/components/goals/team-goals-panel";
import { useSearchParams } from "next/navigation";
import { useState, useRef } from "react";
import { GoalProgressRing } from "@/components/goals/goal-progress-ring";
import { useSession } from "next-auth/react";
import { useDownloadGoalTemplate, useUploadGoals, BulkUploadResult } from "@/hooks/use-bulk-goals";
import { useBulkSubmitGoals } from "@/hooks/use-goal-approval";
import { useTeamMembers } from "@/hooks/use-team";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";


import { Suspense } from "react";

export default function GoalsPage() {
    return (
        <Suspense fallback={<GoalsPageSkeleton />}>
            <GoalsContent />
        </Suspense>
    )
}

function GoalsContent() {
    const searchParams = useSearchParams();
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
    const { data: session } = useSession();
    const userRole = session?.user?.role || 'employee';
    const isManagerOrHR = ['manager', 'hr_admin', 'super_admin'].includes(userRole);

    // Extract filters from URL
    const status = searchParams?.get('status') || undefined;
    const category = searchParams?.get('category') || undefined;
    const priority = searchParams?.get('priority') || undefined;
    const scope = searchParams?.get('scope') || undefined;
    const employee_id = searchParams?.get('employee_id') || undefined;

    const { data: goals, isLoading: goalsLoading } = useGoals({ status, category, priority, scope, employee_id });
    const { data: stats, isLoading: statsLoading } = useGoalStats();

    // Basic client-side filtering for title if API doesn't support it yet
    const filteredGoals = goals?.filter(goal => {
        const titleFilter = searchParams?.get('title')?.toLowerCase();
        if (!titleFilter) return true;
        return goal.title.toLowerCase().includes(titleFilter);
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold tracking-tight">Goals</h1>
                    <p className="text-muted-foreground">
                        Track and manage your performance objectives.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {scope !== 'team' && (
                        <div className="bg-muted p-1 rounded-md flex items-center">
                            <Button
                                variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setViewMode('cards')}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setViewMode('table')}
                            >
                                <ListIcon className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                    {isManagerOrHR && (
                        <>
                            <SubmitTeamGoalsDialog />
                            <BulkUploadDialog />
                        </>
                    )}
                    <Button asChild>
                        <Link href="/goals/new">
                            <Plus className="mr-2 h-4 w-4" /> New Goal
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-transparent" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Goals</CardTitle>
                        <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
                            <Target className="h-4 w-4 text-violet-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="relative">
                        <div className="text-3xl font-bold">{stats?.total || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Across all categories</p>
                    </CardContent>
                </Card>
                <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                        <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
                        <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="relative">
                        <div className="text-3xl font-bold">{stats?.in_progress || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Currently active</p>
                    </CardContent>
                </Card>
                <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
                        <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="relative">
                        <div className="text-3xl font-bold">{stats?.completed || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Successfully achieved</p>
                    </CardContent>
                </Card>
                <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Avg Progress</CardTitle>
                        <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                            <GoalProgressRing progress={stats?.average_progress || 0} size={20} strokeWidth={3} />
                        </div>
                    </CardHeader>
                    <CardContent className="relative">
                        <div className="text-3xl font-bold">{Math.round(stats?.average_progress || 0)}%</div>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-amber-100 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
                                style={{ width: `${Math.min(stats?.average_progress || 0, 100)}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={scope === 'team' ? 'team-goals' : 'my-goals'} className="space-y-4" onValueChange={(v) => {
                // Tab changes are handled via Link navigation
            }}>
                <TabsList>
                    <TabsTrigger value="my-goals" asChild>
                        <Link href="/goals">My Goals</Link>
                    </TabsTrigger>
                    <TabsTrigger value="team-goals" disabled={!isManagerOrHR} asChild>
                        <Link href="/goals?scope=team" className={!isManagerOrHR ? "pointer-events-none opacity-50" : ""}>Team Goals</Link>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="my-goals" className="space-y-4 data-[state=inactive]:hidden data-[state=active]:block">
                    {/* We reuse the same content, just filtered by the hook based on URL params */}
                    <GoalFilters />

                    {goalsLoading ? (
                        <GoalsPageSkeleton />
                    ) : filteredGoals?.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                <Target className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-1">No goals found</h3>
                            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                                {goals?.length === 0
                                    ? "You haven't created any goals yet. Start by setting your first objective."
                                    : "No goals match your current filters. Try adjusting your search criteria."
                                }
                            </p>
                            {goals?.length === 0 && (
                                <Button asChild>
                                    <Link href="/goals/new">
                                        <Plus className="mr-2 h-4 w-4" /> Create Your First Goal
                                    </Link>
                                </Button>
                            )}
                        </div>
                    ) : viewMode === 'table' ? (
                        <Card>
                            <CardContent className="p-0">
                                <DataTable columns={columns} data={filteredGoals || []} />
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredGoals?.map((goal) => (
                                <GoalCard key={goal.id} goal={goal} />
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="team-goals" className="space-y-4 data-[state=inactive]:hidden data-[state=active]:block">
                    <TeamGoalsPanel />
                </TabsContent>
            </Tabs>
        </div>
    );
}

/* ─── Bulk Upload Dialog ─────────────────────────────────────────── */

function BulkUploadDialog() {
    const [open, setOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [result, setResult] = useState<BulkUploadResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const downloadTemplate = useDownloadGoalTemplate();
    const uploadGoals = useUploadGoals();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setResult(null);
        }
    };

    const handleUpload = () => {
        if (!selectedFile) return;
        uploadGoals.mutate(selectedFile, {
            onSuccess: (data) => {
                setResult(data);
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
        });
    };

    const handleClose = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) {
            setSelectedFile(null);
            setResult(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" /> Upload Goals
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                        Bulk Upload Goals
                    </DialogTitle>
                    <DialogDescription>
                        Upload an Excel file to assign goals to multiple team members at once.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Step 1: Template */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Step 1: Download Template</h4>
                        <p className="text-sm text-muted-foreground">
                            Get the template file, fill in one row per goal with team member emails.
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadTemplate.mutate()}
                            disabled={downloadTemplate.isPending}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            {downloadTemplate.isPending ? 'Downloading...' : 'Download Template'}
                        </Button>
                    </div>

                    {/* Step 2: Upload */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Step 2: Upload Filled File</h4>
                        <div className="flex items-center gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx"
                                onChange={handleFileChange}
                                className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                            />
                        </div>
                        {selectedFile && (
                            <p className="text-sm text-muted-foreground">
                                Selected: <span className="font-medium">{selectedFile.name}</span>
                            </p>
                        )}
                    </div>

                    {/* Results */}
                    {result && (
                        <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                            <div className="flex items-center gap-2">
                                {result.errors.length === 0 ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                ) : (
                                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                )}
                                <span className="font-semibold text-sm">{result.message}</span>
                            </div>
                            <div className="flex gap-3 text-sm">
                                <Badge variant="default">{result.created} created</Badge>
                                {result.skipped > 0 && <Badge variant="secondary">{result.skipped} skipped</Badge>}
                                {result.errors.length > 0 && (
                                    <Badge variant="destructive">{result.errors.length} errors</Badge>
                                )}
                            </div>
                            {result.errors.length > 0 && (
                                <div className="h-[120px] overflow-y-auto">
                                    <ul className="space-y-1 text-xs text-muted-foreground">
                                        {result.errors.map((err, idx) => (
                                            <li key={idx} className="flex gap-2">
                                                <span className="font-mono text-destructive">Row {err.row}:</span>
                                                <span>{err.message}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="secondary" onClick={() => handleClose(false)}>
                        {result ? 'Close' : 'Cancel'}
                    </Button>
                    {!result && (
                        <Button
                            onClick={handleUpload}
                            disabled={!selectedFile || uploadGoals.isPending}
                        >
                            {uploadGoals.isPending ? 'Uploading...' : 'Upload & Create Goals'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/* ─── Submit Team Goals Dialog ───────────────────────────────────── */

function SubmitTeamGoalsDialog() {
    const [open, setOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<string>("");

    const { data: teamMembers, isLoading: membersLoading } = useTeamMembers({ scope: 'all' });
    const bulkSubmit = useBulkSubmitGoals();

    // Filter to only active members who have a direct manager relationship
    const eligibleMembers = teamMembers?.filter(m => m.is_active) || [];

    const handleSubmit = () => {
        if (!selectedMember) return;
        bulkSubmit.mutate(selectedMember, {
            onSuccess: () => {
                setOpen(false);
                setSelectedMember("");
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) setSelectedMember("");
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-primary/20 hover:bg-primary/5">
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Submit Team Goals
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        Submit Team Goals
                    </DialogTitle>
                    <DialogDescription>
                        Select a team member to submit all their Draft and Revision Requested goals for approval at once.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">
                            Select Team Member
                        </label>
                        {membersLoading ? (
                            <Skeleton className="h-10 w-full" />
                        ) : (
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                                value={selectedMember}
                                onChange={(e) => setSelectedMember(e.target.value)}
                            >
                                <option value="" disabled>Choose a team member...</option>
                                {eligibleMembers.map((member) => (
                                    <option key={member.id} value={member.id}>
                                        {member.name} ({member.email})
                                    </option>
                                ))}
                            </select>
                        )}
                        <p className="text-xs text-muted-foreground pt-1">
                            Only goals in "Draft" or "Change Requested" state will be submitted.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="secondary" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!selectedMember || bulkSubmit.isPending}
                    >
                        {bulkSubmit.isPending ? 'Submitting...' : 'Submit Goals'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function GoalsPageSkeleton() {
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
                <Card key={i} className="h-[200px] flex flex-col justify-between">
                    <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                    <CardContent><Skeleton className="h-4 w-full" /></CardContent>
                    <CardContent><Skeleton className="h-10 w-full" /></CardContent>
                </Card>
            ))}
        </div>
    )
}

