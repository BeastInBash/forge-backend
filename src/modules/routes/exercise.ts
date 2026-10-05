import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware';
import { validateBody } from '../../common/middleware/validate.middleware';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { createExercisesBodySchema } from '../../common/zodSchema/workoutSchema';
import { createExercises } from '../controllers/exercise.controller';

const exerciseRoute = Router();

// TODO: restrict to admins once User has a role field
exerciseRoute.post(
    '/create-exercises',
    requireAuth,
    validateBody(createExercisesBodySchema),
    asyncHandler(createExercises)
);
export default exerciseRoute;
