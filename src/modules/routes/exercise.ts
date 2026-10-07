import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware';
import { validateBody, validateParams } from '../../common/middleware/validate.middleware';
import { uploadImage } from '../../common/middleware/upload.middleware';
import { asyncHandler } from '../../common/utils/asyncHandler';
import {
    createExerciseFormSchema,
    createExercisesBodySchema,
    exerciseIdParamsSchema
} from '../../common/zodSchema/workoutSchema';
import {
    createExercises,
    createExerciseWithImage,
    listExercises,
    setExerciseImage
} from '../controllers/exercise.controller';

const exerciseRoute = Router();

exerciseRoute.get('/', requireAuth, asyncHandler(listExercises));

// One exercise with its image, as multipart: `exercise_name` + `image`.
// multer runs first so the text field is in req.body for validation.
// TODO: restrict to admins together with create-exercises
exerciseRoute.post(
    '/',
    requireAuth,
    uploadImage,
    validateBody(createExerciseFormSchema),
    asyncHandler(createExerciseWithImage)
);

// TODO: restrict to admins once User has a role field
exerciseRoute.post(
    '/create-exercises',
    requireAuth,
    validateBody(createExercisesBodySchema),
    asyncHandler(createExercises)
);

// Replaces the exercise's image. TODO: restrict to admins together with create-exercises
exerciseRoute.put(
    '/:exerciseId/image',
    requireAuth,
    validateParams(exerciseIdParamsSchema),
    uploadImage,
    asyncHandler(setExerciseImage)
);
export default exerciseRoute;
