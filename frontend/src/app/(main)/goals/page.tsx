
"use client";

import { useGoals, useGoalStats } from "@/hooks/use-goals";
import { columns } from "./columns";
import { DataTable } from "@/components/shared/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, LayoutGrid, List as ListIcon, Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { GoalFilters } from "@/components/goals/goal-filters";
import { GoalCard } from "@/components/goals/goal-card";
import { useSearchParams } from "next/navigation";
import { useState, useRef } from "react";
import { GoalProgressRing } from "@/components/goals/goal-progress-ring";
import { useSession } from "next-auth/react";
import { useDownloadGoalTemplate, useUploadGoals, BulkUploadResult } from "@/hooks/use-bulk-goals";
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
                    {isManagerOrHR && <BulkUploadDialog />}
                    <Button asChild>
                        <Link href="/goals/new">
                            <Plus className="mr-2 h-4 w-4" /> New Goal
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.in_progress || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.completed || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <div className="text-2xl font-bold">{Math.round(stats?.average_progress || 0)}%</div>
                            <GoalProgressRing progress={stats?.average_progress || 0} size={32} strokeWidth={4} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="my-goals" className="space-y-4" onValueChange={(v) => {
                // If switching tabs, we might want to clear params or handle routing,
                // but for now let's just use local state or params.
                // Actually, simple way: params drive the data.
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
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">No goals found matching your filters.</p>
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
                    <GoalFilters />
                    {goalsLoading ? (
                        <GoalsPageSkeleton />
                    ) : filteredGoals?.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">No team goals found.</p>
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

