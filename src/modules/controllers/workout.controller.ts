import type { Request, Response } from 'express';
import {
    createWorkoutService,
    deleteWorkoutService,
    listWorkoutsService,
    updateWorkoutService
} from '../services/workout.services';
import ApiResponses from '../../common/libs/ApiResponses';
import type { WorkoutBodyInput, WorkoutIdParams } from '../../common/zodSchema/workoutSchema';

export const createWorkout = async (req: Request, res: Response) => {
    // req.body was validated by validateBody(workoutBodySchema)
    const body = req.body as WorkoutBodyInput;
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
    const data = await updateWorkoutService(workoutId, body, res.locals.session.session.userId);
    return ApiResponses.ok(res, 'Workout plan updated', data);
};

export const deleteWorkout = async (req: Request, res: Response) => {
    const { workoutId } = req.params as WorkoutIdParams;
    await deleteWorkoutService(workoutId, res.locals.session.session.userId);
    return ApiResponses.ok(res, 'Workout plan deleted', null);
};
