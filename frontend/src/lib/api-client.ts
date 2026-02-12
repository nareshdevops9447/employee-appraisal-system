/**
 * Axios API client with automatic JWT attachment and 401 refresh handling.
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getSession, signOut } from 'next-auth/react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

/**
 * Request interceptor — attach JWT access token from NextAuth session.
 */
apiClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        // Only run in browser
        if (typeof window !== 'undefined') {
            const session = await getSession();
            if (session?.accessToken) {
                config.headers.Authorization = `Bearer ${session.accessToken}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);


/**
 * Response interceptor — handle 401 by attempting token refresh.
 */
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
    config: InternalAxiosRequestConfig;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            if (prom.config.headers && token) {
                prom.config.headers.Authorization = `Bearer ${token}`;
            }
            apiClient(prom.config)
                .then(prom.resolve)
                .catch(prom.reject);
        }
    });
    failedQueue = [];
};

apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
            _retry?: boolean;
        };

        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject, config: originalRequest });
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            // Force NextAuth to refresh the session
            // Note: In NextAuth v5 client-side, getSession doesn't always trigger refresh if checking cache.
            // But usually accessing the session endpoint does.
            // For now assuming existing auth-utils logic works or standard next-auth behavior.
            const session = await getSession();

            if (!session?.accessToken || session?.error === 'RefreshAccessTokenError') {
                processQueue(new Error('Failed to refresh token'));
                await signOut({ callbackUrl: '/login' });
                return Promise.reject(error);
            }

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${session.accessToken}`;

            // Process queued requests
            processQueue(null, session.accessToken);

            return apiClient(originalRequest);
        } catch (refreshError) {
            processQueue(refreshError as Error);
            await signOut({ callbackUrl: '/login' });
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

export default apiClient;

