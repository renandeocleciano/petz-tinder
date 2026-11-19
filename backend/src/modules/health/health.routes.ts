import { sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

const statusSchema = z.object({ status: z.enum(['ok', 'unavailable']) });

/** Public probes: `/health` = process alive, `/ready` = can serve traffic (database reachable). */
export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/health',
    { schema: { tags: ['health'], security: [], response: { 200: statusSchema } } },
    async () => ({ status: 'ok' as const }),
  );

  app.get(
    '/ready',
    {
      schema: {
        tags: ['health'],
        security: [],
        response: { 200: statusSchema, 503: statusSchema },
      },
    },
    async (request, reply) => {
      try {
        await app.db.execute(sql`select 1`);
        return { status: 'ok' as const };
      } catch (error) {
        request.log.error({ err: error }, 'Readiness check failed');
        return reply.status(503).send({ status: 'unavailable' as const });
      }
    },
  );
};

export default healthRoutes;
