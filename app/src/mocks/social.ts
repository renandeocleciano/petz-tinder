import type { Conversation, Like, Match, Message } from '@/types/domain';

import { MY_PET_ID } from './pets';
import { daysAgo, hoursAgo, minutesAgo, nextWeekdayAt } from './time';
import { CURRENT_USER_ID } from './users';

export { placeSuggestions } from '@/constants/places';

const match = (otherPetId: string, createdAt: string): Match => ({
  id: `match-${otherPetId.replace('pet-', '')}`,
  petAId: MY_PET_ID,
  petBId: otherPetId,
  createdAt,
  lastMessage: null,
  unreadCount: 0,
});

/** 8 matches for the current user's pet. lastMessage/unreadCount are derived by the mock API. */
export const seedMatches: Match[] = [
  match('pet-luna', daysAgo(3)),
  match('pet-maya', daysAgo(2)),
  match('pet-zeca', daysAgo(4)),
  match('pet-mel', daysAgo(5)),
  match('pet-toby', minutesAgo(25)),
  match('pet-nina', hoursAgo(2)),
  match('pet-max', hoursAgo(6)),
  match('pet-bento', hoursAgo(20)),
];

/** Pets that already liked the current pet — liking them back creates a match. */
export const seedIncomingLikes: Like[] = ['pet-pipoca', 'pet-fred', 'pet-amora'].map(
  (fromPetId, index) => ({
    id: `like-in-${index}`,
    fromPetId,
    toPetId: MY_PET_ID,
    type: index === 1 ? 'super_like' : 'like',
    createdAt: hoursAgo(index + 1),
  }),
);

const msg = (
  conversationId: string,
  index: number,
  senderUserId: string,
  text: string,
  createdAt: string,
  read = true,
): Message => ({
  id: `${conversationId}-m${index}`,
  conversationId,
  senderUserId,
  text,
  type: 'text',
  createdAt,
  readAt: read ? createdAt : null,
});

const conversation = (
  otherPetId: string,
  otherUserId: string,
  messages: (conversationId: string) => Message[],
): Conversation => {
  const id = `conv-${otherPetId.replace('pet-', '')}`;
  return {
    id,
    matchId: `match-${otherPetId.replace('pet-', '')}`,
    participants: [
      { userId: CURRENT_USER_ID, petId: MY_PET_ID },
      { userId: otherUserId, petId: otherPetId },
    ],
    messages: messages(id),
  };
};

/** 4 conversations with history. Matches without one get an empty conversation at runtime. */
export const seedConversations: Conversation[] = [
  conversation('pet-luna', 'user-luna', (id) => [
    msg(
      id,
      1,
      'user-luna',
      'Oi! 🐾 Que bom dar match com vocês! A Luna é super sociável e adora conhecer novos amigos.',
      minutesAgo(75),
    ),
    msg(
      id,
      2,
      CURRENT_USER_ID,
      'Oi! Que legal! O Thor também é muito brincalhão! 🐶💛 Vamos marcar um passeio qualquer dia?',
      minutesAgo(73),
    ),
    msg(
      id,
      3,
      'user-luna',
      'Vamos sim! Ela adora o Parque Lage e sempre se diverte por lá. Que tal neste sábado?',
      minutesAgo(71),
    ),
    msg(id, 4, CURRENT_USER_ID, 'Perfeito! Acho uma ótima ideia! ✨', minutesAgo(70)),
    {
      id: `${id}-m5`,
      conversationId: id,
      senderUserId: 'user-luna',
      text: 'Vamos fazer um passeio juntos?',
      type: 'playdate_invite',
      playdate: {
        id: 'playdate-1',
        placeName: 'Parque Lage',
        placeImageUrl: null,
        latitude: -22.9597,
        longitude: -43.2116,
        scheduledAt: nextWeekdayAt(6, 10),
        status: 'pending',
      },
      createdAt: minutesAgo(5),
      readAt: null,
    },
  ]),
  conversation('pet-maya', 'user-maya', (id) => [
    msg(id, 1, 'user-maya', 'Oi! A Maya amou as fotos do Thor 😍', hoursAgo(3.2)),
    msg(id, 2, 'user-maya', 'Que fofo! Vamos marcar um passeio? 🥰', hoursAgo(3), false),
  ]),
  conversation('pet-zeca', 'user-zeca', (id) => [
    msg(id, 1, CURRENT_USER_ID, 'Oi! O Zeca é muito estiloso 😄', hoursAgo(6.5)),
    msg(id, 2, 'user-zeca', 'Adorei o perfil! Meu humano também é do Rio! 😎', hoursAgo(6)),
  ]),
  conversation('pet-mel', 'user-mel', (id) => [
    msg(id, 1, CURRENT_USER_ID, 'Conhece o Parque da Catacumba? É lindo!', hoursAgo(12.4)),
    msg(id, 2, 'user-mel', 'Que parque incrível! Vamos levar nossos aumigos? 🐾', hoursAgo(12)),
  ]),
];
