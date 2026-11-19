import type { User } from '@/types/domain';

import { daysAgo } from './time';

export const CURRENT_USER_ID = 'user-me';

export const currentUser: User = {
  id: CURRENT_USER_ID,
  name: 'Camila Souza',
  email: 'camila@petz.dev',
  avatarUrl: null,
  subscriptionTier: 'free',
  createdAt: daysAgo(40),
};

const owner = (id: string, name: string): User => ({
  id,
  name,
  email: `${id}@petz.dev`,
  avatarUrl: null,
  subscriptionTier: 'free',
  createdAt: daysAgo(30),
});

export const otherUsers: User[] = [
  owner('user-luna', 'Marina'),
  owner('user-maya', 'Pedro'),
  owner('user-zeca', 'Rafael'),
  owner('user-mel', 'Juliana'),
  owner('user-toby', 'Bruno'),
  owner('user-nina', 'Larissa'),
  owner('user-max', 'Felipe'),
  owner('user-bento', 'Carla'),
  owner('user-pipoca', 'Ana'),
  owner('user-fred', 'Gustavo'),
  owner('user-amora', 'Beatriz'),
  owner('user-pacoca', 'Thiago'),
  owner('user-frida', 'Isabela'),
  owner('user-bolt', 'Lucas'),
  owner('user-mia', 'Fernanda'),
  owner('user-kiara', 'Diego'),
  owner('user-luke', 'Patrícia'),
  owner('user-belinha', 'Rodrigo'),
];
