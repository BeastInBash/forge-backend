import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware';
import { validateBody, validateParams } from '../../common/middleware/validate.middleware';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { workoutBodySchema, workoutIdParamsSchema } from '../../common/zodSchema/workoutSchema';
import {
    createWorkout,
    deleteWorkout,
    listWorkouts,
    updateWorkout
} from '../controllers/workout.controller';

const workoutRouter = Router();

workoutRouter.get('/', requireAuth, asyncHandler(listWorkouts));

workoutRouter.post(
    '/create-workout',
    requireAuth,
    validateBody(workoutBodySchema),
    asyncHandler(createWorkout)
);

workoutRouter.put(
    '/:workoutId',
    requireAuth,
    validateParams(workoutIdParamsSchema),
    validateBody(workoutBodySchema),
    asyncHandler(updateWorkout)
);

workoutRouter.delete(
    '/:workoutId',
    requireAuth,
    validateParams(workoutIdParamsSchema),
    asyncHandler(deleteWorkout)
);
export default workoutRouter;
