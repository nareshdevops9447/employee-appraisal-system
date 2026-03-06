import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Preferences {
    notify_appraisal_updates: boolean;
    notify_goal_reminders: boolean;
    notify_marketing: boolean;
    compact_mode: boolean;
    dark_mode: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
    notify_appraisal_updates: true,
    notify_goal_reminders: true,
    notify_marketing: false,
    compact_mode: false,
    dark_mode: false,
};

interface PreferencesState extends Preferences {
    /** Replace all preferences at once (e.g. after API fetch) */
    setAll: (prefs: Partial<Preferences>) => void;
    /** Update a single preference key */
    setPref: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
    persist(
        (set) => ({
            ...DEFAULT_PREFERENCES,
            setAll: (prefs) => set({ ...DEFAULT_PREFERENCES, ...prefs }),
            setPref: (key, value) => set({ [key]: value }),
        }),
        {
            name: 'eas-preferences',
        }
    )
);
