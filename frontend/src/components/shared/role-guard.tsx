
"use client";

import { useSession } from "next-auth/react";
import React from "react";

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: string[]; // e.g., ['hr_admin', 'manager']
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
    const { data: session } = useSession();
    const userRole = session?.user?.role; // Ensure role is added to session in auth.ts callback

    if (!userRole || !allowedRoles.includes(userRole)) {
        return null;
        // Alternatively, render a "Not Authorized" message or fragment
    }

    return <>{children}</>;
}
