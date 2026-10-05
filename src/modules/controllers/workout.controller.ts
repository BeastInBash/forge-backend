import type { Request, Response } from 'express';
import { createWorkoutService } from '../services/workout.services';
import ApiResponses from '../../common/libs/ApiResponses';
import type { WorkoutBodyInput } from '../../common/zodSchema/workoutSchema';

export const createWorkout = async (req: Request, res: Response) => {
    // req.body was validated by validateBody(workoutBodySchema)
    const body = req.body as WorkoutBodyInput;
    const data = await createWorkoutService({ ...body, userId: res.locals.session.session.userId });
    return ApiResponses.create(res, 'workout Created', data);
};
