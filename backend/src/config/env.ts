import { z } from 'zod';

const csv = z
  .string()
  .optional()
  .transform((value) =>
    (value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

/** Accepts only server keys: `sb_secret_…` or a legacy JWT whose role is service_role. */
const isServiceRoleKey = (key: string) => {
  if (key.startsWith('sb_secret_')) return true;
  const [, payload] = key.split('.');
  if (!payload) return false;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString()).role === 'service_role';
  } catch {
    return false;
  }
};

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DATABASE_URL: z.url(),

  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().refine(isServiceRoleKey),

  CLERK_SECRET_KEY: z.string().startsWith('sk_'),
  CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  /** Optional locally: without it the Clerk webhook route answers 503. */
  CLERK_WEBHOOK_SIGNING_SECRET: optional(z.string().startsWith('whsec_')),
  CLERK_AUTHORIZED_PARTIES: csv,

  CORS_ORIGINS: csv,
  /** Optional: required only if "Enhanced push security" is enabled in the Expo project. */
  EXPO_ACCESS_TOKEN: optional(z.string()),
  SENTRY_DSN: optional(z.string()),
});

export type Env = z.infer<typeof envSchema>;

/** Parses the environment, failing fast with the names (never the values) of invalid variables. */
export const parseEnv = (source: NodeJS.ProcessEnv): Env => {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Invalid environment variables: ${fields}`);
  }
  return result.data;
};

export const loadEnv = (): Env => {
  if (process.env.NODE_ENV !== 'production') {
    try {
      process.loadEnvFile();
    } catch {
      // No .env file: rely on the process environment.
    }
  }
  return parseEnv(process.env);
};
