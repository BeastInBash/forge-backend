import type { Request, Response } from 'express';
import {
    analyzeMealService,
    createMealService,
    deleteMealService,
    getMealService,
    listMealsService
} from '../services/meal.services';
import ApiResponses from '../../common/libs/ApiResponses';
import {
    listMealsQuerySchema,
    type AnalyzeMealBody,
    type CreateMealBody,
    type MealIdParams
} from '../../common/zodSchema/mealSchema';

export const analyzeMeal = async (req: Request, res: Response) => {
    // req.body was validated by validateBody(analyzeMealBodySchema)
    const data = await analyzeMealService(req.body as AnalyzeMealBody);
    return ApiResponses.ok(res, 'Meal analysed', data);
};

export const createMeal = async (req: Request, res: Response) => {
    // req.body was validated by validateBody(createMealBodySchema)
    const data = await createMealService(
        req.body as CreateMealBody,
        res.locals.session.session.userId
    );
    return ApiResponses.create(res, 'Meal logged', data);
};

export const listMeals = async (req: Request, res: Response) => {
    // req.query can't be reassigned in Express 5, so it is parsed here; a ZodError becomes a 400
    const query = listMealsQuerySchema.parse(req.query);
    const data = await listMealsService(res.locals.session.session.userId, query);
    return ApiResponses.ok(res, 'Meals', data);
};

export const getMeal = async (req: Request, res: Response) => {
    const { mealId } = req.params as MealIdParams;
    const data = await getMealService(mealId, res.locals.session.session.userId);
    return ApiResponses.ok(res, 'Meal', data);
};

export const deleteMeal = async (req: Request, res: Response) => {
    const { mealId } = req.params as MealIdParams;
    await deleteMealService(mealId, res.locals.session.session.userId);
    return ApiResponses.ok(res, 'Meal deleted', null);
};
