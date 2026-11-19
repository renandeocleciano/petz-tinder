import type { FastifyPluginAsync } from 'fastify';
import { Webhook, WebhookVerificationError } from 'svix';
import { z } from 'zod';

import { DomainError, UnauthorizedError, ValidationError } from '../../shared/errors/index.js';
import type { ClerkProfile } from '../users/users.types.js';
import type { UsersService } from '../users/users.service.js';

const clerkUserSchema = z.object({
  id: z.string(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  username: z.string().nullish(),
  image_url: z.string().nullish(),
  primary_email_address_id: z.string().nullish(),
  email_addresses: z.array(z.object({ id: z.string(), email_address: z.string() })).default([]),
});

const eventSchema = z.object({ type: z.string(), data: z.unknown() });
const deletedUserSchema = z.object({ id: z.string().optional() });

const toProfile = (user: z.infer<typeof clerkUserSchema>): ClerkProfile => {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  const email =
    user.email_addresses.find((address) => address.id === user.primary_email_address_id) ??
    user.email_addresses[0];
  return {
    clerkUserId: user.id,
    name: fullName || user.username || null,
    email: email?.email_address ?? null,
    avatarUrl: user.image_url || null,
  };
};

const parseOrReject = <T extends z.ZodType>(schema: T, value: unknown): z.output<T> => {
  const result = schema.safeParse(value);
  if (!result.success) throw new ValidationError('Evento inválido');
  return result.data;
};

export interface ClerkWebhookOptions {
  usersService: UsersService;
  signingSecret: string | undefined;
}

/**
 * Public route, authenticated by the Svix signature. Needs the raw body, so this scope
 * parses JSON as a string. Handlers are idempotent (Svix retries).
 */
export const clerkWebhookRoutes: FastifyPluginAsync<ClerkWebhookOptions> = async (
  app,
  { usersService, signingSecret },
) => {
  if (!signingSecret) {
    app.log.warn('CLERK_WEBHOOK_SIGNING_SECRET not set: Clerk webhooks are disabled');
    app.post('/clerk', { schema: { hide: true } }, async () => {
      throw new DomainError(503, 'WEBHOOK_DISABLED', 'Webhook não configurado');
    });
    return;
  }
  const webhook = new Webhook(signingSecret);

  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_request, body, done) =>
    done(null, body),
  );

  app.post('/clerk', { schema: { hide: true } }, async (request) => {
    const body = request.body as string;
    try {
      // svix v2 only verifies (throws on failure); parsing is ours.
      webhook.verify(body, {
        'svix-id': String(request.headers['svix-id'] ?? ''),
        'svix-timestamp': String(request.headers['svix-timestamp'] ?? ''),
        'svix-signature': String(request.headers['svix-signature'] ?? ''),
      });
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        throw new UnauthorizedError('Assinatura inválida', 'INVALID_SIGNATURE');
      }
      throw error;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      throw new ValidationError('Evento inválido');
    }
    const event = parseOrReject(eventSchema, payload);

    switch (event.type) {
      case 'user.created':
      case 'user.updated':
        await usersService.syncFromIdentity(toProfile(parseOrReject(clerkUserSchema, event.data)));
        break;
      case 'user.deleted': {
        const { id } = parseOrReject(deletedUserSchema, event.data);
        if (id) await usersService.removeByIdentity(id);
        break;
      }
      default:
        request.log.debug({ type: event.type }, 'Ignored Clerk event');
    }
    return { received: true };
  });
};

export default clerkWebhookRoutes;
