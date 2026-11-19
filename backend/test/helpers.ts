import { buildApp, type BuildAppOptions } from '../src/app.js';
import { parseEnv, type Env } from '../src/config/env.js';
import type { DatabaseConnection } from '../src/database/index.js';
import {
  createFakeDiscoveryRepository,
  createFakeNotificationsRepository,
  createFakeOutboxRepository,
  createFakePetsRepository,
  createFakePushSender,
  createFakeSocialStore,
  createFakeStorage,
  createFakeSubscriptionsRepository,
  createFakeUsersRepository,
} from './fakes.js';

export const TEST_WEBHOOK_SECRET = `whsec_${Buffer.from('petz-test-secret').toString('base64')}`;

export const testEnv = (overrides: Partial<Record<keyof Env, string>> = {}): Env =>
  parseEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://user:pass@127.0.0.1:1/petz_test',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_test',
    CLERK_SECRET_KEY: 'sk_test_x',
    CLERK_PUBLISHABLE_KEY: 'pk_test_x',
    CLERK_WEBHOOK_SIGNING_SECRET: TEST_WEBHOOK_SECRET,
    ...overrides,
  });

/** A connection that never touches a database; unit tests mock the repository layer instead. */
export const offlineDatabase = (): DatabaseConnection => ({
  db: {} as DatabaseConnection['db'],
  close: async () => undefined,
});

/** Shared state for the likes/matches/conversations/blocks/reports fakes. */
const socialRepositories = (social: ReturnType<typeof createFakeSocialStore>) => ({
  likesRepository: social.likesRepository,
  matchesRepository: social.matchesRepository,
  conversationsRepository: social.conversationsRepository,
  blocksRepository: social.blocksRepository,
  reportsRepository: social.reportsRepository,
});

export const buildTestApp = (overrides: Partial<BuildAppOptions> = {}) =>
  buildApp({
    env: testEnv(),
    database: offlineDatabase(),
    // `valid-token` → user_clerk_1; `user_<anything>` authenticates as that Clerk id.
    verifyToken: async (token) => {
      if (token === 'valid-token') return 'user_clerk_1';
      if (token.startsWith('user_')) return token;
      throw new Error('invalid');
    },
    identity: { deleteUser: async () => undefined },
    usersRepository: createFakeUsersRepository().repository,
    petsRepository: createFakePetsRepository().repository,
    discoveryRepository: createFakeDiscoveryRepository(new Map()).repository,
    ...socialRepositories(createFakeSocialStore(new Map())),
    subscriptionsRepository: createFakeSubscriptionsRepository().repository,
    outboxRepository: createFakeOutboxRepository([]).repository,
    notificationsRepository: createFakeNotificationsRepository(new Map()).repository,
    pushSender: createFakePushSender().sender,
    storage: createFakeStorage().storage,
    ...overrides,
  });

/** Builds an app with fresh fakes and returns them for assertions. */
export const buildFakeApp = async (overrides: Partial<BuildAppOptions> = {}) => {
  const users = createFakeUsersRepository();
  const pets = createFakePetsRepository();
  const storage = createFakeStorage();
  const social = createFakeSocialStore(pets.pets, users.users);
  const subscriptions = createFakeSubscriptionsRepository();
  const outbox = createFakeOutboxRepository(social.outbox);
  const notifications = createFakeNotificationsRepository(users.pushTokens);
  const push = createFakePushSender();
  const app = await buildTestApp({
    outboxRepository: outbox.repository,
    notificationsRepository: notifications.repository,
    pushSender: push.sender,
    ...socialRepositories(social),
    subscriptionsRepository: subscriptions.repository,
    usersRepository: users.repository,
    petsRepository: pets.repository,
    discoveryRepository: createFakeDiscoveryRepository(pets.pets).repository,
    storage: storage.storage,
    ...overrides,
  });
  return { app, users, pets, storage, social, subscriptions, outbox, notifications, push };
};

export const AUTH = { authorization: 'Bearer valid-token' };
export const authAs = (clerkUserId: string) => ({ authorization: `Bearer ${clerkUserId}` });
