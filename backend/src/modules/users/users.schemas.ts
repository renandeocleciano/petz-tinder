import { z } from 'zod';

import { SUBSCRIPTION_TIERS, type SubscriptionTier } from '../../database/schema/index.js';
import { petSchema } from '../pets/pets.schemas.js';
import { storagePathSchema } from '../media/media.schemas.js';
import type { User } from './users.types.js';

export const userSchema = z
  .object({
    id: z.uuid(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    /** Derived from the active subscription. */
    subscriptionTier: z.enum(SUBSCRIPTION_TIERS),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: 'User' });

export const userResponseSchema = z.object({ user: userSchema });
export const meResponseSchema = z.object({ user: userSchema, pets: z.array(petSchema) });

export const updateMeBodySchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    /** Path from POST /v1/media/upload-url (purpose `user_avatar`); null removes the avatar. */
    avatarPath: storagePathSchema.nullable().optional(),
    pushToken: z
      .string()
      .regex(/^Expo(nent)?PushToken\[[^\]]+\]$/, 'Expo push token inválido')
      .optional(),
  })
  .strict();

export const toUserDto = (
  user: User,
  subscriptionTier: SubscriptionTier,
): z.output<typeof userSchema> => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatarUrl: user.avatarUrl,
  subscriptionTier,
  createdAt: user.createdAt.toISOString(),
});
