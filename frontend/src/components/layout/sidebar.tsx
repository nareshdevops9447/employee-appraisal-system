
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/ui-store";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";
import {
    LayoutDashboard,
    ClipboardCheck,
    Target,
    Users,
    BarChart3,
    Settings,
    ChevronLeft,
    ChevronRight,
    LogOut,
    User,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
    {
        name: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["employee", "manager", "hr_admin", "super_admin"],
    },
    {
        name: "My Appraisals",
        href: "/appraisals",
        icon: ClipboardCheck,
        roles: ["employee", "manager", "hr_admin", "super_admin"],
    },
    {
        name: "My Goals",
        href: "/goals",
        icon: Target,
        roles: ["employee", "manager", "hr_admin", "super_admin"],
    },
    {
        name: "Team",
        href: "/team",
        icon: Users,
        roles: ["manager", "hr_admin", "super_admin"],
    },
    {
        name: "Reports",
        href: "/reports",
        icon: BarChart3,
        roles: ["hr_admin", "super_admin"],
    },
    {
        name: "Cycles",
        href: "/admin/cycles",
        icon: Target, // Changed icon to differentiate or reuse Target/Clipboard
        roles: ["hr_admin", "super_admin"],
    },
    {
        name: "Settings",
        href: "/settings",
        icon: Settings,
        roles: ["employee", "manager", "hr_admin", "super_admin"],
    },
];


import { signOut } from "next-auth/react";
import apiClient from "@/lib/api-client";
import { useRouter } from "next/navigation";

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session } = useSession();
    const { sidebarOpen, toggleSidebar } = useUIStore();
    const { clearAuth } = useAuthStore();
    const userRole = session?.user?.role || "employee";

    const handleLogout = async () => {
        try {
            // 1. Revoke token on backend (fire and forget to avoid blocking UI)
            if (session?.refreshToken) {
                await apiClient.post("/auth/logout", {
                    refresh_token: session.refreshToken,
                }).catch(err => console.error("Logout backend call failed", err));
            }

            // 2. Clear local state
            clearAuth();

            // 3. Current session signout
            await signOut({ callbackUrl: "/login", redirect: true });
        } catch (error) {
            console.error("Logout error:", error);
            // Fallback redirect
            router.push("/login");
        }
    };

    return (
        <aside
            className={cn(
                "bg-card text-card-foreground border-r transition-all duration-300 ease-in-out flex flex-col h-screen sticky top-0 z-30 hidden md:flex",
                sidebarOpen ? "w-64" : "w-16"
            )}
        >
            <div className="flex items-center justify-between p-4 border-b h-16">
                {sidebarOpen && (
                    <span className="font-bold text-lg tracking-tight truncate">
                        EAS
                    </span>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    className={cn("ml-auto", !sidebarOpen && "mx-auto")}
                >
                    {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                </Button>
            </div>

            <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    if (!item.roles.includes(userRole)) return null;
                    const isActive = pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center px-3 py-2 rounded-md transition-colors font-medium text-sm group",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "hover:bg-accent hover:text-accent-foreground text-muted-foreground",
                                !sidebarOpen && "justify-center px-0"
                            )}
                            title={!sidebarOpen ? item.name : undefined}
                        >
                            <item.icon size={20} className={cn("shrink-0", sidebarOpen && "mr-3")} />
                            {sidebarOpen && <span>{item.name}</span>}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t space-y-4">
                {/* Logout Button */}
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full flex items-center justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                        !sidebarOpen && "justify-center px-0"
                    )}
                    onClick={handleLogout}
                    title={!sidebarOpen ? "Logout" : undefined}
                >
                    <LogOut size={20} className={cn("shrink-0", sidebarOpen && "mr-3")} />
                    {sidebarOpen && <span>Logout</span>}
                </Button>

                <div className={cn("flex items-center", !sidebarOpen && "justify-center")}>
                    <Avatar className="h-8 w-8">
                        <AvatarImage src="" />
                        <AvatarFallback>{session?.user?.name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    {sidebarOpen && (
                        <div className="ml-3 overflow-hidden">
                            <p className="text-sm font-medium truncate">{session?.user?.name}</p>
                            <p className="text-xs text-muted-foreground truncate capitalize">
                                {userRole.replace("_", " ")}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
