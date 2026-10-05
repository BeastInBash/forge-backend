import prisma from '../../lib/db';
import ApiError from '../../common/libs/ApiError';
import { normalizeName } from '../../common/utils/normalizeName';
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
