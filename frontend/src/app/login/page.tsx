'use client';

import { signIn, useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Suspense } from 'react';

export default function LoginPage() {
    return (
        <Suspense fallback={
            <main className="flex min-h-screen items-center justify-center bg-slate-950">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-400 mx-auto mb-4"></div>
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
            <main className="flex min-h-screen items-center justify-center bg-slate-950">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-400 mx-auto mb-4"></div>
                    <p className="text-slate-400">Checking session...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen">
            {/* Left Panel — Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900">
                {/* Animated background shapes */}
                <div className="absolute inset-0">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-violet-600/20 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-32 right-16 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                    <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-fuchsia-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
                </div>

                {/* Grid pattern overlay */}
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }}
                />

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-center px-16 text-white">
                    <div className="mb-12">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <span className="text-2xl font-bold tracking-tight">EAS</span>
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight leading-tight mb-4">
                            Employee<br />
                            Appraisal<br />
                            System
                        </h1>
                        <p className="text-lg text-slate-300 max-w-md leading-relaxed">
                            Streamline performance reviews, set meaningful goals, and empower your workforce to grow.
                        </p>
                    </div>

                    {/* Feature highlights */}
                    <div className="space-y-4">
                        {[
                            { label: "Goal Tracking", desc: "Set, track and align objectives" },
                            { label: "360° Reviews", desc: "Comprehensive performance feedback" },
                            { label: "Analytics", desc: "Data-driven insights for growth" },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 group">
                                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-violet-500/30 transition-colors">
                                    <svg className="h-4 w-4 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{item.label}</p>
                                    <p className="text-xs text-slate-400">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Panel — Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center bg-slate-950 px-6">
                <div className="w-full max-w-md space-y-8">
                    {/* Mobile logo */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="inline-flex items-center gap-2 mb-3">
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold text-white tracking-tight">EAS</span>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-slate-900/80 backdrop-blur-sm p-8 shadow-2xl border border-slate-800/50">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold tracking-tight text-white">
                                Welcome back
                            </h2>
                            <p className="mt-2 text-sm text-slate-400">
                                Sign in to your account to continue
                            </p>
                        </div>

                        {error && (
                            <div className="rounded-lg bg-red-900/30 p-4 border border-red-800/50 mb-6">
                                <div className="flex items-center gap-2">
                                    <svg className="h-4 w-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <p className="text-sm text-red-300">
                                        {error === 'SessionExpired'
                                            ? 'Your session has expired. Please sign in again.'
                                            : error === 'CredentialsSignin'
                                                ? 'Invalid email or password.'
                                                : 'There was a problem signing you in.'}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-6">
                            <button
                                onClick={handleMicrosoftLogin}
                                disabled={isLoading || localLoading}
                                className="group relative flex w-full justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:shadow-blue-600/25"
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

                            <div className="relative flex items-center py-1">
                                <div className="flex-grow border-t border-slate-800"></div>
                                <span className="mx-4 flex-shrink text-xs text-slate-500 uppercase tracking-wider">or use demo account</span>
                                <div className="flex-grow border-t border-slate-800"></div>
                            </div>

                            <form onSubmit={handleLocalLogin} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={credentials.email}
                                        onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                                        className="block w-full rounded-xl bg-slate-800/60 border border-slate-700/50 text-white px-4 py-3 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors placeholder:text-slate-500"
                                        placeholder="name@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={credentials.password}
                                        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                        className="block w-full rounded-xl bg-slate-800/60 border border-slate-700/50 text-white px-4 py-3 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors placeholder:text-slate-500"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading || localLoading}
                                    className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:from-violet-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50 transition-all duration-200 hover:shadow-lg hover:shadow-violet-600/25"
                                >
                                    {localLoading ? 'Authenticating...' : 'Sign In'}
                                </button>
                            </form>
                        </div>
                    </div>

                    <p className="text-center text-xs text-slate-600">
                        &copy; {new Date().getFullYear()} Employee Appraisal System. All rights reserved.
                    </p>
                </div>
            </div>
        </main>
    );
}
