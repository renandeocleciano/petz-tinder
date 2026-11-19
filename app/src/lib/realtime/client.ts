import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env, isRealtimeEnabled } from '@/config/env';
import { getAuthToken } from '@/lib/api/authToken';

let client: SupabaseClient | null = null;
let checkedClaims = false;

/** Reads the JWT payload (no verification: this is only a development diagnostic). */
const claimsOf = (token: string): Record<string, unknown> | null => {
  try {
    const payload = token.split('.')[1] ?? '';
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')));
  } catch {
    return null;
  }
};

/**
 * Supabase only treats the Clerk token as `authenticated` (the role our RLS policies allow)
 * when it carries `"role": "authenticated"`. Without it the channel connects but stays
 * silent. Warn once in development so this is visible right away.
 */
const warnIfMissingRole = (token: string | null) => {
  if (!__DEV__ || checkedClaims || !token) return;
  checkedClaims = true;
  const role = claimsOf(token)?.role;
  if (role !== 'authenticated') {
    console.warn(
      `[realtime] Clerk session token has role=${JSON.stringify(role)}; expected "authenticated". ` +
        'Add {"role": "authenticated"} to the session token in Clerk (Sessions → Customize ' +
        'session token). Until then live chat falls back to polling.',
    );
  }
};

/**
 * Supabase client used only for Realtime (reads). Auth is the Clerk session token: Supabase
 * maps it to `authenticated` and RLS limits events to the user's own conversations. The
 * token is fetched again on every heartbeat (~25 s), so Clerk's short-lived tokens are fine.
 * Writes never go through Supabase: they always use the Petz API.
 */
export const getRealtimeClient = (): SupabaseClient | null => {
  if (!isRealtimeEnabled) return null;
  client ??= createClient(env.supabaseUrl, env.supabasePublishableKey, {
    accessToken: async () => {
      const token = await getAuthToken();
      warnIfMissingRole(token);
      return token ?? null;
    },
  });
  return client;
};
