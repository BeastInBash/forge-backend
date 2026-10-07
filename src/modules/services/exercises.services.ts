import prisma from '../../lib/db';
import ApiError from '../../common/libs/ApiError';
import { normalizeName } from '../../common/utils/normalizeName';
import { uploadExerciseImage } from '../../lib/cloudinary';
import type { CatalogExerciseInput } from '../../common/zodSchema/workoutSchema';

// Add exercises to the catalog
export const createExercisesService = async (exercises: CatalogExerciseInput[], userId: string) => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const exercise of exercises) {
        const key = normalizeName(exercise.exercise_name);
        if (seen.has(key)) duplicates.add(key);
        seen.add(key);
    }
    if (duplicates.size > 0) {
        throw ApiError.badRequest(`Duplicate Exercises found ${[...duplicates].join(', ')}`);
    }

    const existing = await prisma.exercise.findMany({
        where: { name_key: { in: [...seen] } },
        select: { exercise_name: true }
    });
    if (existing.length > 0) {
        throw ApiError.conflict(
            `Exercises already exist: ${existing.map((exercise) => exercise.exercise_name).join(', ')}`
        );
    }

    // A concurrent insert of the same name_key still surfaces as P2002 -> 409 via the error handler
    return prisma.exercise.createManyAndReturn({
        data: exercises.map((exercise) => ({
            exercise_name: exercise.exercise_name,
            name_key: normalizeName(exercise.exercise_name),
            exercise_icon: exercise.exercise_icon,
            exercise_video: exercise.exercise_video,
            createdById: userId
        }))
    });
};

// Upload an exercise's image and point exercise_icon at it
export const setExerciseImageService = async (
    exerciseId: string,
    file: { buffer: Buffer; mimetype: string }
) => {
    const exercise = await prisma.exercise.findUnique({
        where: { id: exerciseId },
        select: { name_key: true }
    });
    if (!exercise) throw ApiError.notFound('Exercise not found');

    const imageUrl = await uploadExerciseImage(file, exercise.name_key);
    return prisma.exercise.update({
        where: { id: exerciseId },
        data: { exercise_icon: imageUrl }
    });
};

// The whole catalog, alphabetically, for pickers and the exercise library
export const listExercisesService = () =>
    prisma.exercise.findMany({
        select: { id: true, exercise_name: true, exercise_icon: true, exercise_video: true },
        orderBy: { exercise_name: 'asc' }
    });

// Add one exercise with its image. The name is checked before uploading so a duplicate
// doesn't overwrite the existing exercise's image on Cloudinary.
export const createExerciseWithImageService = async (
    exerciseName: string,
    file: { buffer: Uint8Array; mimetype: string },
    userId: string
) => {
    const nameKey = normalizeName(exerciseName);
    const existing = await prisma.exercise.findUnique({
        where: { name_key: nameKey },
        select: { exercise_name: true }
    });
    if (existing) throw ApiError.conflict(`"${existing.exercise_name}" is already in the catalog`);

    const imageUrl = await uploadExerciseImage(file, nameKey);
    // A concurrent insert of the same name_key still surfaces as P2002 -> 409 via the error handler
    return prisma.exercise.create({
        data: {
            exercise_name: exerciseName,
            name_key: nameKey,
            exercise_icon: imageUrl,
            createdById: userId
        }
    });
};
