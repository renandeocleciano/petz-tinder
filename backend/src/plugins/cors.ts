import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fp from 'fastify-plugin';

/**
 * The mobile app does not need CORS; browser origins must be listed explicitly
 * (CORS_ORIGINS). Helmet sets the usual security headers.
 */
export default fp(
  async (app) => {
    await app.register(helmet, { global: true });
    await app.register(cors, {
      origin: app.config.CORS_ORIGINS.length > 0 ? app.config.CORS_ORIGINS : false,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    });
  },
  { name: 'cors', dependencies: ['config'] },
);
