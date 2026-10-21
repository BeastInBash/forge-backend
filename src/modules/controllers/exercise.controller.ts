import type { Request, Response } from 'express';
import {
    createExercisesService,
    createExerciseWithImageService,
    listExercisesService,
    setExerciseImageService,
    updateExerciseService
} from '../services/exercises.services';
import ApiError from '../../common/libs/ApiError';
import ApiResponses from '../../common/libs/ApiResponses';
import { sendConditionalJson } from '../../common/utils/conditionalJson';
import type {
    CatalogExerciseInput,
    CreateExerciseForm,
    ExerciseIdParams,
    UpdateExerciseBody
} from '../../common/zodSchema/workoutSchema';

export const createExercises = async (req: Request, res: Response) => {
    // req.body was validated by validateBody(createExercisesBodySchema)
    const exercises = req.body as CatalogExerciseInput[];
    const data = await createExercisesService(exercises, res.locals.session.session.userId);
    return ApiResponses.create(res, 'Exercises Created', data);
};

export const setExerciseImage = async (req: Request, res: Response) => {
    // req.params was validated by validateParams(exerciseIdParamsSchema)
    const { exerciseId } = req.params as ExerciseIdParams;
    if (!req.file) throw ApiError.badRequest('Attach the image as multipart field "image"');
    const data = await setExerciseImageService(exerciseId, req.file);
    return ApiResponses.ok(res, 'Exercise image updated', data);
};

export const listExercises = async (req: Request, res: Response) => {
    const data = await listExercisesService();
    // Clients cache the catalog and revalidate with If-None-Match; an unchanged catalog is a 304.
    return sendConditionalJson(req, res, { success: true, message: 'Exercises', data });
};

export const createExerciseWithImage = async (req: Request, res: Response) => {
    // req.body was validated by validateBody(createExerciseFormSchema) after multer parsed it
    const { exercise_name, primary_muscles, secondary_muscles } = req.body as CreateExerciseForm;
    if (!req.file) throw ApiError.badRequest('Attach the image as multipart field "image"');
    const data = await createExerciseWithImageService(
        exercise_name,
        req.file,
        res.locals.session.session.userId,
        { primary_muscles, secondary_muscles }
    );
    return ApiResponses.create(res, 'Exercise created', data);
};

export const updateExercise = async (req: Request, res: Response) => {
    // req.params and req.body were validated by exerciseIdParamsSchema / updateExerciseBodySchema
    const { exerciseId } = req.params as ExerciseIdParams;
    const data = await updateExerciseService(exerciseId, req.body as UpdateExerciseBody);
    return ApiResponses.ok(res, 'Exercise updated', data);
};
