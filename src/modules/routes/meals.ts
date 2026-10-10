import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware';
import { validateBody } from '../../common/middleware/validate.middleware';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { analyzeMealBodySchema } from '../../common/zodSchema/mealSchema';
import { analyzeMeal } from '../controllers/meal.controller';

const mealRouter = Router();

mealRouter.post(
    '/analyze',
    requireAuth,
    validateBody(analyzeMealBodySchema),
    asyncHandler(analyzeMeal)
);

export default mealRouter;
