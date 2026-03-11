
"use client";

import { useMyLeaveRequests, useLeaveBalances, useCancelLeaveRequest } from "@/hooks/use-leave";
import { useSession } from "next-auth/react";
import { BalanceCard } from "@/components/leave/balance-card";
import { RequestTable } from "@/components/leave/request-table";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Clock, History, Users } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export default function LeaveDashboardPage() {
    const { data: session } = useSession();
    const { data: balances, isLoading: balancesLoading } = useLeaveBalances();
    const { data: requests, isLoading: requestsLoading } = useMyLeaveRequests();
    const cancelMutation = useCancelLeaveRequest();

    const handleCancel = (id: string) => {
        if (window.confirm("Are you sure you want to cancel this leave request?")) {
            cancelMutation.mutate(id);
        }
    };

    if (balancesLoading || requestsLoading) {
        return <LeaveDashboardSkeleton />;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
                    <p className="text-muted-foreground mt-1">
                        Track your leave balances and manage your requests.
                    </p>
                </div>
                <div className="flex gap-3">
                    {["manager", "hr_admin", "super_admin"].includes(session?.user?.role || "") && (
                        <Button asChild variant="outline" className="shadow-sm">
                            <Link href="/leave/team">
                                <Users className="mr-2 h-4 w-4" /> Team Requests
                            </Link>
                        </Button>
                    )}
                    <Button asChild className="shadow-md">
                        <Link href="/leave/apply">
                            <Plus className="mr-2 h-4 w-4" /> Apply for Leave
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {balances?.map((balance) => (
                    <BalanceCard key={balance.id} balance={balance} />
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-1">
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <History className="h-5 w-5 text-primary" />
                        <h2 className="text-xl font-semibold">Recent Requests</h2>
                    </div>
                    <RequestTable requests={requests || []} onCancel={handleCancel} />
                </div>
            </div>
        </div>
    );
}

function LeaveDashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-[250px]" />
                <Skeleton className="h-10 w-[150px]" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-lg" />
                ))}
            </div>
            <Skeleton className="h-64 w-full rounded-lg" />
        </div>
    );
}
