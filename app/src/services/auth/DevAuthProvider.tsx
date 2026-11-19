import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { setAuthTokenProvider } from '@/lib/api/authToken';

import { AuthContext, type AuthMethod, type AuthSession } from './AuthContext';

const SESSION_KEY = 'petz.dev-session';

/**
 * Local-only session used when no Clerk key is configured (mock development and tests).
 * Persists a fake session token in Secure Store, mirroring how a real token is cached.
 */
export function DevAuthProvider({
  children,
  initiallySignedIn,
}: {
  children: ReactNode;
  initiallySignedIn?: boolean;
}) {
  const [isLoaded, setIsLoaded] = useState(initiallySignedIn !== undefined);
  const [token, setToken] = useState<string | null>(initiallySignedIn ? 'dev-token' : null);
  const [pendingMethod, setPendingMethod] = useState<AuthMethod | null>(null);

  useEffect(() => {
    if (initiallySignedIn !== undefined) return;
    SecureStore.getItemAsync(SESSION_KEY)
      .then(setToken)
      .catch(() => setToken(null))
      .finally(() => setIsLoaded(true));
  }, [initiallySignedIn]);

  useEffect(() => {
    setAuthTokenProvider(async () => token);
  }, [token]);

  const signIn = useCallback(async (method: AuthMethod) => {
    setPendingMethod(method);
    try {
      const next = `dev-${method}-${Date.now()}`;
      // Persisting is best-effort: the session still works in memory if storage fails.
      await SecureStore.setItemAsync(SESSION_KEY, next).catch(() => undefined);
      setToken(next);
      return true;
    } finally {
      setPendingMethod(null);
    }
  }, []);

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => undefined);
    setToken(null);
  }, []);

  const value = useMemo<AuthSession>(
    () => ({ isLoaded, isSignedIn: token !== null, pendingMethod, signIn, signOut }),
    [isLoaded, token, pendingMethod, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
