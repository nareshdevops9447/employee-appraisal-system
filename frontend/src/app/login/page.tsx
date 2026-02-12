'use client';

import { signIn, useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { Suspense } from 'react';

export default function LoginPage() {
    return (
        <Suspense fallback={
            <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading...</p>
                </div>
            </main>
        }>
            <LoginForm />
        </Suspense>
    );
}

function LoginForm() {
    const { status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
    const error = searchParams.get('error');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (status === 'authenticated') {
            router.replace(callbackUrl);
        }
    }, [status, router, callbackUrl]);

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            await signIn('microsoft-entra-id', { callbackUrl });
        } catch (error) {
            console.error('Login failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (status === 'loading' || status === 'authenticated') {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-slate-400">Checking session...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white">
            <div className="w-full max-w-md space-y-8 rounded-xl bg-slate-900 p-8 shadow-2xl border border-slate-800">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-white">
                        Welcome Back
                    </h1>
                    <p className="mt-2 text-sm text-slate-400">
                        Sign in to the Employee Appraisal System
                    </p>
                </div>

                {error && (
                    <div className="rounded-md bg-red-900/50 p-4 border border-red-800">
                        <div className="flex">
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-200">
                                    Authentication Error
                                </h3>
                                <div className="mt-2 text-sm text-red-300">
                                    {error === 'SessionExpired'
                                        ? 'Your session has expired. Please sign in again.'
                                        : 'There was a problem signing you in.'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-8 space-y-6">
                    <button
                        onClick={handleLogin}
                        disabled={isLoading}
                        className="group relative flex w-full justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Signing in...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <svg className="h-5 w-5" viewBox="0 0 23 23" fill="currentColor">
                                    <path fill="#f35325" d="M1 1h10v10H1z" />
                                    <path fill="#81bc06" d="M12 1h10v10H12z" />
                                    <path fill="#05a6f0" d="M1 12h10v10H1z" />
                                    <path fill="#ffba08" d="M12 12h10v10H12z" />
                                </svg>
                                Sign in with Microsoft
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </main>
    );
}
