
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    per_page: number;
    pages: number;
}

export interface ApiError {
    message: string;
    code?: string;
    status?: number;
}
