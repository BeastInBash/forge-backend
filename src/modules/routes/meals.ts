import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware';
import { validateBody, validateParams } from '../../common/middleware/validate.middleware';
import { asyncHandler } from '../../common/utils/asyncHandler';
import {
    analyzeMealBodySchema,
    createMealBodySchema,
    mealIdParamsSchema
} from '../../common/zodSchema/mealSchema';
import {
    analyzeMeal,
    createMeal,
    deleteMeal,
    getMeal,
    listMeals
} from '../controllers/meal.controller';

const mealRouter = Router();

mealRouter.post(
    '/analyze',
    requireAuth,
    validateBody(analyzeMealBodySchema),
    asyncHandler(analyzeMeal)
);

mealRouter.get('/', requireAuth, asyncHandler(listMeals));

mealRouter.post('/', requireAuth, validateBody(createMealBodySchema), asyncHandler(createMeal));

mealRouter.get('/:mealId', requireAuth, validateParams(mealIdParamsSchema), asyncHandler(getMeal));

mealRouter.delete(
    '/:mealId',
    requireAuth,
    validateParams(mealIdParamsSchema),
    asyncHandler(deleteMeal)
);

export default mealRouter;
