import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware';
import { validateBody, validateParams } from '../../common/middleware/validate.middleware';
import { asyncHandler } from '../../common/utils/asyncHandler';
import {
    waterGoalBodySchema,
    waterLogBodySchema,
    waterLogIdParamsSchema
} from '../../common/zodSchema/waterSchema';
import {
    createWaterLog,
    deleteWaterLog,
    getWaterDay,
    getWaterGoal,
    setWaterGoal
} from '../controllers/water.controller';

const waterRouter = Router();

waterRouter.get('/goal', requireAuth, asyncHandler(getWaterGoal));

waterRouter.put(
    '/goal',
    requireAuth,
    validateBody(waterGoalBodySchema),
    asyncHandler(setWaterGoal)
);

waterRouter.get('/day', requireAuth, asyncHandler(getWaterDay));

waterRouter.post(
    '/logs',
    requireAuth,
    validateBody(waterLogBodySchema),
    asyncHandler(createWaterLog)
);

waterRouter.delete(
    '/logs/:logId',
    requireAuth,
    validateParams(waterLogIdParamsSchema),
    asyncHandler(deleteWaterLog)
);
export default waterRouter;
