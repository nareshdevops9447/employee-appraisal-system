'use client';

import { useEffect } from 'react';
import { usePreferencesStore } from '@/lib/preferences-store';

/**
 * ThemeProvider — reads dark_mode and compact_mode from the Zustand
 * preferences store (localStorage-backed) and applies the corresponding
 * CSS classes to the <html> element.
 *
 * This runs on every render/store change so theme switches are instant,
 * even before the API response arrives (Zustand persist hydrates from
 * localStorage synchronously).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const darkMode = usePreferencesStore((s) => s.dark_mode);
    const compactMode = usePreferencesStore((s) => s.compact_mode);

    useEffect(() => {
        const root = document.documentElement;

        if (darkMode) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        if (compactMode) {
            root.classList.add('compact');
        } else {
            root.classList.remove('compact');
        }
    }, [darkMode, compactMode]);

    return <>{children}</>;
}
