import type { Request, Response } from 'express';
import {
    registerPushTokenService,
    removePushTokenService,
    sendTestPushService
} from '../services/push.services';
import ApiResponses from '../../common/libs/ApiResponses';
import type {
    RegisterPushTokenBody,
    RemovePushTokenBody
} from '../../common/zodSchema/notificationSchema';

export const registerPushToken = async (req: Request, res: Response) => {
    // req.body was validated by validateBody(registerPushTokenBodySchema)
    await registerPushTokenService(
        req.body as RegisterPushTokenBody,
        res.locals.session.session.userId
    );
    return ApiResponses.ok(res, 'Device registered', null);
};

export const removePushToken = async (req: Request, res: Response) => {
    const { token } = req.body as RemovePushTokenBody;
    await removePushTokenService(token, res.locals.session.session.userId);
    return ApiResponses.ok(res, 'Device removed', null);
};

export const sendTestPush = async (_req: Request, res: Response) => {
    const data = await sendTestPushService(res.locals.session.session.userId);
    return ApiResponses.ok(res, 'Test notification sent', data);
};
