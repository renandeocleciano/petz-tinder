import { verifyToken } from '@clerk/backend';

import type { Env } from '../config/env.js';
import type { TokenVerifier } from './auth.js';

/** Clerk session token verification (JWKS fetched once and cached by the SDK). */
export const createClerkTokenVerifier =
  (env: Env): TokenVerifier =>
  async (token) => {
    const payload = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
      ...(env.CLERK_AUTHORIZED_PARTIES.length > 0
        ? { authorizedParties: env.CLERK_AUTHORIZED_PARTIES }
        : {}),
    });
    if (!payload.sub) throw new Error('Token without subject');
    return payload.sub;
  };
