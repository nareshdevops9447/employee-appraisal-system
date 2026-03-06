"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Send } from "lucide-react";
import { useMyDepartmentTemplates, usePushTemplatesToTeam } from "@/hooks/use-goal-templates";
import { useActiveCycle } from "@/hooks/use-appraisals";

interface PushTemplatesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    teamSize: number;
}

export function PushTemplatesDialog({ open, onOpenChange, teamSize }: PushTemplatesDialogProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const { data: cycle } = useActiveCycle();
    const { data: templates, isLoading } = useMyDepartmentTemplates(cycle?.id ?? "");
    const pushTemplates = usePushTemplatesToTeam();

    const toggleTemplate = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handlePush = () => {
        if (!cycle?.id || selectedIds.length === 0) return;
        pushTemplates.mutate(
            { template_ids: selectedIds, cycle_id: cycle.id },
            {
                onSuccess: () => {
                    setSelectedIds([]);
                    onOpenChange(false);
                },
            }
        );
    };

    const activeTemplates = templates?.filter((t) => t.is_active) ?? [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[540px]">
                <DialogHeader>
                    <DialogTitle>Push Goal Templates to Team</DialogTitle>
                    <DialogDescription>
                        Select templates to assign as draft goals for all {teamSize} of your direct reports.
                        They will be able to adjust weights and add their own goals before submitting.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2 space-y-3 max-h-[400px] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : !cycle ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No active appraisal cycle found.</p>
                    ) : activeTemplates.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                            No goal templates are available for your department in the current cycle.
                            Ask HR to create some.
                        </p>
                    ) : (
                        activeTemplates.map((tmpl) => (
                            <div
                                key={tmpl.id}
                                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/40 transition-colors cursor-pointer"
                                onClick={() => toggleTemplate(tmpl.id)}
                            >
                                <Checkbox
                                    id={tmpl.id}
                                    checked={selectedIds.includes(tmpl.id)}
                                    onCheckedChange={() => toggleTemplate(tmpl.id)}
                                    className="mt-0.5"
                                />
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <label htmlFor={tmpl.id} className="text-sm font-medium cursor-pointer">
                                            {tmpl.title}
                                        </label>
                                        <Badge variant={tmpl.department_id ? "secondary" : "outline"} className="text-xs">
                                            {tmpl.department_name ?? "Org-wide"}
                                        </Badge>
                                    </div>
                                    {tmpl.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2">{tmpl.description}</p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pushTemplates.isPending}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handlePush}
                        disabled={selectedIds.length === 0 || !cycle || pushTemplates.isPending}
                    >
                        {pushTemplates.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4 mr-2" />
                        )}
                        Push {selectedIds.length > 0 ? `${selectedIds.length} Template${selectedIds.length > 1 ? "s" : ""}` : "to Team"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
