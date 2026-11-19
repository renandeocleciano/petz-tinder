import type { ReactNode } from 'react';

import { isClerkEnabled } from '@/config/env';

import { ClerkAuthProvider } from './ClerkAuthProvider';
import { DevAuthProvider } from './DevAuthProvider';

export function AuthProvider({ children }: { children: ReactNode }) {
  return isClerkEnabled ? (
    <ClerkAuthProvider>{children}</ClerkAuthProvider>
  ) : (
    <DevAuthProvider>{children}</DevAuthProvider>
  );
}

export { DevAuthProvider };
export { useAuthSession, type AuthMethod, type AuthSession } from './AuthContext';
