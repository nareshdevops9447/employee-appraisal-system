import useSWR from 'swr';
import apiClient from '@/lib/api-client';

export interface Discussion {
    id: string;
    employee_id: string;
    manager_id: string;
    content: string;
    is_private: boolean;
    meeting_date: string;
    created_at: string;
    updated_at: string;
}

export function useDiscussions(employeeId: string | undefined) {
    const fetcher = (url: string) => apiClient.get(url).then(res => res.data);

    const { data, error, isLoading, mutate } = useSWR<Discussion[]>(
        employeeId ? `/api/discussions/${employeeId}` : null,
        fetcher
    );

    return {
        data,
        isLoading,
        isError: error,
        mutate,
    };
}
