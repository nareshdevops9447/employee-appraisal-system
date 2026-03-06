
'use client';

import { SessionProvider } from 'next-auth/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/providers/theme-provider';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                    {children}
                </ThemeProvider>
                <Toaster position="top-right" richColors />
            </QueryClientProvider>
        </SessionProvider>
    );
}
