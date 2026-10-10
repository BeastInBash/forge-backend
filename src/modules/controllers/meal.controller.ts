import type { Request, Response } from 'express';
import { analyzeMealService } from '../services/meal.services';
import ApiResponses from '../../common/libs/ApiResponses';
import type { AnalyzeMealBody } from '../../common/zodSchema/mealSchema';

export const analyzeMeal = async (req: Request, res: Response) => {
    // req.body was validated by validateBody(analyzeMealBodySchema)
    const data = await analyzeMealService(req.body as AnalyzeMealBody);
    return ApiResponses.ok(res, 'Meal analysed', data);
};
