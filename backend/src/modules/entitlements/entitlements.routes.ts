import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { errorResponseSchema } from '../../shared/schemas/error.js';
import { devSubscriptionBodySchema, entitlementsResponseSchema } from './entitlements.schemas.js';
import type { EntitlementsService } from './entitlements.service.js';
import type { SubscriptionsRepository } from './subscriptions.repository.js';

export interface EntitlementsRoutesOptions {
  entitlements: EntitlementsService;
}

export const entitlementsRoutes: FastifyPluginAsyncZod<EntitlementsRoutesOptions> = async (
  app,
  { entitlements },
) => {
  app.get(
    '/',
    { schema: { tags: ['entitlements'], response: { 200: entitlementsResponseSchema } } },
    async (request) => ({ entitlements: await entitlements.summary(request.auth.userId) }),
  );
};

export interface DevRoutesOptions {
  entitlements: EntitlementsService;
  subscriptions: SubscriptionsRepository;
  now?: () => Date;
}

/**
 * Development helpers. Registered only when NODE_ENV is not `production`: anyone could
 * upgrade themselves otherwise.
 */
export const devRoutes: FastifyPluginAsyncZod<DevRoutesOptions> = async (
  app,
  { entitlements, subscriptions, now = () => new Date() },
) => {
  /** Switches the caller's plan without a payment provider. */
  app.post(
    '/subscription',
    {
      schema: {
        tags: ['dev'],
        body: devSubscriptionBodySchema,
        response: { 200: entitlementsResponseSchema, 422: errorResponseSchema },
      },
    },
    async (request) => {
      const { tier, durationDays } = request.body;
      await subscriptions.replace(
        request.auth.userId,
        tier === 'premium'
          ? {
              tier,
              provider: 'dev',
              expiresAt: durationDays
                ? new Date(now().getTime() + durationDays * 86_400_000)
                : null,
            }
          : null,
      );
      return { entitlements: await entitlements.summary(request.auth.userId) };
    },
  );
};
