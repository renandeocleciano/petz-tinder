import { createClerkClient } from '@clerk/backend';
import { isClerkAPIResponseError } from '@clerk/backend/errors';

import type { IdentityProvider } from './users.types.js';

export const createClerkIdentityProvider = (secretKey: string): IdentityProvider => {
  const clerk = createClerkClient({ secretKey });
  return {
    async deleteUser(clerkUserId) {
      try {
        await clerk.users.deleteUser(clerkUserId);
      } catch (error) {
        // Already gone in Clerk: proceed with the local deletion.
        if (isClerkAPIResponseError(error) && error.status === 404) return;
        throw error;
      }
    },
  };
};
