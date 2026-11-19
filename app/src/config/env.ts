/**
 * Public runtime configuration. Only EXPO_PUBLIC_* values are inlined in the bundle,
 * so nothing secret may ever be read here.
 */
export const env = {
  clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '',
  mapboxAccessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '',
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
  mockNewUser: process.env.EXPO_PUBLIC_MOCK_NEW_USER === 'true',
  /** Public values (project URL + publishable key). Access is enforced by RLS. */
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
} as const;

export const isClerkEnabled = env.clerkPublishableKey.length > 0;
export const isMockApi = env.apiUrl.length === 0;
/** Live chat needs the real backend and the Supabase project; otherwise the app polls. */
export const isRealtimeEnabled =
  !isMockApi && env.supabaseUrl.length > 0 && env.supabasePublishableKey.length > 0;
