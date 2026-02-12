import { auth } from '@/auth';
import Link from 'next/link';

export default async function Home() {
    const session = await auth();

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-white">
            <div className="text-center space-y-4 max-w-2xl px-4">
                <h1 className="text-5xl font-bold tracking-tight">
                    Employee Appraisal System
                </h1>
                <p className="text-xl text-slate-300">
                    Performance management for your organisation
                </p>

                <div className="pt-8 flex justify-center gap-4">
                    {session ? (
                        <div className="space-y-4">
                            <div className="text-green-400 font-medium">
                                You are signed in as {session.user?.name || session.user?.email}
                            </div>
                            <Link
                                href="/dashboard"
                                className="inline-block rounded-lg bg-blue-600 px-8 py-3 text-lg font-semibold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
                            >
                                Go to Dashboard
                            </Link>
                        </div>
                    ) : (
                        <Link
                            href="/login"
                            className="inline-block rounded-lg bg-blue-600 px-8 py-3 text-lg font-semibold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
                        >
                            Get Started
                        </Link>
                    )}
                </div>
            </div>
        </main>
    );
}
