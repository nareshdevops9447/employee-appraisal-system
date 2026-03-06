
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

/**
 * Download the bulk goal upload template (.xlsx)
 */
export function useDownloadGoalTemplate() {
    return useMutation({
        mutationFn: async () => {
            const response = await apiClient.get('/api/goals/bulk/template', {
                responseType: 'blob',
            });
            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'goal_upload_template.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        },
        onSuccess: () => {
            toast.success('Template downloaded');
        },
        onError: () => {
            toast.error('Failed to download template');
        },
    });
}

export interface BulkUploadResult {
    message: string;
    created: number;
    skipped: number;
    errors: { row: number; message: string }[];
}

/**
 * Upload an .xlsx file to bulk-create goals.
 */
export function useUploadGoals() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            const { data } = await apiClient.post<BulkUploadResult>(
                '/api/goals/bulk/upload',
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                }
            );
            return data;
        },
        onSuccess: (data) => {
            if (data.created > 0) {
                toast.success(`${data.created} goal(s) created successfully`);
            }
            if (data.errors.length > 0) {
                toast.warning(`${data.errors.length} row(s) had errors`);
            }
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            queryClient.invalidateQueries({ queryKey: ['goals', 'stats'] });
        },
        onError: (error: any) => {
            const message = error?.response?.data?.error || 'Upload failed';
            toast.error(message);
        },
    });
}
