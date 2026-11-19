import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { errorResponseSchema } from '../../shared/schemas/error.js';
import {
  listMatchesQuerySchema,
  matchIdParamsSchema,
  matchListResponseSchema,
  matchResponseSchema,
} from './matches.schemas.js';
import type { MatchesService } from './matches.service.js';

export interface MatchesRoutesOptions {
  matchesService: MatchesService;
}

const tags = ['matches'];
const errors = { 403: errorResponseSchema, 404: errorResponseSchema, 422: errorResponseSchema };

export const matchesRoutes: FastifyPluginAsyncZod<MatchesRoutesOptions> = async (
  app,
  { matchesService },
) => {
  app.get(
    '/',
    {
      schema: {
        tags,
        querystring: listMatchesQuerySchema,
        response: { 200: matchListResponseSchema, ...errors },
      },
    },
    (request) => matchesService.list(request.auth.userId, request.query),
  );

  app.get(
    '/:id',
    {
      schema: {
        tags,
        params: matchIdParamsSchema,
        response: { 200: matchResponseSchema, ...errors },
      },
    },
    async (request) => ({
      match: await matchesService.get(request.auth.userId, request.params.id),
    }),
  );

  /** Unmatch: removes the match and its conversation. */
  app.delete(
    '/:id',
    { schema: { tags, params: matchIdParamsSchema, response: { 204: z.null(), ...errors } } },
    async (request, reply) => {
      await matchesService.unmatch(request.auth.userId, request.params.id);
      return reply.status(204).send(null);
    },
  );
};

export default matchesRoutes;
