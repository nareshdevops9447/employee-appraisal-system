
"use client";

import { GoalForm } from "@/components/goals/goal-form";
import { useCreateGoal } from "@/hooks/use-goals";
import { useTeamMembers } from "@/hooks/use-team";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function CreateGoalPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const employeeIdParam = searchParams?.get('employee_id');
    const createGoal = useCreateGoal();

    // Fetch team members to populate the assignment dropdown
    const { data: teamMembers } = useTeamMembers();

    const handleSubmit = (data: any) => {
        // If employee_id is "myself", treat it as null/undefined (current user)
        // If employee_id is selected from dropdown, use it
        // If employeeIdParam is present (came from team page), use it
        let targetEmployeeId = data.employee_id === "myself" ? undefined : data.employee_id;

        if (!targetEmployeeId && employeeIdParam) {
            targetEmployeeId = employeeIdParam;
        }

        const payload = { ...data, employee_id: targetEmployeeId };
        createGoal.mutate(payload, {
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
                    <GoalForm
                        onSubmit={handleSubmit}
                        isLoading={createGoal.isPending}
                        employeeId={employeeIdParam}
                        teamMembers={teamMembers}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
