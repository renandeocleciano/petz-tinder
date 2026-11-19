import { createClient } from '@supabase/supabase-js';

import type { Env } from '../config/env.js';

/**
 * Service-role client: Storage and admin operations only. Business queries go through
 * Drizzle. The key never leaves the server.
 */
export const createSupabaseAdmin = (env: Env) =>
  createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
