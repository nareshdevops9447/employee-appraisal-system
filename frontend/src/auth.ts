/**
 * NextAuth.js v5 configuration with Microsoft Entra ID (Azure AD) provider.
 *
 * Flow:
 * 1. User clicks "Sign in with Microsoft" → Azure AD login
 * 2. signIn callback → sends Azure token to backend Auth Service
 * 3. Backend validates Azure token, creates/finds user, returns app JWT
 * 4. jwt callback → stores backend JWT in NextAuth token
 * 5. session callback → exposes role + accessToken in session
 */
import NextAuth from 'next-auth';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import CredentialsProvider from 'next-auth/providers/credentials';

import type { Role } from '@/types/auth';

const AUTH_SERVICE_URL =
    process.env.AUTH_SERVICE_URL || 'http://localhost:5000/api';


const clientId = process.env.AZURE_AD_CLIENT_ID ?? '';
const clientSecret = process.env.AZURE_AD_CLIENT_SECRET ?? '';
// const tenantId = process.env.AZURE_AD_TENANT_ID ?? ''; // Not used here anymore

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        MicrosoftEntraID({
            clientId,
            clientSecret,
            issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID || 'common'}/v2.0`,
            authorization: {
                params: {
                    scope: 'openid profile email offline_access https://graph.microsoft.com/User.Read',
                    prompt: 'select_account',
                },
            },
        }),
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                try {
                    const res = await fetch(`${AUTH_SERVICE_URL}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password,
                        }),
                    });

                    if (!res.ok) return null;

                    const data = await res.json();

                    // The backend returns { access_token, refresh_token, user: { id, email, role, ... } }
                    // We return an object that matches the shape NextAuth expects in the jwt callback's 'user' or 'account'
                    return {
                        id: data.user.id,
                        email: data.user.email,
                        role: data.user.role,
                        backendAccessToken: data.access_token,
                        backendRefreshToken: data.refresh_token,
                    };
                } catch (error) {
                    console.error('[Auth] Local login error:', error);
                    return null;
                }
            }
        }),
    ],


    pages: {
        signIn: '/login',
        error: '/login',
    },

    callbacks: {
        /**
         * Called after successful Azure AD authentication.
         * Sends the Azure token to our backend Auth Service.
         */
        async signIn({ account }) {
            if (account?.provider === 'microsoft-entra-id') {
                try {
                    const idToken = account.id_token;
                    if (!idToken) {
                        console.error('[Auth] No id_token from Azure AD');
                        return false;
                    }

                    const res = await fetch(
                        `${AUTH_SERVICE_URL}/auth/azure/callback`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                id_token: idToken,
                                access_token: account.access_token
                            }),
                        }
                    );

                    if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        console.error('[Auth] Backend callback failed:', err);
                        return false;
                    }

                    const data = await res.json();

                    // Stash backend tokens on the account object so jwt callback can read them
                    (account as Record<string, unknown>).backendAccessToken =
                        data.access_token;
                    (account as Record<string, unknown>).backendRefreshToken =
                        data.refresh_token;
                    (account as Record<string, unknown>).backendUser =
                        data.user;

                    return true;
                } catch (error) {
                    console.error('[Auth] Error during signIn callback:', error);
                    return false;
                }
            }
            return true;
        },

        /**
         * Persist backend tokens and role in the NextAuth JWT.
         */
        async jwt({ token, account, user }) {
            // Initial sign in
            if (account && user) {
                if (account.provider === 'credentials') {
                    // From CredentialsProvider authorize()
                    const u = user as any;
                    token.accessToken = u.backendAccessToken;
                    token.refreshToken = u.backendRefreshToken;
                    token.role = u.role || 'employee';
                    token.userId = u.id;
                } else if (account.provider === 'microsoft-entra-id') {
                    // From MicrosoftEntraID signIn() callback stashing
                    const acc = account as any;
                    token.accessToken = acc.backendAccessToken;
                    token.refreshToken = acc.backendRefreshToken;
                    token.role = acc.backendUser?.role || 'employee';
                    token.userId = acc.backendUser?.id;
                }

                // Access token expires in ~15 minutes
                token.accessTokenExpires = Date.now() + 14 * 60 * 1000;
                return token;
            }

            // Token still valid — return as-is
            if (
                token.accessTokenExpires &&
                Date.now() < (token.accessTokenExpires as number)
            ) {
                return token;
            }

            // Access token expired — try to refresh
            return await refreshAccessToken(token);
        },

        /**
         * Expose backend role and access token on the client session.
         */
        async session({ session, token }) {
            session.accessToken = token.accessToken as string | undefined;
            session.refreshToken = token.refreshToken as string | undefined;
            session.error = token.error as string | undefined;

            if (session.user) {
                session.user.role = (token.role as Role) || 'employee';
                session.user.id = (token.userId as string) || '';
            }

            return session;
        },
    },

    session: {
        strategy: 'jwt',
        maxAge: 7 * 24 * 60 * 60, // 7 days (matches refresh token)
    },
});

/**
 * Refresh the access token using the backend refresh endpoint.
 */
async function refreshAccessToken(
    token: Record<string, unknown>
): Promise<Record<string, unknown>> {
    try {
        const res = await fetch(`${AUTH_SERVICE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                refresh_token: token.refreshToken,
            }),
        });

        if (!res.ok) {
            console.error('[Auth] Refresh token failed:', res.status);
            return { ...token, error: 'RefreshAccessTokenError' };
        }

        const data = await res.json();

        return {
            ...token,
            accessToken: data.access_token,
            refreshToken: data.refresh_token ?? token.refreshToken,
            accessTokenExpires: Date.now() + 14 * 60 * 1000,
            error: undefined,
        };
    } catch (error) {
        console.error('[Auth] Error refreshing access token:', error);
        return { ...token, error: 'RefreshAccessTokenError' };
    }
}