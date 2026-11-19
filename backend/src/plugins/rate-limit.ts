import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';

import { RATE_LIMITS } from '../config/constants.js';
import { DomainError } from '../shared/errors/index.js';

/**
 * In-memory limiter (single instance). Runs on `preHandler`, after authentication, so
 * authenticated requests are limited per user and anonymous ones per IP. Routes override
 * the limit with `config: { rateLimit: RATE_LIMITS.likes }`.
 */
export default fp(
  async (app) => {
    await app.register(rateLimit, {
      ...RATE_LIMITS.global,
      hook: 'preHandler',
      keyGenerator: (request) => request.auth?.userId ?? request.ip,
      errorResponseBuilder: (_request, context) =>
        new DomainError(429, 'RATE_LIMITED', 'Muitas requisições. Tente novamente em instantes.', {
          details: { retryAfterSeconds: Math.ceil(context.ttl / 1000) },
        }),
    });
  },
  { name: 'rate-limit', dependencies: ['auth'] },
);
