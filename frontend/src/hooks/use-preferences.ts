import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { Preferences, usePreferencesStore } from '@/lib/preferences-store';
import { toast } from 'sonner';

/**
 * Fetch current user's preferences from the API and sync into Zustand store.
 */
export function usePreferences() {
    const setAll = usePreferencesStore((s) => s.setAll);

    return useQuery({
        queryKey: ['preferences'],
        queryFn: async () => {
            const { data } = await apiClient.get<Preferences>('/api/users/me/preferences');
            // Sync server state → Zustand (drives dark/compact mode instantly)
            setAll(data);
            return data;
        },
    });
}

/**
 * Mutation to persist preferences to the API.
 * On success: invalidates the query cache and shows a toast.
 */
export function useUpdatePreferences() {
    const queryClient = useQueryClient();
    const setAll = usePreferencesStore((s) => s.setAll);

    return useMutation({
        mutationFn: async (prefs: Partial<Preferences>) => {
            const { data } = await apiClient.put<Preferences>(
                '/api/users/me/preferences',
                prefs,
            );
            return data;
        },
        onSuccess: (data) => {
            toast.success('Preferences saved');
            setAll(data);
            queryClient.invalidateQueries({ queryKey: ['preferences'] });
        },
        onError: () => {
            toast.error('Failed to save preferences');
        },
    });
}
