
"use client";

import { GoalForm } from "@/components/goals/goal-form";
import { useUpdateGoal, useGoal } from "@/hooks/use-goals";
import { useTeamMembers } from "@/hooks/use-team";
import { useSubmitGoal } from "@/hooks/use-goal-approval";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function EditGoalPage() {
    const router = useRouter();
    const params = useParams();
    const id = (params?.id as string) || '';
    const { data: goal, isLoading: goalLoading } = useGoal(id);
    const updateGoal = useUpdateGoal();
    const submitGoal = useSubmitGoal();
    const { data: teamMembers } = useTeamMembers();

    const handleSubmit = (data: any) => {
        let targetEmployeeId = data.employee_id === "myself" ? null : data.employee_id;
        const payload = { ...data, employee_id: targetEmployeeId };

        updateGoal.mutate({ id, data: payload }, {
            onSuccess: () => {
                router.push(`/goals/${id}`);
            },
        });
    };

    const handleSaveAndSubmit = (data: any) => {
        let targetEmployeeId = data.employee_id === "myself" ? null : data.employee_id;
        const payload = { ...data, employee_id: targetEmployeeId };

        updateGoal.mutate({ id, data: payload }, {
            onSuccess: () => {
                submitGoal.mutate(id, {
                    onSuccess: () => {
                        router.push(`/goals/${id}`);
                    }
                });
            },
        });
    };

    const { data: session } = useSession();
    const isAdmin = session?.user?.role === 'hr_admin' || session?.user?.role === 'super_admin';

    if (goalLoading) return <div className="max-w-3xl mx-auto"><Skeleton className="h-[600px] w-full" /></div>;
    if (!goal) return <div>Goal not found</div>;

    if (goal.approval_status === 'approved' && !isAdmin) {
        return (
            <div className="max-w-xl mx-auto mt-12 text-center space-y-4">
                <h1 className="text-2xl font-bold tracking-tight">Goal is Locked</h1>
                <p className="text-muted-foreground">
                    This goal has been approved. You can update progress on its key results, but structural edits (title, description, dates) are not permitted.
                </p>
                <Button onClick={() => router.push(`/goals/${id}`)}>
                    Return to Goal Details
                </Button>
            </div>
        );
    }

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
                    <GoalForm
                        initialData={goal}
                        onSubmit={handleSubmit}
                        onSaveAndSubmit={handleSaveAndSubmit}
                        isLoading={updateGoal.isPending}
                        isSubmitLoading={submitGoal.isPending}
                        teamMembers={teamMembers}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
