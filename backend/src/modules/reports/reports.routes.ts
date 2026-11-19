import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { RATE_LIMITS } from '../../config/constants.js';
import { errorResponseSchema } from '../../shared/schemas/error.js';
import { createReportBodySchema, reportResponseSchema } from './reports.schemas.js';
import type { ReportsService } from './reports.service.js';

export interface ReportsRoutesOptions {
  reportsService: ReportsService;
}

export const reportsRoutes: FastifyPluginAsyncZod<ReportsRoutesOptions> = async (
  app,
  { reportsService },
) => {
  app.post(
    '/',
    {
      config: { rateLimit: RATE_LIMITS.reports },
      schema: {
        tags: ['reports'],
        body: createReportBodySchema,
        response: { 201: reportResponseSchema, 404: errorResponseSchema, 422: errorResponseSchema },
      },
    },
    async (request, reply) =>
      reply.status(201).send({
        report: await reportsService.create(request.auth.userId, request.body),
      }),
  );
};

export default reportsRoutes;
