import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware';
import { validateBody, validateParams } from '../../common/middleware/validate.middleware';
import { asyncHandler } from '../../common/utils/asyncHandler';
import {
    liftBodySchema,
    liftExerciseParamsSchema,
    liftIdParamsSchema
} from '../../common/zodSchema/liftSchema';
import {
    createLift,
    deleteLift,
    listExerciseLifts,
    listLiftSummaries
} from '../controllers/lift.controller';

const liftRouter = Router();

liftRouter.get('/', requireAuth, asyncHandler(listLiftSummaries));

liftRouter.get(
    '/exercise/:exerciseId',
    requireAuth,
    validateParams(liftExerciseParamsSchema),
    asyncHandler(listExerciseLifts)
);

liftRouter.post('/', requireAuth, validateBody(liftBodySchema), asyncHandler(createLift));

liftRouter.delete(
    '/:liftId',
    requireAuth,
    validateParams(liftIdParamsSchema),
    asyncHandler(deleteLift)
);
export default liftRouter;
