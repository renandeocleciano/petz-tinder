import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { errorResponseSchema } from '../../shared/schemas/error.js';
import { listPlaydatesQuerySchema, playdateListResponseSchema } from './conversations.schemas.js';
import type { ConversationsService } from './conversations.service.js';

export interface PlaydatesRoutesOptions {
  conversationsService: ConversationsService;
}

/**
 * Playdates live as `playdate_invite` messages; this is a cross-conversation view of them
 * ("Meus passeios"). Answering still goes through the conversation route.
 */
export const playdatesRoutes: FastifyPluginAsyncZod<PlaydatesRoutesOptions> = async (
  app,
  { conversationsService },
) => {
  app.get(
    '/',
    {
      schema: {
        tags: ['playdates'],
        querystring: listPlaydatesQuerySchema,
        response: {
          200: playdateListResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          422: errorResponseSchema,
        },
      },
    },
    async (request) => ({
      data: await conversationsService.listPlaydates(request.auth.userId, request.query),
    }),
  );
};

export default playdatesRoutes;
