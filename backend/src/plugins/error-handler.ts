import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from 'fastify-type-provider-zod';

import { DomainError } from '../shared/errors/index.js';
import type { ErrorResponse } from '../shared/schemas/error.js';

const send = (
  request: FastifyRequest,
  reply: FastifyReply,
  statusCode: number,
  error: Omit<ErrorResponse['error'], 'requestId'>,
) => reply.status(statusCode).send({ error: { ...error, requestId: request.id } });

/**
 * Every error leaves the API as `{ error: { code, message, requestId } }`. Unexpected errors
 * (database, bugs) are logged and answered with a generic message — never the raw cause.
 */
export default fp(
  async (app) => {
    app.setErrorHandler((error: FastifyError | DomainError, request, reply) => {
      if (error instanceof DomainError) {
        if (error.statusCode >= 500) request.log.error({ err: error }, error.message);
        return send(request, reply, error.statusCode, {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined ? { details: error.details } : {}),
        });
      }

      if (hasZodFastifySchemaValidationErrors(error)) {
        return send(request, reply, 422, {
          code: 'VALIDATION_ERROR',
          message: 'Dados inválidos',
          details: error.validation.map((issue) => ({
            location: error.validationContext,
            path: issue.instancePath,
            message: issue.message,
          })),
        });
      }

      if (isResponseSerializationError(error)) {
        request.log.error(
          { err: error, issues: error.cause.issues },
          'Response does not match schema',
        );
        return send(request, reply, 500, { code: 'INTERNAL_ERROR', message: 'Erro interno' });
      }

      const statusCode = 'statusCode' in error ? error.statusCode : undefined;
      if (statusCode && statusCode >= 400 && statusCode < 500) {
        return send(request, reply, statusCode, { code: 'BAD_REQUEST', message: error.message });
      }

      request.log.error({ err: error }, 'Unhandled error');
      return send(request, reply, 500, { code: 'INTERNAL_ERROR', message: 'Erro interno' });
    });

    app.setNotFoundHandler((request, reply) =>
      send(request, reply, 404, { code: 'ROUTE_NOT_FOUND', message: 'Rota não encontrada' }),
    );
  },
  { name: 'error-handler' },
);
