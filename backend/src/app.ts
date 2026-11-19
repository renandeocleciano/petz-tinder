import { randomUUID } from 'node:crypto';

import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';

import { API_PREFIX } from './config/constants.js';
import type { Env } from './config/env.js';
import { loggerOptions } from './config/logger.js';
import { createDatabase, type DatabaseConnection } from './database/index.js';
import {
  createBlocksRepository,
  type BlocksRepository,
} from './modules/blocks/blocks.repository.js';
import blocksRoutes from './modules/blocks/blocks.routes.js';
import { createBlocksService } from './modules/blocks/blocks.service.js';
import {
  createConversationsRepository,
  type ConversationsRepository,
} from './modules/conversations/conversations.repository.js';
import conversationsRoutes from './modules/conversations/conversations.routes.js';
import { createConversationsService } from './modules/conversations/conversations.service.js';
import playdatesRoutes from './modules/conversations/playdates.routes.js';
import {
  createDiscoveryRepository,
  type DiscoveryRepository,
} from './modules/discovery/discovery.repository.js';
import discoveryRoutes from './modules/discovery/discovery.routes.js';
import { createDiscoveryService } from './modules/discovery/discovery.service.js';
import { devRoutes, entitlementsRoutes } from './modules/entitlements/entitlements.routes.js';
import { createEntitlementsService } from './modules/entitlements/entitlements.service.js';
import {
  createSubscriptionsRepository,
  type SubscriptionsRepository,
} from './modules/entitlements/subscriptions.repository.js';
import healthRoutes from './modules/health/health.routes.js';
import { createLikesRepository, type LikesRepository } from './modules/likes/likes.repository.js';
import likesRoutes from './modules/likes/likes.routes.js';
import { createLikesService } from './modules/likes/likes.service.js';
import {
  createMatchesRepository,
  type MatchesRepository,
} from './modules/matches/matches.repository.js';
import matchesRoutes from './modules/matches/matches.routes.js';
import { createMatchesService } from './modules/matches/matches.service.js';
import mediaRoutes from './modules/media/media.routes.js';
import {
  createNotificationsRepository,
  type NotificationsRepository,
} from './modules/notifications/notifications.repository.js';
import {
  createNotificationsService,
  type NotificationsService,
} from './modules/notifications/notifications.service.js';
import { createExpoPushSender, type PushSender } from './modules/notifications/push.sender.js';
import {
  createOutboxRepository,
  type OutboxRepository,
} from './modules/outbox/outbox.repository.js';
import { createOutboxWorker, type OutboxWorker } from './modules/outbox/outbox.worker.js';
import { createMediaService } from './modules/media/media.service.js';
import { createSupabaseStorage } from './modules/media/media.storage.js';
import type { StorageService } from './modules/media/media.types.js';
import { createPetsRepository, type PetsRepository } from './modules/pets/pets.repository.js';
import petsRoutes from './modules/pets/pets.routes.js';
import { createPetsService } from './modules/pets/pets.service.js';
import {
  createReportsRepository,
  type ReportsRepository,
} from './modules/reports/reports.repository.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import { createReportsService } from './modules/reports/reports.service.js';
import { createClerkIdentityProvider } from './modules/users/users.identity.js';
import { createUsersRepository, type UsersRepository } from './modules/users/users.repository.js';
import usersRoutes from './modules/users/users.routes.js';
import { createUsersService } from './modules/users/users.service.js';
import type { IdentityProvider } from './modules/users/users.types.js';
import clerkWebhookRoutes from './modules/webhooks/clerk.webhook.js';
import authPlugin, { type TokenVerifier } from './plugins/auth.js';
import { createClerkTokenVerifier } from './plugins/clerk-token.js';
import configPlugin from './plugins/config.js';
import corsPlugin from './plugins/cors.js';
import databasePlugin from './plugins/database.js';
import errorHandlerPlugin from './plugins/error-handler.js';
import rateLimitPlugin from './plugins/rate-limit.js';
import { createSupabaseAdmin } from './plugins/supabase.js';
import swaggerPlugin from './plugins/swagger.js';

declare module 'fastify' {
  interface FastifyInstance {
    /** Background jobs; exposed for scripts and tests (`runOnce`, `checkReceipts`). */
    workers: { outbox: OutboxWorker; notifications: NotificationsService };
  }
}

export interface BuildAppOptions {
  env: Env;
  /** Starts the outbox worker and push receipt checks. Only the real server sets it. */
  startWorkers?: boolean;
  /** Overrides for tests. Production wiring uses Clerk and Postgres. */
  database?: DatabaseConnection;
  verifyToken?: TokenVerifier;
  identity?: IdentityProvider;
  usersRepository?: UsersRepository;
  petsRepository?: PetsRepository;
  discoveryRepository?: DiscoveryRepository;
  likesRepository?: LikesRepository;
  matchesRepository?: MatchesRepository;
  conversationsRepository?: ConversationsRepository;
  outboxRepository?: OutboxRepository;
  notificationsRepository?: NotificationsRepository;
  pushSender?: PushSender;
  blocksRepository?: BlocksRepository;
  reportsRepository?: ReportsRepository;
  subscriptionsRepository?: SubscriptionsRepository;
  storage?: StorageService;
}

/** Expo receipts become available ~15 min after sending. */
const RECEIPT_CHECK_INTERVAL_MS = 15 * 60 * 1000;

export async function buildApp({ env, startWorkers = false, ...overrides }: BuildAppOptions) {
  const app = Fastify({
    logger: loggerOptions(env),
    requestIdHeader: 'x-request-id',
    genReqId: () => randomUUID(),
    trustProxy: true,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  const database = overrides.database ?? createDatabase(env.DATABASE_URL);
  const onCleanupError = (error: unknown) => app.log.warn({ err: error }, 'Storage cleanup failed');
  const mediaService = createMediaService(
    overrides.storage ?? createSupabaseStorage(createSupabaseAdmin(env)),
  );
  const usersRepository = overrides.usersRepository ?? createUsersRepository(database.db);
  const usersService = createUsersService({
    repository: usersRepository,
    identity: overrides.identity ?? createClerkIdentityProvider(env.CLERK_SECRET_KEY),
    media: mediaService,
    onCleanupError,
  });
  const likesRepository = overrides.likesRepository ?? createLikesRepository(database.db);
  const conversationsRepository =
    overrides.conversationsRepository ?? createConversationsRepository(database.db);
  const subscriptionsRepository =
    overrides.subscriptionsRepository ?? createSubscriptionsRepository(database.db);
  const entitlements = createEntitlementsService({
    subscriptions: subscriptionsRepository,
    countSuperLikesSince: (userId, since) => likesRepository.countSuperLikesSince(userId, since),
  });
  const petsRepository = overrides.petsRepository ?? createPetsRepository(database.db);
  const petsService = createPetsService({
    repository: petsRepository,
    media: mediaService,
    maxPets: (userId) => entitlements.maxPets(userId),
    onCleanupError,
  });
  const discoveryService = createDiscoveryService({
    repository: overrides.discoveryRepository ?? createDiscoveryRepository(database.db),
    petsRepository,
    media: mediaService,
  });
  const matchesService = createMatchesService({
    repository: overrides.matchesRepository ?? createMatchesRepository(database.db),
    petsRepository,
    media: mediaService,
  });
  const conversationsService = createConversationsService({
    repository: conversationsRepository,
    petsRepository,
    media: mediaService,
  });
  const blocksService = createBlocksService({
    repository: overrides.blocksRepository ?? createBlocksRepository(database.db),
    users: usersRepository,
  });
  const reportsService = createReportsService({
    repository: overrides.reportsRepository ?? createReportsRepository(database.db),
    users: usersRepository,
    petsRepository,
  });
  const likesService = createLikesService({
    repository: likesRepository,
    petsRepository,
    matches: matchesService,
    entitlements,
  });

  await app.register(configPlugin, { env });
  await app.register(errorHandlerPlugin);
  await app.register(corsPlugin);
  await app.register(databasePlugin, { connection: database });
  await app.register(authPlugin, {
    verifyToken: overrides.verifyToken ?? createClerkTokenVerifier(env),
    resolveUser: (clerkUserId) => usersService.ensureUser(clerkUserId),
  });
  await app.register(rateLimitPlugin);
  await app.register(swaggerPlugin);

  // Public routes.
  await app.register(healthRoutes);
  await app.register(clerkWebhookRoutes, {
    prefix: '/webhooks',
    usersService,
    signingSecret: env.CLERK_WEBHOOK_SIGNING_SECRET,
  });

  // Everything under /v1 is authenticated by default.
  await app.register(
    async (v1) => {
      v1.addHook('onRequest', v1.authenticate);
      await v1.register(usersRoutes, {
        prefix: '/users',
        usersService,
        petsService,
        entitlements,
      });
      await v1.register(entitlementsRoutes, { prefix: '/entitlements', entitlements });
      if (env.NODE_ENV !== 'production') {
        await v1.register(devRoutes, {
          prefix: '/dev',
          entitlements,
          subscriptions: subscriptionsRepository,
        });
      }
      await v1.register(petsRoutes, { prefix: '/pets', petsService });
      await v1.register(discoveryRoutes, { prefix: '/discovery', discoveryService });
      await v1.register(likesRoutes, { prefix: '/likes', likesService });
      await v1.register(matchesRoutes, { prefix: '/matches', matchesService });
      await v1.register(conversationsRoutes, { prefix: '/conversations', conversationsService });
      await v1.register(playdatesRoutes, { prefix: '/playdates', conversationsService });
      await v1.register(blocksRoutes, { prefix: '/blocks', blocksService });
      await v1.register(reportsRoutes, { prefix: '/reports', reportsService });
      await v1.register(mediaRoutes, { prefix: '/media', mediaService });
    },
    { prefix: API_PREFIX },
  );

  const notifications = createNotificationsService({
    repository: overrides.notificationsRepository ?? createNotificationsRepository(database.db),
    sender: overrides.pushSender ?? createExpoPushSender(env.EXPO_ACCESS_TOKEN),
    petNames: async (ids) =>
      new Map((await petsRepository.findByIds(ids)).map((pet) => [pet.id, pet.name])),
    areBlocked: (userA, userB) => likesRepository.areBlocked(userA, userB),
    findMessage: async (id) => (await conversationsRepository.findMessagesByIds([id]))[0],
    logger: app.log.child({ module: 'notifications' }),
  });
  const outboxWorker = createOutboxWorker({
    repository: overrides.outboxRepository ?? createOutboxRepository(database.db),
    handlers: notifications.handlers,
    logger: app.log.child({ module: 'outbox' }),
  });
  app.decorate('workers', { outbox: outboxWorker, notifications });

  if (startWorkers) {
    let receiptsTimer: NodeJS.Timeout | undefined;
    app.addHook('onReady', async () => {
      outboxWorker.start();
      receiptsTimer = setInterval(() => {
        notifications
          .checkReceipts()
          .catch((error: unknown) => app.log.error({ err: error }, 'Push receipt check failed'));
      }, RECEIPT_CHECK_INTERVAL_MS);
    });
    // preClose runs before any onClose hook, so the pool is still open while we drain.
    app.addHook('preClose', async () => {
      clearInterval(receiptsTimer);
      await outboxWorker.stop();
    });
  }

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
