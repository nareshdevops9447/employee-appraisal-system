
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
    Scale,
    MessageSquareWarning,
    Building2,
    Bell,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const mainNavItems = [
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
        name: "Notifications",
        href: "/notifications",
        icon: Bell,
        roles: ["employee", "manager", "hr_admin", "super_admin"],
    },
];

const adminNavItems = [
    {
        name: "Reports",
        href: "/reports",
        icon: BarChart3,
        roles: ["hr_admin", "super_admin"],
    },
    {
        name: "Cycles",
        href: "/admin/cycles",
        icon: Target,
        roles: ["hr_admin", "super_admin"],
    },
    {
        name: "Departments",
        href: "/admin/departments",
        icon: Building2,
        roles: ["hr_admin", "super_admin"],
    },
    {
        name: "Calibration",
        href: "/admin/calibration",
        icon: Scale,
        roles: ["hr_admin", "super_admin"],
    },
    {
        name: "Appeals",
        href: "/admin/appeals",
        icon: MessageSquareWarning,
        roles: ["hr_admin", "super_admin"],
    },
];

const utilNavItems = [
    {
        name: "Settings",
        href: "/settings",
        icon: Settings,
        roles: ["employee", "manager", "hr_admin", "super_admin"],
    },
];


import { useLogout } from "@/hooks/use-logout";

function NavItem({ item, isActive, sidebarOpen }: {
    item: { name: string; href: string; icon: any };
    isActive: boolean;
    sidebarOpen: boolean;
}) {
    return (
        <Link
            href={item.href}
            className={cn(
                "flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm group relative",
                isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "hover:bg-accent hover:text-accent-foreground text-muted-foreground",
                !sidebarOpen && "justify-center px-0"
            )}
            title={!sidebarOpen ? item.name : undefined}
        >
            {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full" />
            )}
            <item.icon size={18} className={cn(
                "shrink-0 transition-colors",
                sidebarOpen && "mr-3",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
            )} />
            {sidebarOpen && <span>{item.name}</span>}
        </Link>
    );
}

export function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const { sidebarOpen, toggleSidebar } = useUIStore();
    const userRole = session?.user?.role || "employee";
    const logout = useLogout();

    const isAdmin = ["hr_admin", "super_admin"].includes(userRole);
    const visibleAdminItems = adminNavItems.filter(item => item.roles.includes(userRole));

    return (
        <aside
            className={cn(
                "bg-card text-card-foreground border-r transition-all duration-300 ease-in-out flex flex-col h-screen sticky top-0 z-30 hidden md:flex",
                sidebarOpen ? "w-64" : "w-16"
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b h-16">
                {sidebarOpen && (
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <span className="font-bold text-lg tracking-tight">EAS</span>
                    </div>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    className={cn("ml-auto h-8 w-8", !sidebarOpen && "mx-auto")}
                >
                    {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
                {/* Main section */}
                {sidebarOpen && (
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-3 mb-2">
                        Main
                    </p>
                )}
                {mainNavItems.map((item) => {
                    if (!item.roles.includes(userRole)) return null;
                    const isActive = pathname ? pathname.startsWith(item.href) : false;
                    return <NavItem key={item.href} item={item} isActive={isActive} sidebarOpen={sidebarOpen} />;
                })}

                {/* Admin section */}
                {isAdmin && visibleAdminItems.length > 0 && (
                    <>
                        {sidebarOpen ? (
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-3 mt-6 mb-2">
                                Administration
                            </p>
                        ) : (
                            <div className="my-3 mx-auto w-6 border-t border-border" />
                        )}
                        {visibleAdminItems.map((item) => {
                            const isActive = pathname ? pathname.startsWith(item.href) : false;
                            return <NavItem key={item.href} item={item} isActive={isActive} sidebarOpen={sidebarOpen} />;
                        })}
                    </>
                )}

                {/* Utility section */}
                {sidebarOpen && (
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-3 mt-6 mb-2">
                        Preferences
                    </p>
                )}
                {!sidebarOpen && <div className="my-3 mx-auto w-6 border-t border-border" />}
                {utilNavItems.map((item) => {
                    if (!item.roles.includes(userRole)) return null;
                    const isActive = pathname ? pathname.startsWith(item.href) : false;
                    return <NavItem key={item.href} item={item} isActive={isActive} sidebarOpen={sidebarOpen} />;
                })}
            </nav>

            {/* Footer */}
            <div className="p-3 border-t space-y-3">
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full flex items-center justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9",
                        !sidebarOpen && "justify-center px-0"
                    )}
                    onClick={logout}
                    title={!sidebarOpen ? "Logout" : undefined}
                >
                    <LogOut size={18} className={cn("shrink-0", sidebarOpen && "mr-3")} />
                    {sidebarOpen && <span className="text-sm">Logout</span>}
                </Button>

                <div className={cn("flex items-center p-2 rounded-lg bg-muted/50", !sidebarOpen && "justify-center p-1")}>
                    <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-semibold">
                            {session?.user?.name?.charAt(0) || "U"}
                        </AvatarFallback>
                    </Avatar>
                    {sidebarOpen && (
                        <div className="ml-3 overflow-hidden">
                            <p className="text-sm font-medium truncate">{session?.user?.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate capitalize">
                                {userRole.replace("_", " ")}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
