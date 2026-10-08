import type { Request, Response } from 'express';
import {
    createWorkoutService,
    deleteWorkoutService,
    listWorkoutsService,
    updateWorkoutService
} from '../services/workout.services';
import ApiError from '../../common/libs/ApiError';
import ApiResponses from '../../common/libs/ApiResponses';
import { isAdmin } from '../../common/middleware/auth.middleware';
import type { WorkoutBodyInput, WorkoutIdParams } from '../../common/zodSchema/workoutSchema';

/** Typed-in exercise names are added to the catalog, so only admins may send them. */
const assertCatalogPicks = (body: WorkoutBodyInput, res: Response) => {
    const addsExercises = body.exercises.some((exercise) => !('exerciseId' in exercise));
    if (addsExercises && !isAdmin(res.locals.session)) {
        throw ApiError.forbidden('Pick exercises from the catalog; only admins can add new ones');
    }
};

export const createWorkout = async (req: Request, res: Response) => {
    // req.body was validated by validateBody(workoutBodySchema)
    const body = req.body as WorkoutBodyInput;
    assertCatalogPicks(body, res);
    const data = await createWorkoutService({ ...body, userId: res.locals.session.session.userId });
    return ApiResponses.create(res, 'workout Created', data);
};

export const listWorkouts = async (_req: Request, res: Response) => {
    const data = await listWorkoutsService(res.locals.session.session.userId);
    return ApiResponses.ok(res, 'Workout plans', data);
};

export const updateWorkout = async (req: Request, res: Response) => {
    // req.params and req.body were validated by validateParams / validateBody
    const { workoutId } = req.params as WorkoutIdParams;
    const body = req.body as WorkoutBodyInput;
    assertCatalogPicks(body, res);
    const data = await updateWorkoutService(workoutId, body, res.locals.session.session.userId);
    return ApiResponses.ok(res, 'Workout plan updated', data);
};

export const deleteWorkout = async (req: Request, res: Response) => {
    const { workoutId } = req.params as WorkoutIdParams;
    await deleteWorkoutService(workoutId, res.locals.session.session.userId);
    return ApiResponses.ok(res, 'Workout plan deleted', null);
};
