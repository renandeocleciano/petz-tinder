import { myPet, otherPets } from '@/mocks/pets';
import { seedConversations, seedIncomingLikes, seedMatches } from '@/mocks/social';
import { currentUser, otherUsers } from '@/mocks/users';
import type { Block, Conversation, Like, Match, Pet, Report, User } from '@/types/domain';

import type { Coordinates } from '../types';

export interface MockDb {
  currentUserId: string;
  users: Map<string, User>;
  pets: Map<string, Pet>;
  likes: Like[];
  matches: Match[];
  conversations: Map<string, Conversation>;
  reports: Report[];
  blocks: Block[];
  boosts: Map<string, string>;
  viewerLocation: Coordinates;
  sequence: number;
}

export interface MockDbOptions {
  /** Start without pets to exercise onboarding. */
  newUser?: boolean;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const createMockDb = ({ newUser = false }: MockDbOptions = {}): MockDb => {
  const pets = [...(newUser ? [] : [myPet]), ...otherPets];
  return {
    currentUserId: currentUser.id,
    users: new Map([currentUser, ...otherUsers].map((user) => [user.id, clone(user)])),
    pets: new Map(pets.map((pet) => [pet.id, clone(pet)])),
    likes: newUser ? [] : clone(seedIncomingLikes),
    matches: newUser ? [] : clone(seedMatches),
    conversations: new Map(
      (newUser ? [] : seedConversations).map((conversation) => [
        conversation.id,
        clone(conversation),
      ]),
    ),
    reports: [],
    blocks: [],
    boosts: new Map(),
    viewerLocation: { latitude: -22.9711, longitude: -43.1951 },
    sequence: 1,
  };
};

export const nextId = (db: MockDb, prefix: string) => {
  db.sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${db.sequence}`;
};
