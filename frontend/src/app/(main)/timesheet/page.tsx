
"use client";

import { useState, useMemo } from "react";
import { useProjects, useWeeklyTimesheet, useUpsertEntries, useSubmitTimesheet } from "@/hooks/use-timesheet";
import { format, startOfWeek, endOfWeek, addDays, subWeeks, addWeeks, parseISO, isSameDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Save, Send, Plus, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function TimesheetPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const dateStr = format(currentDate, "yyyy-MM-dd");

    const { data: projects } = useProjects();
    const { data: timesheetData, isLoading } = useWeeklyTimesheet(dateStr);
    const upsertMutation = useUpsertEntries();
    const submitMutation = useSubmitTimesheet();

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)), [weekStart]);

    const [localEntries, setLocalEntries] = useState<any[]>([]);
    const [isModified, setIsModified] = useState(false);

    // Sync server data to local state when loaded
    useMemo(() => {
        if (timesheetData) {
            setLocalEntries(timesheetData.entries || []);
            setIsModified(false);
        }
    }, [timesheetData]);

    const handleHourChange = (date: Date, projectId: string, hours: string) => {
        const hoursNum = parseFloat(hours) || 0;
        const dateStr = format(date, "yyyy-MM-dd");

        setLocalEntries(prev => {
            const existingIdx = prev.findIndex(e => e.date === dateStr && e.project_id === projectId);
            const newEntries = [...prev];

            if (existingIdx >= 0) {
                newEntries[existingIdx] = { ...newEntries[existingIdx], hours: hoursNum };
            } else {
                newEntries.push({
                    date: dateStr,
                    project_id: projectId,
                    hours: hoursNum,
                    description: "",
                    entry_type: "WORK"
                });
            }
            return newEntries;
        });
        setIsModified(true);
    };

    const currentStatus = timesheetData?.weekly_summary?.status || "DRAFT";
    const isReadOnly = currentStatus !== "DRAFT" && currentStatus !== "REJECTED";

    const handleSave = () => {
        upsertMutation.mutate(localEntries);
    };

    const handleSubmit = () => {
        if (window.confirm("Submit this timesheet for approval?")) {
            submitMutation.mutate(format(weekStart, "yyyy-MM-dd"));
        }
    };

    if (isLoading) return <TimesheetSkeleton />;

    // Unique projects in local entries
    const activeProjectIds = Array.from(new Set(localEntries.map(e => e.project_id)));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Weekly Timesheet</h1>
                    <p className="text-muted-foreground mt-1">
                        Week of {format(weekStart, "MMM d")} - {format(endOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d, yyyy")}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={currentStatus === "APPROVED" ? "default" : currentStatus === "SUBMITTED" ? "secondary" : "outline"} className="px-3 py-1">
                        Status: {currentStatus}
                    </Badge>
                    <div className="flex items-center border rounded-md bg-background">
                        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="px-2 text-sm font-medium">This Week</div>
                        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader className="bg-primary/5 pb-4">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Hours Allocation</CardTitle>
                        <div className="flex gap-2">
                            {!isReadOnly && (
                                <>
                                    <Button variant="outline" size="sm" onClick={handleSave} disabled={!isModified || upsertMutation.isPending}>
                                        <Save className="h-4 w-4 mr-2" /> Save Draft
                                    </Button>
                                    <Button size="sm" onClick={handleSubmit} disabled={isModified || submitMutation.isPending}>
                                        <Send className="h-4 w-4 mr-2" /> Submit
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="p-4 text-left font-medium min-w-[200px]">Project</th>
                                    {weekDays.map(day => (
                                        <th key={day.toString()} className="p-4 text-center font-medium">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-muted-foreground uppercase">{format(day, "eee")}</span>
                                                <span>{format(day, "d")}</span>
                                            </div>
                                        </th>
                                    ))}
                                    <th className="p-4 text-center font-medium">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {activeProjectIds.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="p-8 text-center text-muted-foreground italic">
                                            No projects added. Use the selector below to add a project.
                                        </td>
                                    </tr>
                                )}
                                {activeProjectIds.map(projId => {
                                    const project = projects?.find(p => p.id === projId);
                                    let rowTotal = 0;
                                    return (
                                        <tr key={projId} className="hover:bg-muted/30 transition-colors">
                                            <td className="p-4">
                                                <div className="font-semibold">{project?.name || "Unknown Project"}</div>
                                                <div className="text-[10px] text-muted-foreground uppercase tracking-tighter">{project?.code}</div>
                                            </td>
                                            {weekDays.map(day => {
                                                const dateStr = format(day, "yyyy-MM-dd");
                                                const entry = localEntries.find(e => e.date === dateStr && e.project_id === projId);
                                                const hours = entry?.hours || 0;
                                                rowTotal += hours;

                                                return (
                                                    <td key={day.toString()} className="p-2 text-center">
                                                        <Input
                                                            type="number"
                                                            step="0.5"
                                                            min="0"
                                                            max="24"
                                                            value={hours || ""}
                                                            onChange={(e) => handleHourChange(day, projId, e.target.value)}
                                                            className="w-16 mx-auto text-center h-9"
                                                            disabled={isReadOnly || entry?.entry_type === "LEAVE"}
                                                        />
                                                        {entry?.entry_type === "LEAVE" && (
                                                            <Badge variant="secondary" className="mt-1 text-[10px] scale-90">Leave</Badge>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="p-4 text-center font-bold text-primary">
                                                {rowTotal.toFixed(1)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-muted/20">
                                <tr className="border-t-2">
                                    <td className="p-4 font-bold">Total Hours</td>
                                    {weekDays.map(day => {
                                        const dateStr = format(day, "yyyy-MM-dd");
                                        const dayTotal = localEntries
                                            .filter(e => e.date === dateStr)
                                            .reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0);
                                        return (
                                            <td key={day.toString()} className="p-4 text-center font-bold">
                                                {dayTotal.toFixed(1)}
                                            </td>
                                        );
                                    })}
                                    <td className="p-4 text-center font-bold text-premium-600">
                                        {timesheetData?.weekly_summary?.total_hours || 0}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    {!isReadOnly && (
                        <div className="p-4 bg-muted/30 flex items-center justify-between border-t">
                            <div className="flex items-center gap-2 max-w-sm">
                                <Select onValueChange={(val) => {
                                    if (!activeProjectIds.includes(val)) {
                                        setLocalEntries(prev => [...prev, {
                                            date: format(weekDays[0], "yyyy-MM-dd"), // placeholder
                                            project_id: val,
                                            hours: 0,
                                            entry_type: "WORK"
                                        }]);
                                        setIsModified(true);
                                    }
                                }}>
                                    <SelectTrigger className="w-[200px] h-9">
                                        <SelectValue placeholder="Add Project..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projects?.filter(p => !activeProjectIds.includes(p.id)).map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span className="text-xs text-muted-foreground">Select a project to add a new row</span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {currentStatus === "REJECTED" && timesheetData?.weekly_summary?.reviewer_comment && (
                <Card className="border-rose-200 bg-rose-50/50">
                    <CardContent className="pt-4 flex items-start gap-4">
                        <div className="p-2 bg-rose-100 rounded-full">
                            <Trash2 className="h-5 w-5 text-rose-600" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-rose-900">Timesheet Rejected</h4>
                            <p className="text-sm text-rose-700 mt-1">
                                Comment: {timesheetData.weekly_summary.reviewer_comment}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function TimesheetSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-[300px]" />
            <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
    );
}
