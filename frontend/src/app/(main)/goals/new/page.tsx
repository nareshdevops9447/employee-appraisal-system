
"use client";

import { GoalForm } from "@/components/goals/goal-form";
import { useCreateGoal } from "@/hooks/use-goals";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function CreateGoalPage() {
    const router = useRouter();
    const createGoal = useCreateGoal();

    const handleSubmit = (data: any) => {
        createGoal.mutate(data, {
            onSuccess: (newGoal) => {
                router.push(`/goals/${newGoal.id}`);
            },
        });
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Create New Goal</h1>
                <p className="text-muted-foreground">Define a new performance objective or development target.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Goal Details</CardTitle>
                    <CardDescription>Fill in the details for your new goal.</CardDescription>
                </CardHeader>
                <CardContent>
                    <GoalForm onSubmit={handleSubmit} isLoading={createGoal.isPending} />
                </CardContent>
            </Card>
        </div>
    );
}
