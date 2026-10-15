import { z } from 'zod';
import { isPushToken } from '../../lib/push';

const pushTokenSchema = z
    .string()
    .refine(isPushToken, 'Not an Expo push token')
    .meta({ description: 'From getExpoPushTokenAsync(), e.g. "ExponentPushToken[xxxx]"' });

/** The JSON body for `POST /api/v1/notifications/push-token`. */
export const registerPushTokenBodySchema = z
    .strictObject({ token: pushTokenSchema, platform: z.enum(['ios', 'android']) })
    .meta({
        id: 'RegisterPushTokenBody',
        example: { token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]', platform: 'android' }
    });

export type RegisterPushTokenBody = z.infer<typeof registerPushTokenBodySchema>;

/** The JSON body for `DELETE /api/v1/notifications/push-token`. */
export const removePushTokenBodySchema = z
    .strictObject({ token: z.string().min(1) })
    .meta({ id: 'RemovePushTokenBody' });

export type RemovePushTokenBody = z.infer<typeof removePushTokenBodySchema>;
