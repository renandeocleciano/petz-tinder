import type { FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

import { UnauthorizedError } from '../shared/errors/index.js';

export interface AuthContext {
  /** Internal user id (domain key). */
  userId: string;
  clerkUserId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by `app.authenticate`; only read it inside authenticated routes. */
    auth: AuthContext;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/** Verifies a session token and returns the Clerk user id (`sub`). Throws when invalid. */
export type TokenVerifier = (token: string) => Promise<string>;
/** Maps a Clerk user id to the internal user, creating it on first sight. */
export type UserResolver = (clerkUserId: string) => Promise<{ id: string }>;

export interface AuthPluginOptions {
  verifyToken: TokenVerifier;
  resolveUser: UserResolver;
}

const BEARER = /^Bearer\s+(\S+)$/i;

export default fp<AuthPluginOptions>(
  async (app, { verifyToken, resolveUser }) => {
    app.decorateRequest('auth', null as unknown as AuthContext);

    app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
      const token = BEARER.exec(request.headers.authorization ?? '')?.[1];
      if (!token) throw new UnauthorizedError('Token de acesso ausente', 'MISSING_TOKEN');

      let clerkUserId: string;
      try {
        clerkUserId = await verifyToken(token);
      } catch {
        throw new UnauthorizedError('Token de acesso inválido ou expirado', 'INVALID_TOKEN');
      }

      const user = await resolveUser(clerkUserId);
      request.auth = { userId: user.id, clerkUserId };
      // Every later log line of this request carries the user id.
      request.log = request.log.child({ userId: user.id });
      reply.log = request.log;
    });
  },
  { name: 'auth' },
);
