
import { Role } from './auth';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
    interface Session {
        accessToken?: string;
        refreshToken?: string;
        user: {
            id: string;
            role: Role;
        } & DefaultSession['user'];
        error?: string;
        tenantId?: string;
    }

    interface User {
        id: string;
        role: Role;
        accessToken?: string;
        refreshToken?: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        accessToken?: string;
        refreshToken?: string;
        role?: Role;
        userId?: string;
        error?: string;
        accessTokenExpires?: number;
    }
}
