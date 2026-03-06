
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import apiClient from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Notification {
    id: string;
    recipient_id: string;
    event: string;
    message: string;
    goal_id: string | null;
    resource_type: string | null;
    resource_id: string | null;
    triggered_by: string;
    is_read: boolean;
    created_at: string;
}

function useNotifications() {
    return useQuery<Notification[]>({
        queryKey: ["notifications"],
        queryFn: async () => {
            const { data } = await apiClient.get("/api/notifications");
            if (Array.isArray(data)) return data;
            return data.notifications || [];
        },
    });
}

function useMarkAllRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const { data } = await apiClient.patch("/api/notifications/read-all");
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });
}

function useMarkNotificationRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (notificationId: string) => {
            const { data } = await apiClient.patch(
                `/api/notifications/${notificationId}/read`
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });
}

function getNotificationHref(notification: Notification): string {
    if (notification.goal_id) return `/goals/${notification.goal_id}`;
    if (notification.resource_type === "appraisal_cycle") return "/appraisals";
    return "#";
}

function formatEvent(event: string): string {
    const labels: Record<string, string> = {
        cycle_started: "Performance Cycle Started",
        goal_assigned_pending: "Goal Assigned (Pending Approval)",
        goal_approved: "Your Goal Was Approved",
        goal_rejected: "Your Goal Was Rejected",
        self_assessment_due: "Self-Assessment Due Soon",
        manager_review_due: "Pending Manager Reviews",
    };
    return labels[event] || event.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function NotificationsPage() {
    const { data: notifications, isLoading } = useNotifications();
    const markAllRead = useMarkAllRead();
    const markRead = useMarkNotificationRead();

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
                {notifications && notifications.some(n => !n.is_read) && (
                    <Button onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending} variant="outline">
                        <Check className="mr-2 h-4 w-4" /> Mark All Read
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {!notifications || notifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            No notifications found.
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                <Link
                                    key={notification.id}
                                    href={getNotificationHref(notification)}
                                    className={`flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors ${!notification.is_read ? "bg-muted/20" : ""}`}
                                    onClick={() => {
                                        if (!notification.is_read) {
                                            markRead.mutate(notification.id);
                                        }
                                    }}
                                >
                                    <div className={`mt-2 h-2.5 w-2.5 rounded-full flex-shrink-0 ${!notification.is_read ? "bg-blue-600" : "bg-transparent"}`} />
                                    <div className="flex-1 space-y-1">
                                        <p className="font-medium text-sm leading-none">
                                            {formatEvent(notification.event)}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {notification.message}
                                        </p>
                                        <p className="text-xs text-muted-foreground pt-1">
                                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
