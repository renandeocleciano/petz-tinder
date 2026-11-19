import { createContext, useContext } from 'react';

export type AuthMethod = 'apple' | 'google' | 'email' | 'existing_account';

export interface AuthSession {
  isLoaded: boolean;
  isSignedIn: boolean;
  /** Method currently in progress, used to show a spinner on the right button. */
  pendingMethod: AuthMethod | null;
  /** Resolves true when a session was created, false when the user cancelled. */
  signIn: (method: AuthMethod) => Promise<boolean>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthSession | null>(null);

/** Provider-agnostic auth hook. Screens never import the Clerk SDK directly. */
export const useAuthSession = (): AuthSession => {
  const session = useContext(AuthContext);
  if (!session) throw new Error('useAuthSession must be used inside <AuthProvider>');
  return session;
};
