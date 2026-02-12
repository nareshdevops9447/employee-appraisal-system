
"use client";

import { useAppraisals, useActiveCycle } from "@/hooks/use-appraisals";
import { columns } from "./columns";
import { DataTable } from "@/components/shared/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppraisalsPage() {
    const { data: activeCycle } = useActiveCycle();
    // Fetch all appraisals for current user
    const { data: appraisals, isLoading } = useAppraisals();

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-[200px]" />
                    <Skeleton className="h-4 w-[300px]" />
                </div>
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    const activeAppraisals = appraisals?.filter(a => a.status !== 'completed' && a.status !== 'cancelled') || [];
    const completedAppraisals = appraisals?.filter(a => a.status === 'completed') || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Appraisals</h1>
                <p className="text-muted-foreground">
                    Manage your performance reviews and feedback.
                </p>
            </div>

            <Tabs defaultValue="active" className="w-full">
                <TabsList>
                    <TabsTrigger value="active">Active ({activeAppraisals.length})</TabsTrigger>
                    <TabsTrigger value="completed">Completed ({completedAppraisals.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="active">
                    <Card>
                        <CardHeader>
                            <CardTitle>Active Reviews</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DataTable columns={columns} data={activeAppraisals} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="completed">
                    <Card>
                        <CardHeader>
                            <CardTitle>Past Reviews</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DataTable columns={columns} data={completedAppraisals} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
