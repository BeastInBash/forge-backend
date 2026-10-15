import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware';
import { validateBody } from '../../common/middleware/validate.middleware';
import { asyncHandler } from '../../common/utils/asyncHandler';
import {
    registerPushTokenBodySchema,
    removePushTokenBodySchema
} from '../../common/zodSchema/notificationSchema';
import {
    registerPushToken,
    removePushToken,
    sendTestPush
} from '../controllers/notification.controller';

const notificationRouter = Router();

notificationRouter.post(
    '/push-token',
    requireAuth,
    validateBody(registerPushTokenBodySchema),
    asyncHandler(registerPushToken)
);

notificationRouter.delete(
    '/push-token',
    requireAuth,
    validateBody(removePushTokenBodySchema),
    asyncHandler(removePushToken)
);

notificationRouter.post('/test', requireAuth, asyncHandler(sendTestPush));
export default notificationRouter;
