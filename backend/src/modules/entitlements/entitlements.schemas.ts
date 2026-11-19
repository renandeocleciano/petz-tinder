import { z } from 'zod';

import { SUBSCRIPTION_TIERS } from '../../database/schema/index.js';
import { ENTITLEMENTS } from './entitlements.service.js';

export const entitlementsSchema = z
  .object({
    tier: z.enum(SUBSCRIPTION_TIERS),
    expiresAt: z.iso.datetime().nullable(),
    /** What the plan includes. Enforced today: SUPER_LIKE and MULTIPLE_PETS. */
    entitlements: z.record(z.enum(ENTITLEMENTS), z.boolean()),
    superLikes: z.object({
      /** null = unlimited. */
      limitPerDay: z.number().int().nullable(),
      remaining: z.number().int().nullable(),
    }),
    /** How many pets the plan allows per account. */
    pets: z.object({ limit: z.number().int() }),
  })
  .meta({ id: 'Entitlements' });

export const entitlementsResponseSchema = z.object({ entitlements: entitlementsSchema });

export const devSubscriptionBodySchema = z
  .object({
    tier: z.enum(SUBSCRIPTION_TIERS),
    /** Premium only. Omit for no end date. */
    durationDays: z.number().int().min(1).max(365).optional(),
  })
  .strict();
