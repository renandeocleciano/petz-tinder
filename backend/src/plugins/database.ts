import fp from 'fastify-plugin';

import type { Database, DatabaseConnection } from '../database/index.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
  }
}

export interface DatabasePluginOptions {
  connection: DatabaseConnection;
}

export default fp<DatabasePluginOptions>(
  async (app, { connection }) => {
    app.decorate('db', connection.db);
    app.addHook('onClose', async () => {
      await connection.close();
    });
  },
  { name: 'database' },
);
