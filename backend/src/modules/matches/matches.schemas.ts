import { z } from 'zod';

import { petSchema } from '../pets/pets.schemas.js';

export const matchSchema = z
  .object({
    id: z.uuid(),
    conversationId: z.uuid(),
    /** The caller's pet in this match. */
    myPetId: z.uuid(),
    /** The other pet. */
    pet: petSchema,
    /** No message exchanged yet. */
    isNew: z.boolean(),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: 'Match' });

export const listMatchesQuerySchema = z.object({
  /** Only matches of this pet (must be the caller's). */
  petId: z.uuid().optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const matchIdParamsSchema = z.object({ id: z.uuid() });

export const matchResponseSchema = z.object({ match: matchSchema });
export const matchListResponseSchema = z.object({
  data: z.array(matchSchema),
  nextCursor: z.string().nullable(),
});

export type MatchDto = z.output<typeof matchSchema>;
export type ListMatchesQueryInput = z.output<typeof listMatchesQuerySchema>;
