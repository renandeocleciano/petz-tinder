import { ClerkProvider, useAuth, useSSO } from '@clerk/expo';
import { useHostedAuth } from '@clerk/expo/hosted-auth';
import { tokenCache } from '@clerk/expo/token-cache';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { env } from '@/config/env';
import { setAuthTokenProvider } from '@/lib/api/authToken';

import { AuthContext, type AuthMethod, type AuthSession as Session } from './AuthContext';

WebBrowser.maybeCompleteAuthSession();

const OAUTH_STRATEGY = { apple: 'oauth_apple', google: 'oauth_google' } as const;

const useWarmUpBrowser = () => {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};

function ClerkSessionBridge({ children }: { children: ReactNode }) {
  useWarmUpBrowser();
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const { startSSOFlow } = useSSO();
  const { startHostedAuth } = useHostedAuth();
  const [pendingMethod, setPendingMethod] = useState<AuthMethod | null>(null);

  useEffect(() => {
    setAuthTokenProvider(() => getToken());
  }, [getToken]);

  const signIn = useCallback(
    async (method: AuthMethod) => {
      setPendingMethod(method);
      try {
        if (method === 'apple' || method === 'google') {
          const { createdSessionId, setActive } = await startSSOFlow({
            strategy: OAUTH_STRATEGY[method],
            redirectUrl: AuthSession.makeRedirectUri({ scheme: 'petz', path: 'sso-callback' }),
          });
          if (!createdSessionId || !setActive) return false;
          await setActive({ session: createdSessionId });
          return true;
        }
        // E-mail flows use Clerk's hosted Account Portal (sign-up / sign-in with code or password).
        const { createdSessionId } = await startHostedAuth({
          mode: method === 'email' ? 'sign-up' : 'sign-in',
        });
        return Boolean(createdSessionId);
      } finally {
        setPendingMethod(null);
      }
    },
    [startHostedAuth, startSSOFlow],
  );

  const value = useMemo<Session>(
    () => ({
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      pendingMethod,
      signIn,
      signOut: async () => {
        await signOut();
      },
    }),
    [isLoaded, isSignedIn, pendingMethod, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function ClerkAuthProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={env.clerkPublishableKey} tokenCache={tokenCache}>
      <ClerkSessionBridge>{children}</ClerkSessionBridge>
    </ClerkProvider>
  );
}
