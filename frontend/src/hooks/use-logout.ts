"use client";

import { signOut, useSession } from "next-auth/react";
import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter } from "next/navigation";

export function useLogout() {
    const router = useRouter();
    const { data: session } = useSession();
    const { clearAuth } = useAuthStore();

    const logout = async () => {
        try {
            // 1. Revoke token on backend (fire and forget to avoid blocking UI)
            if (session?.refreshToken) {
                apiClient.post("/auth/logout", {
                    refresh_token: session.refreshToken,
                }).catch(err => console.error("Logout backend call failed", err));
            }

            // 2. Clear local state
            clearAuth();

            // 3. Federated Signout from Azure AD
            // This ensures the browser session with Microsoft is also cleared
            const tenantId = process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID;
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;

            // First sign out of NextAuth (manually handle redirect)
            await signOut({ redirect: false });

            if (tenantId) {
                const logoutUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(baseUrl + '/login')}`;
                window.location.href = logoutUrl;
            } else {
                router.push("/login");
            }
        } catch (error) {
            console.error("Logout error:", error);
            // Fallback redirect
            router.push("/login");
        }
    };

    return logout;
}
