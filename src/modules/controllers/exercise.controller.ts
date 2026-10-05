import type { Request, Response } from 'express';
import { createExercisesService } from '../services/exercises.services';
import ApiResponses from '../../common/libs/ApiResponses';
import type { CatalogExerciseInput } from '../../common/zodSchema/workoutSchema';

export const createExercises = async (req: Request, res: Response) => {
    // req.body was validated by validateBody(createExercisesBodySchema)
    const exercises = req.body as CatalogExerciseInput[];
    const data = await createExercisesService(exercises, res.locals.session.session.userId);
    return ApiResponses.create(res, 'Exercises Created', data);
};
