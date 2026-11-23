import { Router, type NextFunction, type Request, type Response } from 'express';
import ApiError from '../../common/libs/ApiError';
import { requireAuth } from '../../common/middleware/auth.middleware';
import { aiRateLimit } from '../../common/middleware/aiRateLimit.middleware';
import { uploadImage } from '../../common/middleware/upload.middleware';
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
    getMealDay,
    listMeals,
    recognizeMealPhoto
} from '../controllers/meal.controller';

const mealRouter = Router();

/** 400 before the rate limit, so a request without a photo doesn't use up an AI call. */
const requireMealPhoto = (req: Request, _res: Response, next: NextFunction) =>
    next(req.file ? undefined : ApiError.badRequest('Add a photo of the meal'));

mealRouter.post(
    '/analyze',
    requireAuth,
    validateBody(analyzeMealBodySchema),
    aiRateLimit('meal_analyze'),
    asyncHandler(analyzeMeal)
);

// Multipart form with one `image` (PNG, JPEG or WebP, max 4 MB); returns the foods it shows
mealRouter.post(
    '/photo',
    requireAuth,
    uploadImage,
    requireMealPhoto,
    aiRateLimit('meal_photo'),
    asyncHandler(recognizeMealPhoto)
);

mealRouter.get('/', requireAuth, asyncHandler(listMeals));

mealRouter.post(
    '/',
    requireAuth,
    validateBody(createMealBodySchema),
    aiRateLimit('meal_create'),
    asyncHandler(createMeal)
);

// Before '/:mealId', which would otherwise reject "day" as a meal id
mealRouter.get('/day', requireAuth, asyncHandler(getMealDay));

mealRouter.get('/:mealId', requireAuth, validateParams(mealIdParamsSchema), asyncHandler(getMeal));

mealRouter.delete(
    '/:mealId',
    requireAuth,
    validateParams(mealIdParamsSchema),
    asyncHandler(deleteMeal)
);

export default mealRouter;
