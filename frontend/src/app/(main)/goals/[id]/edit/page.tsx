
"use client";

import { GoalForm } from "@/components/goals/goal-form";
import { useUpdateGoal, useGoal } from "@/hooks/use-goals";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditGoalPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const { data: goal, isLoading: goalLoading } = useGoal(id);
    const updateGoal = useUpdateGoal();

    const handleSubmit = (data: any) => {
        updateGoal.mutate({ id, data }, {
            onSuccess: () => {
                router.push(`/goals/${id}`);
            },
        });
    };

    if (goalLoading) return <div className="max-w-3xl mx-auto"><Skeleton className="h-[600px] w-full" /></div>;
    if (!goal) return <div>Goal not found</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Edit Goal</h1>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Edit Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <GoalForm initialData={goal} onSubmit={handleSubmit} isLoading={updateGoal.isPending} />
                </CardContent>
            </Card>
        </div>
    );
}
