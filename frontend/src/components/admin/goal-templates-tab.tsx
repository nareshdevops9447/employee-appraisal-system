"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Plus, Trash2, Upload, Loader2, Download, Globe, Building2 } from "lucide-react";
import { useCycleGoalTemplates, useCreateGoalTemplate, useUpdateGoalTemplate, useDeleteGoalTemplate, useUploadGoalTemplates, GoalTemplate } from "@/hooks/use-goal-templates";
import { useDepartments } from "@/hooks/use-departments";
import { useEffect, useRef } from "react";

interface GoalTemplatesTabProps {
    cycleId: string;
}

export function GoalTemplatesTab({ cycleId }: GoalTemplatesTabProps) {
    const [deptFilter, setDeptFilter] = useState<string>("all");
    const { data: departments } = useDepartments();

    // Pass dept filter to the query (undefined = show all)
    const { data: templates, isLoading } = useCycleGoalTemplates(
        cycleId,
        deptFilter !== "all" ? deptFilter : undefined
    );
    const deleteTemplate = useDeleteGoalTemplate(cycleId);
    const uploadTemplates = useUploadGoalTemplates(cycleId);

    const [editingTemplate, setEditingTemplate] = useState<GoalTemplate | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this template?")) {
            deleteTemplate.mutate(id);
        }
    };

    const handleEdit = (tmpl: GoalTemplate) => {
        setEditingTemplate(tmpl);
        setIsDialogOpen(true);
    };

    const handleCreateNew = () => {
        setEditingTemplate(null);
        setIsDialogOpen(true);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        uploadTemplates.mutate(file, {
            onSettled: () => {
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }
        });
    };

    if (isLoading) return <div className="py-8 text-center text-muted-foreground">Loading templates...</div>;

    const activeTemplates = templates?.filter(t => t.is_active) || [];

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                    <h3 className="text-lg font-medium">Goal Templates</h3>
                    <p className="text-sm text-muted-foreground">
                        Create org-wide or department-specific performance goals for this cycle.
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {/* Department filter */}
                    <Select value={deptFilter} onValueChange={setDeptFilter}>
                        <SelectTrigger className="w-[170px]">
                            <SelectValue placeholder="Filter by dept" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Templates</SelectItem>
                            {departments?.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button variant="outline" asChild>
                        <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/goal-templates/template/download`} download>
                            <Download className="w-4 h-4 mr-2" />
                            Download Template
                        </a>
                    </Button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".xlsx"
                        onChange={handleFileUpload}
                    />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadTemplates.isPending}>
                        {uploadTemplates.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                        Upload Excel
                    </Button>
                    <Button onClick={handleCreateNew}>
                        <Plus className="w-4 h-4 mr-2" /> Add Template
                    </Button>
                </div>
            </div>

            {activeTemplates.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                        No goal templates defined yet. Add org-wide or department-specific goals.
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {activeTemplates.map(tmpl => (
                        <Card key={tmpl.id}>
                            <CardHeader className="py-3 flex flex-row items-center justify-between">
                                <div className="space-y-1 pr-6">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <CardTitle className="text-base">{tmpl.title}</CardTitle>
                                        <Badge variant={tmpl.department_id ? "secondary" : "outline"} className="text-xs flex items-center gap-1">
                                            {tmpl.department_id
                                                ? <><Building2 className="w-3 h-3" />{tmpl.department_name}</>
                                                : <><Globe className="w-3 h-3" />Org-wide</>
                                            }
                                        </Badge>
                                    </div>
                                    <CardDescription className="line-clamp-2">{tmpl.description || "No description provided."}</CardDescription>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(tmpl)}>
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(tmpl.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            )}

            <GoalTemplateDialog
                cycleId={cycleId}
                template={editingTemplate}
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                orderOffset={activeTemplates.length}
            />
        </div>
    );
}

function GoalTemplateDialog({
    cycleId, template, open, onOpenChange, orderOffset
}: {
    cycleId: string;
    template: GoalTemplate | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orderOffset: number;
}) {
    const isEdit = !!template;
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState<"performance" | "development" | "project" | "mission_aligned">("performance");
    const [departmentId, setDepartmentId] = useState<string>("org-wide");

    const { data: departments } = useDepartments();
    const createTemplate = useCreateGoalTemplate(cycleId);
    const updateTemplate = useUpdateGoalTemplate(cycleId);

    useEffect(() => {
        if (open) {
            setTitle(template?.title || "");
            setDescription(template?.description || "");
            setCategory(template?.category || "performance");
            setDepartmentId(template?.department_id ?? "org-wide");
        }
    }, [open, template]);

    const handleSubmit = () => {
        if (!title) return;
        const deptId = departmentId === "org-wide" ? null : departmentId;

        if (isEdit) {
            updateTemplate.mutate({ id: template.id, data: { title, description, category, department_id: deptId } }, {
                onSuccess: () => onOpenChange(false)
            });
        } else {
            createTemplate.mutate({ cycle_id: cycleId, title, description, category, display_order: orderOffset, department_id: deptId }, {
                onSuccess: () => onOpenChange(false)
            });
        }
    };

    const isPending = createTemplate.isPending || updateTemplate.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit Goal Template" : "Add Goal Template"}</DialogTitle>
                    <DialogDescription>
                        Org-wide goals are auto-assigned to everyone. Department goals are pushed by the manager.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Goal Title <span className="text-destructive">*</span></Label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Sales Target Q3" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="performance">Performance</SelectItem>
                                    <SelectItem value="development">Development</SelectItem>
                                    <SelectItem value="mission_aligned">Mission Aligned</SelectItem>
                                    <SelectItem value="project">Project</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Scope</Label>
                            <Select value={departmentId} onValueChange={setDepartmentId}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="org-wide">
                                        <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />Org-wide</span>
                                    </SelectItem>
                                    {departments?.map(dept => (
                                        <SelectItem key={dept.id} value={dept.id}>
                                            <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{dept.name}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Provide guidelines for the manager to set target values..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!title || isPending}>
                        {isPending ? "Saving..." : "Save Template"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
