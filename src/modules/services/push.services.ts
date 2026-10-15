import prisma from '../../lib/db';
import ApiError from '../../common/libs/ApiError';
import { deadTokensFromReceipts, sendPush, type PushMessage } from '../../lib/push';
import type { RegisterPushTokenBody } from '../../common/zodSchema/notificationSchema';

/** Expo keeps receipts for about a day and has them ready after about 15 minutes. */
const RECEIPT_READY_MS = 15 * 60_000;
const RECEIPT_EXPIRY_MS = 24 * 60 * 60_000;

/** Saves this device for the user; a device that was signed in to another account moves over. */
export const registerPushTokenService = async (body: RegisterPushTokenBody, userId: string) => {
    await prisma.push_Token.upsert({
        where: { token: body.token },
        create: { ...body, user: { connect: { id: userId } } },
        update: { platform: body.platform, user: { connect: { id: userId } } }
    });
};

/** Forgets the device, e.g. on sign-out. Removing an unknown token is not an error. */
export const removePushTokenService = async (token: string, userId: string) => {
    await prisma.push_Token.deleteMany({ where: { token, userId } });
};

/**
 * Sends the messages, keeps the tickets for a later receipt check and drops tokens Expo already
 * reports as dead.
 */
export const deliverPush = async (messages: PushMessage[]) => {
    if (messages.length === 0) return { sent: 0 };
    const { tickets, deadTokens } = await sendPush(messages);
    await Promise.all([
        tickets.length > 0 && prisma.push_Ticket.createMany({ data: tickets }),
        deadTokens.length > 0 &&
            prisma.push_Token.deleteMany({ where: { token: { in: deadTokens } } })
    ]);
    return { sent: tickets.length };
};

/** Sends a test notification to every device of the user. */
export const sendTestPushService = async (userId: string) => {
    const tokens = await prisma.push_Token.findMany({ where: { userId }, select: { token: true } });
    if (tokens.length === 0) throw ApiError.notFound('No device registered for notifications');
    return deliverPush(
        tokens.map(({ token }) => ({
            to: token,
            title: 'Forge',
            body: 'Notifications are working 💪',
            data: { type: 'test' }
        }))
    );
};

/**
 * Checks receipts of tickets old enough to have one, deletes tokens of devices that are gone,
 * then forgets those tickets (and any older than Expo keeps receipts for).
 */
export const checkPushReceiptsService = async (now = new Date()) => {
    const tickets = await prisma.push_Ticket.findMany({
        where: { createdAt: { lte: new Date(now.getTime() - RECEIPT_READY_MS) } },
        select: { id: true, token: true },
        take: 1000
    });
    const deadTokens = tickets.length > 0 ? await deadTokensFromReceipts(tickets) : [];
    await Promise.all([
        deadTokens.length > 0 &&
            prisma.push_Token.deleteMany({ where: { token: { in: deadTokens } } }),
        prisma.push_Ticket.deleteMany({
            where: {
                OR: [
                    { id: { in: tickets.map((ticket) => ticket.id) } },
                    { createdAt: { lt: new Date(now.getTime() - RECEIPT_EXPIRY_MS) } }
                ]
            }
        })
    ]);
    return { checked: tickets.length, removedTokens: deadTokens.length };
};
