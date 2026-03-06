"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check } from "lucide-react";
import Link from "next/link";

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
            const { data } = await apiClient.get("/api/goals/notifications");
            // API returns a list directly
            return Array.isArray(data) ? data : (data.notifications || []);
        },
        refetchInterval: 30000, // Poll every 30 seconds
    });
}

function useMarkNotificationRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (notificationId: string) => {
            const { data } = await apiClient.post(
                `/api/goals/notifications/${notificationId}/read`
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });
}

function useMarkAllRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const { data } = await apiClient.post("/api/goals/notifications/read-all");
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });
}

/**
 * Build the correct link for each notification type.
 */
function getNotificationHref(notification: Notification): string {
    // Goal-related notifications → link to the goal
    if (notification.goal_id) {
        return `/goals/${notification.goal_id}`;
    }

    // Cycle-related notifications → link to appraisals
    if (notification.resource_type === "appraisal_cycle") {
        return "/appraisals";
    }

    return "#";
}

/**
 * Human-readable label for each event type.
 */
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

export function NotificationBell() {
    const { data: notifications, isLoading } = useNotifications();
    const markRead = useMarkNotificationRead();
    const markAllRead = useMarkAllRead();

    const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.is_read) {
            markRead.mutate(notification.id);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-2">
                    <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => markAllRead.mutate()}
                        >
                            <Check className="mr-1 h-3 w-3" />
                            Mark all read
                        </Button>
                    )}
                </div>
                <div className="p-2 border-t text-center">
                    <Link href="/notifications" className="text-xs text-primary hover:underline">
                        View all notifications
                    </Link>
                </div>

                {isLoading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        Loading...
                    </div>
                ) : !notifications || notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        No notifications
                    </div>
                ) : (
                    <div className="max-h-[300px] overflow-y-auto">
                        {notifications.map((notification) => (
                            <DropdownMenuItem key={notification.id} asChild>
                                <Link
                                    href={getNotificationHref(notification)}
                                    className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${!notification.is_read ? "bg-muted/50" : ""
                                        }`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="flex items-center gap-2">
                                        {!notification.is_read && (
                                            <span className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />
                                        )}
                                        <span className="font-medium text-sm">
                                            {formatEvent(notification.event)}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground pl-4">
                                        {formatDistanceToNow(new Date(notification.created_at), {
                                            addSuffix: true,
                                        })}
                                    </div>
                                </Link>
                            </DropdownMenuItem>
                        ))}
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}