import type { IExistingExercise, INewExercise } from '../../common/types/IWorkout';
import prisma from '../../lib/db';
import ApiError from '../../common/libs/ApiError';
import type { WorkoutInput } from '../../common/zodSchema/workoutSchema';
import { duplicateCheck } from '../../common/utils/duplicateCheck';
import { normalizeName } from '../../common/utils/normalizeName';

// Expects a payload already validated by workoutBodySchema plus the session userId
export const createWorkoutService = async (parsedBody: WorkoutInput) => {
    const { hasDuplicate, duplicates } = duplicateCheck(parsedBody.exercises);
    if (hasDuplicate) {
        throw ApiError.badRequest(`Duplicate Exercises found ${duplicates.join(', ')}`);
    }

    return prisma.$transaction(async (tx) => {
        const exisitingExercises = parsedBody.exercises.filter(
            (exercise): exercise is IExistingExercise => 'exerciseId' in exercise
        );
        const newExercises = parsedBody.exercises.filter(
            (exercise): exercise is INewExercise => !('exerciseId' in exercise)
        );

        const exisitingIds = exisitingExercises.map((exercise) => exercise.exerciseId);

        // Lookup for exisiting exercises in the database
        const foundExercises = await tx.exercise.findMany({
            where: {
                id: { in: exisitingIds }
            },
            select: {
                id: true
            }
        });
        if (foundExercises.length !== exisitingIds.length) {
            throw ApiError.badRequest('One or more exercises do not exist');
        }
        const createOrFoundExercises = await Promise.all(
            newExercises.map((exercise) =>
                tx.exercise.upsert({
                    where: {
                        name_key: normalizeName(exercise.exercise_name)
                    },
                    update: {},
                    create: {
                        exercise_name: exercise.exercise_name,
                        name_key: normalizeName(exercise.exercise_name),
                        exercise_icon: exercise.exercise_icon,
                        exercise_video: exercise.exercise_video,
                        createdById: parsedBody.userId
                    }
                })
            )
        );

        const createdExerciseMap = new Map(
            createOrFoundExercises.map((exercise) => [
                normalizeName(exercise.exercise_name),
                exercise.id
            ])
        );

        const finalExercises = parsedBody.exercises.map((exercise) => {
            if ('exerciseId' in exercise) {
                return {
                    exerciseId: exercise.exerciseId,
                    sets: exercise.sets,
                    repetition: exercise.repetition
                };
            }
            const exerciseId = createdExerciseMap.get(normalizeName(exercise.exercise_name));
            if (!exerciseId) {
                throw new Error(`Exercise id not found for ${exercise.exercise_name}`);
            }

            return {
                exerciseId,
                repetition: exercise.repetition,
                sets: exercise.sets
            };
        });

        // A catalog pick and a typed-in name can resolve to the same exercise
        const resolvedIds = finalExercises.map((exercise) => exercise.exerciseId);
        if (new Set(resolvedIds).size !== resolvedIds.length) {
            throw ApiError.badRequest('The same exercise was added more than once');
        }

        //  Plan creation
        const plans = await tx.workout_Plan.create({
            data: {
                day: parsedBody.day,
                time: parsedBody.time,
                muscle_group: parsedBody.muscle_group,
                user: {
                    connect: {
                        id: parsedBody.userId
                    }
                },
                workoutExercises: {
                    create: finalExercises.map((item, index) => ({
                        exerciseId: item.exerciseId,
                        sets: item.sets,
                        repetition: item.repetition,
                        order: index
                    }))
                }
            },
            include: {
                workoutExercises: {
                    include: {
                        exercise: true
                    }
                }
            }
        });

        return plans;
    });
};

/* -----------------------------------------------------------------------------
 * Separate service you still need for the dropdown itself:
 *
 *   getExercisesService({ search, limit })
 *     -> prisma.exercise.findMany({
 *          where: search ? { exercise_name: { contains: search, mode: "insensitive" } } : undefined,
 *          orderBy: { exercise_name: "asc" },
 *          take: limit ?? 50,
 *        })
 *
 * Paginate/limit it — the catalog will grow and the dropdown must not pull the
 * whole table. Expose it as GET /exercises so the client can search as the user
 * types, and only fall back to "add as new exercise" when nothing matches.
 *
 * Be aware this is a sequential scan: the only index on Exercise is the btree on
 * `name_key`, and a btree can't serve `contains`. Fine at small scale. When it
 * isn't, either search `name_key` with `startsWith` (uses the btree) or add a
 * pg_trgm GIN index via a hand-written migration.
 * -------------------------------------------------------------------------- */
