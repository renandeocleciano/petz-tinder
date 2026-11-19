import type { FastifyServerOptions } from 'fastify';

import type { Env } from './env.js';

/**
 * Structured logs (Pino). Query strings are dropped from logged URLs because they carry
 * coordinates; auth headers and tokens are redacted.
 */
export const loggerOptions = (env: Env): FastifyServerOptions['logger'] => {
  if (env.NODE_ENV === 'test') return false;
  return {
    level: env.LOG_LEVEL,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        '*.token',
        '*.pushToken',
        '*.latitude',
        '*.longitude',
      ],
      censor: '[redacted]',
    },
    serializers: {
      req: (request) => ({
        method: request.method,
        url: request.url.split('?')[0],
        route: request.routeOptions?.url,
      }),
    },
    ...(env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss' } } }
      : {}),
  };
};
