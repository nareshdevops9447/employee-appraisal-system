"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Plus, Trash2, Upload, Loader2, Download } from "lucide-react";
import { useCycleAttributeTemplates, useCreateAttributeTemplate, useUpdateAttributeTemplate, useDeleteAttributeTemplate, useUploadAttributeTemplates, AttributeTemplate } from "@/hooks/use-attribute-templates";
import { useEffect, useRef } from "react";

interface AttributeTemplatesTabProps {
    cycleId: string;
}

export function AttributeTemplatesTab({ cycleId }: AttributeTemplatesTabProps) {
    const { data: templates, isLoading } = useCycleAttributeTemplates(cycleId);
    const deleteTemplate = useDeleteAttributeTemplate(cycleId);
    const uploadTemplates = useUploadAttributeTemplates(cycleId);

    const [editingTemplate, setEditingTemplate] = useState<AttributeTemplate | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this template?")) {
            deleteTemplate.mutate(id);
        }
    };

    const handleEdit = (tmpl: AttributeTemplate) => {
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
                // Reset file input
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
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">Attribute Templates</h3>
                    <p className="text-sm text-muted-foreground">Define the 5 mandatory behavioral attributes for this cycle.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/attributes/template/download`} download>
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
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={activeTemplates.length >= 5 || uploadTemplates.isPending}>
                        {uploadTemplates.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                        Upload Excel
                    </Button>
                    <Button onClick={handleCreateNew} disabled={activeTemplates.length >= 5 || uploadTemplates.isPending}>
                        <Plus className="w-4 h-4 mr-2" /> Add Template
                    </Button>
                </div>
            </div>

            {activeTemplates.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                        No attribute templates defined yet. Add up to 5 mandatory attributes.
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {activeTemplates.map(tmpl => (
                        <Card key={tmpl.id}>
                            <CardHeader className="py-3 flex flex-row items-center justify-between">
                                <div className="space-y-1 pr-6">
                                    <CardTitle className="text-base">{tmpl.title}</CardTitle>
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
                    {activeTemplates.length < 5 && (
                        <p className="text-sm text-muted-foreground mt-2">
                            {5 - activeTemplates.length} more attribute(s) required to reach the mandatory 5.
                        </p>
                    )}
                </div>
            )}

            <AttributeTemplateDialog
                cycleId={cycleId}
                template={editingTemplate}
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                orderOffset={activeTemplates.length}
            />
        </div>
    );
}

function AttributeTemplateDialog({ cycleId, template, open, onOpenChange, orderOffset }: { cycleId: string, template: AttributeTemplate | null, open: boolean, onOpenChange: (open: boolean) => void, orderOffset: number }) {
    const isEdit = !!template;
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    const createTemplate = useCreateAttributeTemplate(cycleId);
    const updateTemplate = useUpdateAttributeTemplate(cycleId);

    useEffect(() => {
        if (open) {
            setTitle(template?.title || "");
            setDescription(template?.description || "");
        }
    }, [open, template]);

    const handleSubmit = () => {
        if (!title) return;

        if (isEdit) {
            updateTemplate.mutate({ id: template.id, data: { title, description } }, {
                onSuccess: () => onOpenChange(false)
            });
        } else {
            createTemplate.mutate({ cycle_id: cycleId, title, description, display_order: orderOffset }, {
                onSuccess: () => onOpenChange(false)
            });
        }
    };

    const isPending = createTemplate.isPending || updateTemplate.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit Attribute Template" : "Add Attribute Template"}</DialogTitle>
                    <DialogDescription>
                        This behavioral attribute will be automatically assigned to all eligible employees.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Attribute Title <span className="text-destructive">*</span></Label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Communication & Teamwork" />
                    </div>
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Provide guidelines on how to evaluate this attribute..."
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
