import { z } from 'zod';

import { LIKE_TYPES } from '../../database/schema/index.js';
import { matchSchema } from '../matches/matches.schemas.js';

export const createLikeBodySchema = z
  .object({
    fromPetId: z.uuid(),
    toPetId: z.uuid(),
    type: z.enum(LIKE_TYPES),
  })
  .strict()
  .refine((value) => value.fromPetId !== value.toPetId, {
    message: 'Um pet não pode curtir a si mesmo',
    path: ['toPetId'],
  });

export const likeSchema = z
  .object({
    id: z.uuid(),
    fromPetId: z.uuid(),
    toPetId: z.uuid(),
    type: z.enum(LIKE_TYPES),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: 'Like' });

export const likeResponseSchema = z.object({
  like: likeSchema,
  /** Present when this like completed a mutual match. */
  match: matchSchema.nullable(),
});

export type CreateLikeBody = z.output<typeof createLikeBodySchema>;
export type LikeDto = z.output<typeof likeSchema>;
export type LikeResponse = z.output<typeof likeResponseSchema>;
