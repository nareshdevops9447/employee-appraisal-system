/**
 * Middleware — protects routes based on authentication and roles.
 *
 * Public routes: /, /login, /unauthorized, /api/auth/*
 * Admin routes: /admin/* requires hr_admin or super_admin
 * All other routes require authentication.
 */
import { auth } from './auth';
import { NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/unauthorized'];
const PUBLIC_PREFIXES = ['/api/auth/', '/_next/', '/favicon.ico'];
const ADMIN_PREFIX = '/admin';
const ADMIN_ROLES = ['hr_admin', 'super_admin'];

export default auth((req) => {
    const { pathname } = req.nextUrl;

    // Allow public paths
    if (PUBLIC_PATHS.includes(pathname)) {
        return NextResponse.next();
    }

    // Allow public prefixes (auth API, static assets)
    for (const prefix of PUBLIC_PREFIXES) {
        if (pathname.startsWith(prefix)) {
            return NextResponse.next();
        }
    }

    const session = req.auth;

    // Not authenticated → redirect to login
    if (!session?.user) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Check for token refresh errors → force re-login
    if (session.error === 'RefreshAccessTokenError') {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('error', 'SessionExpired');
        return NextResponse.redirect(loginUrl);
    }

    // Admin routes → check role
    if (pathname.startsWith(ADMIN_PREFIX)) {
        const userRole = session.user.role;
        if (!ADMIN_ROLES.includes(userRole)) {
            return NextResponse.redirect(new URL('/unauthorized', req.url));
        }
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
