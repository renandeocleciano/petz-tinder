import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { RATE_LIMITS } from '../../config/constants.js';
import { errorResponseSchema } from '../../shared/schemas/error.js';
import { createLikeBodySchema, likeResponseSchema } from './likes.schemas.js';
import type { LikesService } from './likes.service.js';

export interface LikesRoutesOptions {
  likesService: LikesService;
}

export const likesRoutes: FastifyPluginAsyncZod<LikesRoutesOptions> = async (
  app,
  { likesService },
) => {
  /** Swipe: like, dislike or super_like. Direct messages are a separate route. */
  app.post(
    '/',
    {
      config: { rateLimit: RATE_LIMITS.likes },
      schema: {
        tags: ['likes'],
        body: createLikeBodySchema,
        response: {
          201: likeResponseSchema,
          402: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
          422: errorResponseSchema,
        },
      },
    },
    async (request, reply) =>
      reply.status(201).send(await likesService.create(request.auth.userId, request.body)),
  );
};

export default likesRoutes;
