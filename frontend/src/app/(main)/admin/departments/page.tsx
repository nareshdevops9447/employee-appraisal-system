"use client";

import { useState, useEffect } from "react";
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment, Department } from "@/hooks/use-departments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function DepartmentsPage() {
    const { data: departments, isLoading } = useDepartments();
    const deleteDepartment = useDeleteDepartment();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);

    const handleCreateNew = () => {
        setEditingDepartment(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (dept: Department) => {
        setEditingDepartment(dept);
        setIsDialogOpen(true);
    };

    const handleDelete = (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete the department "${name}"?`)) {
            deleteDepartment.mutate(id);
        }
    };

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Departments</h2>
                    <p className="text-muted-foreground">Manage organization departments.</p>
                </div>
                <Button onClick={handleCreateNew}>
                    <Plus className="mr-2 h-4 w-4" /> Add Department
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Departments</CardTitle>
                    <CardDescription>View and manage all departments in the system.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="py-8 text-center text-muted-foreground">Loading departments...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {departments?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                            No departments found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    departments?.map((dept) => (
                                        <TableRow key={dept.id}>
                                            <TableCell className="font-medium">{dept.name}</TableCell>
                                            <TableCell className="max-w-[300px] truncate text-muted-foreground">
                                                {dept.description || "N/A"}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(dept)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(dept.id, dept.name)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <DepartmentDialog
                department={editingDepartment}
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
            />
        </div>
    );
}

function DepartmentDialog({
    department, open, onOpenChange
}: {
    department: Department | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const isEdit = !!department;
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    const createDepartment = useCreateDepartment();
    const updateDepartment = useUpdateDepartment();

    useEffect(() => {
        if (open) {
            setName(department?.name || "");
            setDescription(department?.description || "");
        }
    }, [open, department]);

    const handleSubmit = () => {
        if (!name.trim()) return;

        if (isEdit) {
            updateDepartment.mutate({ id: department.id, data: { name, description } }, {
                onSuccess: () => onOpenChange(false)
            });
        } else {
            createDepartment.mutate({ name, description }, {
                onSuccess: () => onOpenChange(false)
            });
        }
    };

    const isPending = createDepartment.isPending || updateDepartment.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit Department" : "Add Department"}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? "Modify the department details below." : "Create a new department for the organization."}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Name <span className="text-destructive">*</span></Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. IT, HR, Sales" />
                    </div>
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Optional description of the department..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!name.trim() || isPending}>
                        {isPending ? "Saving..." : "Save Department"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
