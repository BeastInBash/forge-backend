import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware';
import { validateBody } from '../../common/middleware/validate.middleware';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { workoutBodySchema } from '../../common/zodSchema/workoutSchema';
import { createWorkout } from '../controllers/workout.controller';

const workoutRouter = Router();

workoutRouter.post(
    '/create-workout',
    requireAuth,
    validateBody(workoutBodySchema),
    asyncHandler(createWorkout)
);
export default workoutRouter;
