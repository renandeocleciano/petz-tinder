import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fp from 'fastify-plugin';
import { jsonSchemaTransform, jsonSchemaTransformObject } from 'fastify-type-provider-zod';

/** OpenAPI spec and UI at /docs, outside production only. */
export default fp(
  async (app) => {
    if (app.config.NODE_ENV === 'production') return;

    await app.register(swagger, {
      openapi: {
        info: { title: 'Petz API', version: '1.0.0' },
        components: {
          securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
        },
        security: [{ bearerAuth: [] }],
      },
      transform: jsonSchemaTransform,
      transformObject: jsonSchemaTransformObject,
    });
    await app.register(swaggerUi, { routePrefix: '/docs', staticCSP: true });
  },
  { name: 'swagger', dependencies: ['config'] },
);
