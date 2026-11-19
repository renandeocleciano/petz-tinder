import type { Message } from '@/types/domain';

export const messagePreview = (message: Message): string => {
  if (message.type === 'image') return '📷 Foto';
  if (message.type === 'playdate_invite') {
    return `📅 Convite: ${message.playdate?.placeName ?? 'passeio'}`;
  }
  return message.text;
};
