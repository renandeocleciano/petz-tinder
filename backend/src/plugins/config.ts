import fp from 'fastify-plugin';

import type { Env } from '../config/env.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: Env;
  }
}

export default fp<{ env: Env }>(
  async (app, { env }) => {
    app.decorate('config', env);
  },
  { name: 'config' },
);
