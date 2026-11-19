import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { RATE_LIMITS } from '../../config/constants.js';
import { errorResponseSchema } from '../../shared/schemas/error.js';
import {
  answerPlaydateBodySchema,
  conversationIdParamsSchema,
  conversationListResponseSchema,
  conversationResponseSchema,
  listConversationsQuerySchema,
  listMessagesQuerySchema,
  messageListResponseSchema,
  messageParamsSchema,
  messageResponseSchema,
  sendMessageBodySchema,
} from './conversations.schemas.js';
import type { ConversationsService } from './conversations.service.js';

export interface ConversationsRoutesOptions {
  conversationsService: ConversationsService;
}

const tags = ['conversations'];
const errors = {
  403: errorResponseSchema,
  404: errorResponseSchema,
  409: errorResponseSchema,
  422: errorResponseSchema,
};

export const conversationsRoutes: FastifyPluginAsyncZod<ConversationsRoutesOptions> = async (
  app,
  { conversationsService: service },
) => {
  app.get(
    '/',
    {
      schema: {
        tags,
        querystring: listConversationsQuerySchema,
        response: { 200: conversationListResponseSchema, ...errors },
      },
    },
    (request) => service.list(request.auth.userId, request.query),
  );

  app.get(
    '/:id',
    {
      schema: {
        tags,
        params: conversationIdParamsSchema,
        response: { 200: conversationResponseSchema, ...errors },
      },
    },
    async (request) => ({
      conversation: await service.get(request.auth.userId, request.params.id),
    }),
  );

  app.get(
    '/:id/messages',
    {
      schema: {
        tags,
        params: conversationIdParamsSchema,
        querystring: listMessagesQuerySchema,
        response: { 200: messageListResponseSchema, ...errors },
      },
    },
    (request) => service.listMessages(request.auth.userId, request.params.id, request.query),
  );

  app.post(
    '/:id/messages',
    {
      config: { rateLimit: RATE_LIMITS.messages },
      schema: {
        tags,
        params: conversationIdParamsSchema,
        body: sendMessageBodySchema,
        response: { 201: messageResponseSchema, ...errors },
      },
    },
    async (request, reply) =>
      reply.status(201).send({
        message: await service.send(request.auth.userId, request.params.id, request.body),
      }),
  );

  /** Marks everything up to now as read for the caller's pet. */
  app.post(
    '/:id/read',
    {
      schema: { tags, params: conversationIdParamsSchema, response: { 204: z.null(), ...errors } },
    },
    async (request, reply) => {
      await service.markRead(request.auth.userId, request.params.id);
      return reply.status(204).send(null);
    },
  );

  app.patch(
    '/:id/messages/:messageId/playdate',
    {
      schema: {
        tags,
        params: messageParamsSchema,
        body: answerPlaydateBodySchema,
        response: { 200: messageResponseSchema, ...errors },
      },
    },
    async (request) => ({
      message: await service.answerPlaydate(
        request.auth.userId,
        request.params.id,
        request.params.messageId,
        request.body.status,
      ),
    }),
  );
};

export default conversationsRoutes;
