"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Send, Users, Globe, Building2, CheckCircle2, Clock, FileText, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useTeamMembers } from "@/hooks/use-team";
import { useMyDepartmentTemplates, usePushTemplatesToTeam, GoalTemplate } from "@/hooks/use-goal-templates";
import { useGoals } from "@/hooks/use-goals";
import { useAllActiveCycles, useActiveAppraisal } from "@/hooks/use-appraisals";
import { Goal } from "@/types/goal";
import Link from "next/link";

/* ─── Status badge helper ──────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
    const variants: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
        draft: { label: "Draft", className: "bg-slate-100 text-slate-700 border-slate-200", icon: <FileText className="w-3 h-3" /> },
        pending: { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock className="w-3 h-3" /> },
        approved: { label: "Approved", className: "bg-green-50 text-green-700 border-green-200", icon: <CheckCircle2 className="w-3 h-3" /> },
        rejected: { label: "Rejected", className: "bg-red-50 text-red-700 border-red-200", icon: <FileText className="w-3 h-3" /> },
    };
    const v = variants[status] || variants.draft;
    return (
        <Badge variant="outline" className={`text-xs flex items-center gap-1 w-fit ${v.className}`}>
            {v.icon}{v.label}
        </Badge>
    );
}

/* ─── Scope label helper ───────────────────────────────────────────── */
function ScopeLabel({ departmentId, departmentName }: { departmentId?: string | null; departmentName?: string | null }) {
    return (
        <Badge variant={departmentId ? "secondary" : "outline"} className="text-xs flex items-center gap-1 w-fit">
            {departmentId
                ? <><Building2 className="w-3 h-3" />{departmentName}</>
                : <><Globe className="w-3 h-3" />Org-wide</>
            }
        </Badge>
    );
}

/* ─── Member goals table ──────────────────────────────────────────── */
function MemberGoalsList({ goals }: { goals: Goal[] }) {
    if (goals.length === 0) return null;
    return (
        <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                    <tr>
                        <th className="text-left font-medium p-3">Title</th>
                        <th className="text-left font-medium p-3 w-[120px]">Scope</th>
                        <th className="text-left font-medium p-3 w-[100px]">Status</th>
                        <th className="text-left font-medium p-3 w-[100px]">Progress</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {goals.map((goal) => (
                        <tr key={goal.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3 font-medium">
                                <Link href={`/goals/${goal.id}`} className="text-primary hover:underline">
                                    {goal.title}
                                </Link>
                            </td>
                            <td className="p-3">
                                <ScopeLabel departmentId={goal.department_id} departmentName={goal.department_name} />
                            </td>
                            <td className="p-3">
                                <StatusBadge status={goal.approval_status} />
                            </td>
                            <td className="p-3 text-muted-foreground">
                                {goal.progress_percentage ?? 0}%
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* ─── Cycle badge helper ───────────────────────────────────────────── */
function CycleBadge({ cycleType, cycleName }: { cycleType?: string | null; cycleName?: string | null }) {
    const colors: Record<string, string> = {
        probation: "bg-purple-100 text-purple-700 border-purple-200",
        annual: "bg-blue-100 text-blue-700 border-blue-200",
        mid_year: "bg-teal-100 text-teal-700 border-teal-200",
    };
    const label = cycleName || cycleType || "Unknown";
    const colorClass = colors[cycleType ?? ""] || "bg-gray-100 text-gray-700 border-gray-200";
    return (
        <Badge variant="outline" className={`text-xs flex items-center gap-1 w-fit ${colorClass}`}>
            <Calendar className="w-3 h-3" />{label}
        </Badge>
    );
}

/* ═══════════════════════════════════════════════════════════════════════
   Main TeamGoalsPanel
   ═══════════════════════════════════════════════════════════════════════ */

export function TeamGoalsPanel() {
    const [selectedMemberId, setSelectedMemberId] = useState<string>("");
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);

    // Data hooks
    const { data: allActiveCycles } = useAllActiveCycles();
    const { data: memberAppraisal } = useActiveAppraisal(selectedMemberId || undefined);
    const { data: teamMembers, isLoading: teamLoading } = useTeamMembers();
    const pushTemplates = usePushTemplatesToTeam();

    // Determine the exact cycle to use when a member IS selected.
    // Priority: 1) The employee's existing appraisal cycle
    //           2) Infer from hiring date (< 6mo = probation, else annual)
    //           3) First available active cycle as last resort
    const effectiveCycleId = useMemo(() => {
        if (!selectedMemberId) return undefined;

        // 1. If the employee already has an appraisal, use that cycle
        if (memberAppraisal?.cycle_id) return memberAppraisal.cycle_id;

        // 2. Infer from hiring date
        if (allActiveCycles?.length && teamMembers?.length) {
            const member = teamMembers.find((m) => m.id === selectedMemberId);
            const startDate = member?.start_date ? new Date(member.start_date) : null;

            if (startDate) {
                const now = new Date();
                const monthsEmployed = (now.getFullYear() - startDate.getFullYear()) * 12
                    + (now.getMonth() - startDate.getMonth());
                const isProbation = monthsEmployed < 6;

                // Try to find a matching cycle type
                const preferred = allActiveCycles.find((c) =>
                    isProbation ? c.cycle_type === 'probation' : c.cycle_type === 'annual'
                );
                if (preferred) return preferred.id;
            }

            // 3. Fall back to first active cycle
            return allActiveCycles[0]?.id;
        }

        return undefined;
    }, [selectedMemberId, memberAppraisal, allActiveCycles, teamMembers]);

    // Resolve cycle metadata for the badge display
    const resolvedCycle = allActiveCycles?.find((c) => c.id === effectiveCycleId);
    const memberCycleName = memberAppraisal?.cycle_name || resolvedCycle?.name || "";
    const memberCycleType = memberAppraisal?.cycle_type || resolvedCycle?.cycle_type || "";

    // ── Templates: when member selected, fetch only their cycle.
    //    When no member selected, fetch ALL cycles' templates. ──
    const { data: memberCycleTemplates, isLoading: memberTemplatesLoading } = useMyDepartmentTemplates(
        effectiveCycleId ?? ""
    );

    // Fetch templates for each active cycle (for the "preview all" view)
    const cycle1Id = allActiveCycles?.[0]?.id ?? "";
    const cycle2Id = allActiveCycles?.[1]?.id ?? "";
    const { data: cycle1Templates } = useMyDepartmentTemplates(cycle1Id);
    const { data: cycle2Templates } = useMyDepartmentTemplates(cycle2Id);

    // Combine all cycle templates for the preview view (no member selected)
    const allCycleTemplates = useMemo(() => {
        if (selectedMemberId) return []; // Not used when member is selected
        const all: GoalTemplate[] = [];
        if (cycle1Templates) all.push(...cycle1Templates.filter((t) => t.is_active));
        if (cycle2Templates) all.push(...cycle2Templates.filter((t) => t.is_active));
        return all;
    }, [selectedMemberId, cycle1Templates, cycle2Templates]);

    // Group all-cycle templates by cycle_id for the preview
    const groupedByCycle = useMemo(() => {
        const groups: Record<string, { cycleName: string; cycleType: string; templates: GoalTemplate[] }> = {};
        for (const tmpl of allCycleTemplates) {
            const key = tmpl.cycle_id;
            if (!groups[key]) {
                groups[key] = {
                    cycleName: tmpl.cycle_name || "Unknown Cycle",
                    cycleType: tmpl.cycle_type || "annual",
                    templates: [],
                };
            }
            groups[key].templates.push(tmpl);
        }
        return groups;
    }, [allCycleTemplates]);

    // Active templates for the member-selected view
    const activeTemplates = useMemo(
        () => memberCycleTemplates?.filter((t) => t.is_active) ?? [],
        [memberCycleTemplates]
    );

    // Fetch selected member's goals
    const { data: memberGoals, isLoading: goalsLoading } = useGoals(
        selectedMemberId
            ? { scope: "team", employee_id: selectedMemberId }
            : undefined
    );

    // Titles of goals already assigned to this member
    const assignedTitles = useMemo(
        () => new Set(memberGoals?.map((g) => g.title) ?? []),
        [memberGoals]
    );

    // Auto-select already-assigned templates when goals load
    useEffect(() => {
        if (selectedMemberId && memberGoals) {
            const preChecked = activeTemplates
                .filter((t) => assignedTitles.has(t.title))
                .map((t) => t.id);
            setSelectedTemplateIds(preChecked);
        }
    }, [selectedMemberId, memberGoals]); // eslint-disable-line react-hooks/exhaustive-deps

    const toggleTemplate = (id: string) => {
        setSelectedTemplateIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedTemplateIds.length === activeTemplates.length) {
            setSelectedTemplateIds([]);
        } else {
            setSelectedTemplateIds(activeTemplates.map((t) => t.id));
        }
    };

    const handleMemberChange = (memberId: string) => {
        setSelectedMemberId(memberId);
        setSelectedTemplateIds([]);
    };

    const navigateMember = (direction: 'prev' | 'next') => {
        if (!teamMembers?.length) return;
        const currentIndex = teamMembers.findIndex(m => m.id === selectedMemberId);
        let newIndex: number;
        if (direction === 'prev') {
            newIndex = currentIndex <= 0 ? teamMembers.length - 1 : currentIndex - 1;
        } else {
            newIndex = currentIndex >= teamMembers.length - 1 ? 0 : currentIndex + 1;
        }
        handleMemberChange(teamMembers[newIndex].id);
    };

    const currentMemberIndex = teamMembers?.findIndex(m => m.id === selectedMemberId) ?? -1;

    const handleAssign = () => {
        if (!effectiveCycleId || !selectedMemberId || selectedTemplateIds.length === 0) return;
        pushTemplates.mutate({
            template_ids: selectedTemplateIds,
            cycle_id: effectiveCycleId,
            employee_id: selectedMemberId,
        });
    };

    const isLoading = teamLoading || (selectedMemberId && memberTemplatesLoading);
    const selectedMember = teamMembers?.find((m) => m.id === selectedMemberId);
    // Count new vs already-assigned
    const newCount = selectedTemplateIds.filter(
        (id) => !assignedTitles.has(activeTemplates.find((t) => t.id === id)?.title ?? "")
    ).length;
    const reassignCount = selectedTemplateIds.length - newCount;

    return (
        <div className="space-y-4">
            {/* ── Header toolbar ─────────────────────────────────── */}
            <Card className="border-primary/10 shadow-md">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="flex items-center gap-2 flex-1">
                            <Users className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">Team Member:</span>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => navigateMember('prev')}
                                    disabled={!teamMembers?.length}
                                    title="Previous team member"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Select value={selectedMemberId} onValueChange={handleMemberChange}>
                                    <SelectTrigger className="w-[220px]">
                                        <SelectValue placeholder="Select a member…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teamMembers?.map((member) => (
                                            <SelectItem key={member.id} value={member.id}>
                                                {member.name || `${member.first_name} ${member.last_name}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => navigateMember('next')}
                                    disabled={!teamMembers?.length}
                                    title="Next team member"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                            {selectedMemberId && teamMembers && (
                                <span className="text-xs text-muted-foreground">
                                    {currentMemberIndex + 1} of {teamMembers.length}
                                </span>
                            )}
                            {selectedMemberId && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedMemberId("");
                                        setSelectedTemplateIds([]);
                                    }}
                                >
                                    Clear
                                </Button>
                            )}
                        </div>

                        {/* Assign / Re-assign button */}
                        {selectedMemberId && selectedTemplateIds.length > 0 && (
                            <Button
                                onClick={handleAssign}
                                disabled={pushTemplates.isPending}
                                className="shrink-0"
                            >
                                {pushTemplates.isPending ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4 mr-2" />
                                )}
                                {newCount > 0 && reassignCount > 0
                                    ? `Assign ${newCount} New + Update ${reassignCount}`
                                    : newCount > 0
                                        ? `Assign ${newCount} Goal${newCount > 1 ? "s" : ""}`
                                        : `Update ${reassignCount} Goal${reassignCount > 1 ? "s" : ""}`
                                }
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ── Content area ─────────────────────────────────── */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : !selectedMemberId ? (
                /* ══ PREVIEW MODE: Show ALL templates from ALL active cycles ══ */
                Object.keys(groupedByCycle).length === 0 ? (
                    <Card>
                        <CardContent className="py-10 text-center">
                            <p className="text-muted-foreground">No active appraisal cycles or templates found.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {Object.entries(groupedByCycle).map(([cycleId, group]) => (
                            <Card key={cycleId}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-base">Goal Templates</CardTitle>
                                        <CycleBadge cycleType={group.cycleType} cycleName={group.cycleName} />
                                        <Badge variant="secondary" className="text-xs">{group.templates.length} templates</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Select a team member above to assign goals from these templates.
                                    </p>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="space-y-2">
                                        {group.templates.map((tmpl) => (
                                            <div
                                                key={tmpl.id}
                                                className="flex items-start gap-3 p-3 rounded-lg border"
                                            >
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-medium">{tmpl.title}</span>
                                                        <ScopeLabel departmentId={tmpl.department_id} departmentName={tmpl.department_name} />
                                                    </div>
                                                    {tmpl.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-2">{tmpl.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )
            ) : !effectiveCycleId ? (
                <Card>
                    <CardContent className="py-10 text-center">
                        <p className="text-muted-foreground">No active appraisal cycle found for this employee.</p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* ══ ASSIGN MODE: Show filtered templates for the selected member's cycle ══ */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-base">
                                        Assign Goals to {selectedMember?.first_name}
                                    </CardTitle>
                                    <CycleBadge cycleType={memberCycleType} cycleName={memberCycleName} />
                                </div>
                                {activeTemplates.length > 0 && (
                                    <Button variant="ghost" size="sm" onClick={toggleAll}>
                                        {selectedTemplateIds.length === activeTemplates.length ? "Deselect All" : "Select All"}
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {activeTemplates.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">
                                        No goal templates available for this employee&apos;s cycle ({memberCycleName || "unknown"}).
                                        Ask HR to upload templates for this cycle.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {activeTemplates.map((tmpl) => {
                                        const isAssigned = assignedTitles.has(tmpl.title);
                                        return (
                                            <div
                                                key={tmpl.id}
                                                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/40 cursor-pointer ${isAssigned ? "border-green-200 bg-green-50/30" : ""}`}
                                                onClick={() => toggleTemplate(tmpl.id)}
                                            >
                                                <Checkbox
                                                    id={`tmpl-${tmpl.id}`}
                                                    checked={selectedTemplateIds.includes(tmpl.id)}
                                                    onCheckedChange={() => toggleTemplate(tmpl.id)}
                                                    className="mt-0.5"
                                                />
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <label
                                                            htmlFor={`tmpl-${tmpl.id}`}
                                                            className="text-sm font-medium cursor-pointer"
                                                        >
                                                            {tmpl.title}
                                                        </label>
                                                        <ScopeLabel departmentId={tmpl.department_id} departmentName={tmpl.department_name} />
                                                        {isAssigned && (
                                                            <Badge className="text-xs bg-green-100 text-green-700 border-green-200" variant="outline">
                                                                <CheckCircle2 className="w-3 h-3 mr-1" /> Assigned
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {tmpl.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-2">{tmpl.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* ── Member's existing goals ─────────────────── */}
                    {selectedMemberId && memberGoals && memberGoals.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">
                                    {selectedMember?.first_name}&apos;s Goals ({memberGoals.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                {goalsLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (
                                    <MemberGoalsList goals={memberGoals} />
                                )}
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
