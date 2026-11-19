import { Expo, type ExpoPushReceipt, type ExpoPushTicket } from 'expo-server-sdk';

export interface PushMessage {
  /** One token per message, so tickets map back to tokens. */
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

export type PushTicket = ExpoPushTicket;
export type PushReceipt = ExpoPushReceipt;

/** Push delivery the domain needs. Implemented by the Expo Push Service. */
export interface PushSender {
  isValidToken(token: string): boolean;
  /** Tickets in the same order as `messages`. */
  send(messages: PushMessage[]): Promise<PushTicket[]>;
  receipts(ticketIds: string[]): Promise<Record<string, PushReceipt>>;
}

export const createExpoPushSender = (accessToken?: string): PushSender => {
  const expo = new Expo(accessToken ? { accessToken } : {});
  return {
    isValidToken: (token) => Expo.isExpoPushToken(token),

    async send(messages) {
      const tickets: PushTicket[] = [];
      const chunks = expo.chunkPushNotifications(
        messages.map((message) => ({ ...message, sound: 'default', priority: 'high' as const })),
      );
      for (const chunk of chunks) tickets.push(...(await expo.sendPushNotificationsAsync(chunk)));
      return tickets;
    },

    async receipts(ticketIds) {
      const result: Record<string, PushReceipt> = {};
      for (const chunk of expo.chunkPushNotificationReceiptIds(ticketIds)) {
        Object.assign(result, await expo.getPushNotificationReceiptsAsync(chunk));
      }
      return result;
    },
  };
};
