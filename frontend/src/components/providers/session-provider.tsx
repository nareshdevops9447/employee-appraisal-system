/**
 * SessionProvider wrapper for client components.
 * Syncs NextAuth session with the Zustand auth store.
 */
'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';

function AuthSync({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const syncSession = useAuthStore((s) => s.syncSession);

    useEffect(() => {
        if (status === 'loading') return;
        syncSession(session);
    }, [session, status, syncSession]);

    return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <AuthSync>{children}</AuthSync>
        </SessionProvider>
    );
}
