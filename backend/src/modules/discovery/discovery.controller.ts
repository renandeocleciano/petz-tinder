import type { FastifyRequest } from 'fastify';

import type { DiscoveryQuery, NearbyQueryInput } from './discovery.schemas.js';
import type { DiscoveryService } from './discovery.service.js';

export const createDiscoveryController = (service: DiscoveryService) => ({
  discover: (request: FastifyRequest<{ Querystring: DiscoveryQuery }>) =>
    service.discover(request.auth.userId, request.query),

  nearby: (request: FastifyRequest<{ Querystring: NearbyQueryInput }>) =>
    service.nearby(request.auth.userId, request.query),
});
