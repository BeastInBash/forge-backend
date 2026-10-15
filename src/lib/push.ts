import { Expo, type ExpoPushMessage, type ExpoPushReceipt } from 'expo-server-sdk';
import { env } from './env';

/**
 * The one place the backend sends push notifications, through Expo's push service (which relays
 * to APNs and FCM). It knows nothing about the database: callers pass tokens and get back the
 * ticket ids to check later and the tokens Expo says are dead.
 */

let client: Expo | undefined;
const expo = () => (client ??= new Expo({ accessToken: env.EXPO_ACCESS_TOKEN }));

/** One notification to one device. */
export type PushMessage = ExpoPushMessage & { to: string };

export interface SendResult {
    /** Accepted by Expo; check each receipt after ~15 minutes */
    tickets: { id: string; token: string }[];
    /** Uninstalled apps or revoked permissions: stop sending to these */
    deadTokens: string[];
}

/** The device was unregistered (app uninstalled, notifications revoked). */
const isDeadDevice = (result: ExpoPushReceipt) =>
    result.status === 'error' && result.details?.error === 'DeviceNotRegistered';

export const isPushToken = (token: unknown): token is string => Expo.isExpoPushToken(token);

/**
 * Sends in chunks of 100 (Expo's limit). A chunk that fails as a whole is logged and skipped,
 * so one bad request doesn't stop the others.
 */
export async function sendPush(messages: PushMessage[]): Promise<SendResult> {
    const result: SendResult = { tickets: [], deadTokens: [] };
    const valid = messages.filter((message) => {
        if (isPushToken(message.to)) return true;
        result.deadTokens.push(message.to);
        return false;
    });

    // The SDK limits itself to a few requests in flight, so the chunks can go out together
    await Promise.all(
        expo()
            .chunkPushNotifications(valid)
            .map(async (chunk) => {
                try {
                    const tickets = await expo().sendPushNotificationsAsync(chunk);
                    // The nth ticket is for the nth message
                    tickets.forEach((ticket, index) => {
                        const token = chunk[index]!.to as string;
                        if (ticket.status === 'ok') result.tickets.push({ id: ticket.id, token });
                        else if (isDeadDevice(ticket)) result.deadTokens.push(token);
                        else console.error(`Push to ${token} failed: ${ticket.message}`);
                    });
                } catch (error) {
                    console.error('Expo push request failed', error);
                }
            })
    );
    return result;
}

/** Looks up receipts and returns the tokens whose devices are gone. */
export async function deadTokensFromReceipts(tickets: { id: string; token: string }[]) {
    const tokenById = new Map(tickets.map((ticket) => [ticket.id, ticket.token]));
    const dead: string[] = [];

    await Promise.all(
        expo()
            .chunkPushNotificationReceiptIds([...tokenById.keys()])
            .map(async (ids) => {
                try {
                    const receipts = await expo().getPushNotificationReceiptsAsync(ids);
                    for (const [id, receipt] of Object.entries(receipts)) {
                        if (isDeadDevice(receipt)) dead.push(tokenById.get(id)!);
                        else if (receipt.status === 'error') {
                            console.error(`Push receipt ${id} failed: ${receipt.message}`);
                        }
                    }
                } catch (error) {
                    console.error('Expo receipt request failed', error);
                }
            })
    );
    return dead;
}
