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
    const [localLoading, setLocalLoading] = useState(false);
    const [credentials, setCredentials] = useState({ email: '', password: '' });

    useEffect(() => {
        if (status === 'authenticated') {
            router.replace(callbackUrl);
        }
    }, [status, router, callbackUrl]);

    const handleMicrosoftLogin = async () => {
        setIsLoading(true);
        try {
            await signIn('microsoft-entra-id', { callbackUrl });
        } catch (error) {
            console.error('Login failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLocalLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalLoading(true);
        try {
            const result = await signIn('credentials', {
                email: credentials.email,
                password: credentials.password,
                redirect: false,
                callbackUrl,
            });

            if (result?.error) {
                router.push(`/login?error=CredentialsSignin&callbackUrl=${encodeURIComponent(callbackUrl)}`);
            } else {
                router.replace(callbackUrl);
            }
        } catch (err) {
            console.error('Local login failed:', err);
        } finally {
            setLocalLoading(false);
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
                                        : error === 'CredentialsSignin'
                                            ? 'Invalid email or password.'
                                            : 'There was a problem signing you in.'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-8 space-y-6">
                    <button
                        onClick={handleMicrosoftLogin}
                        disabled={isLoading || localLoading}
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
                                    <path fill="#81bc06" d="M12 1h10v10H1z" />
                                    <path fill="#05a6f0" d="M1 12h10v10H1z" />
                                    <path fill="#ffba08" d="M12 12h10v10H1z" />
                                </svg>
                                Sign in with Microsoft
                            </span>
                        )}
                    </button>

                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-slate-800"></div>
                        <span className="mx-4 flex-shrink text-sm text-slate-500">or use demo account</span>
                        <div className="flex-grow border-t border-slate-800"></div>
                    </div>

                    <form onSubmit={handleLocalLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                            <input
                                type="email"
                                required
                                value={credentials.email}
                                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                                className="block w-full rounded-lg bg-slate-800 border-slate-700 text-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-blue-500"
                                placeholder="name@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
                            <input
                                type="password"
                                required
                                value={credentials.password}
                                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                className="block w-full rounded-lg bg-slate-800 border-slate-700 text-white px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-blue-500"
                                placeholder="••••••••"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading || localLoading}
                            className="w-full rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
                        >
                            {localLoading ? 'Authenticating...' : 'Sign In'}
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
}
