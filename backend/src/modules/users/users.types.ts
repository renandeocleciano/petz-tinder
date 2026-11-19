import type { UserRow } from '../../database/schema/index.js';

export type User = UserRow;

export interface ClerkProfile {
  clerkUserId: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
}

export interface UpdateMeInput {
  name?: string;
  avatarPath?: string | null;
  pushToken?: string;
}

/** Identity provider operations the domain needs. Implemented by Clerk. */
export interface IdentityProvider {
  deleteUser(clerkUserId: string): Promise<void>;
}
