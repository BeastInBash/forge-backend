import { Router } from 'express';
import { requireAdmin, requireAuth } from '../../common/middleware/auth.middleware';
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
// multer runs first so the text field is in req.body for validation. Admins only.
exerciseRoute.post(
    '/',
    requireAuth,
    requireAdmin,
    uploadImage,
    validateBody(createExerciseFormSchema),
    asyncHandler(createExerciseWithImage)
);

// Admins only.
exerciseRoute.post(
    '/create-exercises',
    requireAuth,
    requireAdmin,
    validateBody(createExercisesBodySchema),
    asyncHandler(createExercises)
);

// Replaces the exercise's image. Admins only.
exerciseRoute.put(
    '/:exerciseId/image',
    requireAuth,
    requireAdmin,
    validateParams(exerciseIdParamsSchema),
    uploadImage,
    asyncHandler(setExerciseImage)
);
export default exerciseRoute;
