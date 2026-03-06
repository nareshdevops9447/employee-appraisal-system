
"use client";

import { KeyResult } from "@/types/goal";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Check, X, Pencil, Trash2 } from "lucide-react";
import { useUpdateKeyResult, useDeleteKeyResult } from "@/hooks/use-key-results";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface KeyResultItemProps {
    keyResult: KeyResult;
    isOwnerOrManager: boolean;
}

export function KeyResultItem({ keyResult, isOwnerOrManager }: KeyResultItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(keyResult.current_value);
    const updateKeyResult = useUpdateKeyResult();
    const deleteKeyResult = useDeleteKeyResult();

    const progress = Math.min(100, Math.max(0, (keyResult.current_value / keyResult.target_value) * 100));

    const handleSave = () => {
        updateKeyResult.mutate({
            goalId: keyResult.goal_id,
            id: keyResult.id,
            data: { current_value: currentValue }
        });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setCurrentValue(keyResult.current_value);
        setIsEditing(false);
    };

    const handleDelete = () => {
        deleteKeyResult.mutate({ goalId: keyResult.goal_id, id: keyResult.id });
    };

    return (
        <div className="bg-card border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
                <div className="font-medium">{keyResult.title}</div>
                {isOwnerOrManager && (
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditing(!isEditing)}>
                            <Pencil className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive">
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Key Result?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )}
            </div>

            <div className="space-y-1">
                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Progress</span>
                    <span>{currentValue} / {keyResult.target_value} {keyResult.unit}</span>
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            {isEditing && (
                <div className="flex items-center gap-2 mt-2">
                    <Input
                        type="number"
                        value={currentValue}
                        onChange={(e) => setCurrentValue(parseFloat(e.target.value))}
                        className="h-8 max-w-[100px]"
                    />
                    <span className="text-sm text-muted-foreground">{keyResult.unit}</span>
                    <Button size="sm" onClick={handleSave} disabled={updateKeyResult.isPending}>
                        <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancel}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
