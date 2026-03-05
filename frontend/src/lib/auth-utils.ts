/**
 * Auth utilities for server and client components.
 */
import { getServerSession as _getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

/**
 * Get the current session in a server component or API route.
 * Usage: const session = await getServerSession();
 */
export async function getServerSession() {
    return await _getServerSession(authOptions);
}

// Re-export useSession for client components
export { useSession } from 'next-auth/react';
export { signIn, signOut } from 'next-auth/react';
