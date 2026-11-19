import { z } from 'zod';

export const MAX_BLOCKS_LISTED = 500;

export const createBlockBodySchema = z
  .object({
    /** The pet owner's id (`ownerId` in the pet payload). */
    targetUserId: z.uuid(),
  })
  .strict();

export const blockedUserParamsSchema = z.object({ userId: z.uuid() });

export const blockSchema = z
  .object({
    userId: z.uuid(),
    name: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    createdAt: z.iso.datetime(),
  })
  .meta({ id: 'Block' });

export const blockResponseSchema = z.object({ block: blockSchema });
export const blockListResponseSchema = z.object({ data: z.array(blockSchema) });

export type BlockDto = z.output<typeof blockSchema>;
