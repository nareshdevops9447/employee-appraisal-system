import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

export interface Department {
    id: string;
    name: string;
    description?: string;
    head_id?: string;
}

export const useDepartments = () => {
    return useQuery({
        queryKey: ['departments'],
        queryFn: async () => {
            const { data } = await apiClient.get<Department[]>('/api/departments');
            return data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const useCreateDepartment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Partial<Department>) => {
            const res = await apiClient.post<Department>('/api/departments/', data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            toast.success("Department created successfully");
        },
        onError: (err: unknown) => {
            const error = err as { response?: { data?: { error?: string } } };
            toast.error(error.response?.data?.error || "Failed to create department");
        }
    });
};

export const useUpdateDepartment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string, data: Partial<Department> }) => {
            const res = await apiClient.put<Department>(`/api/departments/${id}`, data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            toast.success("Department updated successfully");
        },
        onError: (err: unknown) => {
            const error = err as { response?: { data?: { error?: string } } };
            toast.error(error.response?.data?.error || "Failed to update department");
        }
    });
};

export const useDeleteDepartment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await apiClient.delete(`/api/departments/${id}`);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            toast.success("Department deleted successfully");
        },
        onError: (err: unknown) => {
            const error = err as { response?: { data?: { error?: string } } };
            toast.error(error.response?.data?.error || "Failed to delete department");
        }
    });
};
