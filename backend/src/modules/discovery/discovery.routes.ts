import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { errorResponseSchema } from '../../shared/schemas/error.js';
import { createDiscoveryController } from './discovery.controller.js';
import {
  discoveryQuerySchema,
  discoveryResponseSchema,
  nearbyQuerySchema,
  nearbyResponseSchema,
} from './discovery.schemas.js';
import type { DiscoveryService } from './discovery.service.js';

export interface DiscoveryRoutesOptions {
  discoveryService: DiscoveryService;
}

const tags = ['discovery'];
const errors = { 403: errorResponseSchema, 404: errorResponseSchema, 422: errorResponseSchema };

export const discoveryRoutes: FastifyPluginAsyncZod<DiscoveryRoutesOptions> = async (
  app,
  { discoveryService },
) => {
  const controller = createDiscoveryController(discoveryService);

  /** Swipe deck for one of the caller's pets, ranked and paginated by cursor. */
  app.get(
    '/',
    {
      schema: {
        tags,
        querystring: discoveryQuerySchema,
        response: { 200: discoveryResponseSchema, ...errors },
      },
    },
    controller.discover,
  );

  /** Map pins. Coordinates are obfuscated; distances are rounded. */
  app.get(
    '/nearby',
    {
      schema: {
        tags,
        querystring: nearbyQuerySchema,
        response: { 200: nearbyResponseSchema, ...errors },
      },
    },
    controller.nearby,
  );
};

export default discoveryRoutes;
