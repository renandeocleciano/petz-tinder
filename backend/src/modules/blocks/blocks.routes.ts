import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { errorResponseSchema } from '../../shared/schemas/error.js';
import {
  blockedUserParamsSchema,
  blockListResponseSchema,
  blockResponseSchema,
  createBlockBodySchema,
} from './blocks.schemas.js';
import type { BlocksService } from './blocks.service.js';

export interface BlocksRoutesOptions {
  blocksService: BlocksService;
}

const tags = ['blocks'];
const errors = { 404: errorResponseSchema, 422: errorResponseSchema };

export const blocksRoutes: FastifyPluginAsyncZod<BlocksRoutesOptions> = async (
  app,
  { blocksService },
) => {
  app.post(
    '/',
    {
      schema: {
        tags,
        body: createBlockBodySchema,
        response: { 201: blockResponseSchema, ...errors },
      },
    },
    async (request, reply) =>
      reply.status(201).send({
        block: await blocksService.block(request.auth.userId, request.body.targetUserId),
      }),
  );

  /** Idempotent: unblocking someone who is not blocked also answers 204. */
  app.delete(
    '/:userId',
    {
      schema: { tags, params: blockedUserParamsSchema, response: { 204: z.null(), ...errors } },
    },
    async (request, reply) => {
      await blocksService.unblock(request.auth.userId, request.params.userId);
      return reply.status(204).send(null);
    },
  );

  app.get(
    '/',
    { schema: { tags, response: { 200: blockListResponseSchema } } },
    async (request) => ({ data: await blocksService.list(request.auth.userId) }),
  );
};

export default blocksRoutes;
