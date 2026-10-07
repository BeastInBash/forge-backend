import type { IExistingExercise, INewExercise } from '../../common/types/IWorkout';
import prisma from '../../lib/db';
import ApiError from '../../common/libs/ApiError';
import {
    WEEKDAYS,
    type WorkoutBodyInput,
    type WorkoutInput
} from '../../common/zodSchema/workoutSchema';
import { duplicateCheck } from '../../common/utils/duplicateCheck';
import { normalizeName } from '../../common/utils/normalizeName';
import type { Prisma } from '../../generated/prisma/client';

/** What a plan returns: its exercises in order, each with its catalog entry. */
const planInclude = {
    workoutExercises: {
        include: { exercise: true },
        orderBy: { order: 'asc' }
    }
} satisfies Prisma.Workout_PlanInclude;

/** A user has at most one plan per weekday. */
const assertDayFree = async (userId: string, day: string, exceptPlanId?: string) => {
    const clash = await prisma.workout_Plan.findFirst({
        where: { userId, day, ...(exceptPlanId && { id: { not: exceptPlanId } }) },
        select: { muscle_group: true }
    });
    if (clash) {
        throw ApiError.conflict(`You already have a ${day} plan (${clash.muscle_group})`);
    }
};

/**
 * Turns the request's exercises into join-row data: catalog picks must exist, typed-in names are
 * found or added to the catalog (matched case-insensitively), and no exercise may appear twice.
 */
const resolveExercises = async (exercises: WorkoutBodyInput['exercises'], userId: string) => {
    const { hasDuplicate, duplicates } = duplicateCheck(exercises);
    if (hasDuplicate) {
        throw ApiError.badRequest(`Duplicate Exercises found ${duplicates.join(', ')}`);
    }

    const existingIds = exercises
        .filter((exercise): exercise is IExistingExercise => 'exerciseId' in exercise)
        .map((exercise) => exercise.exerciseId);
    const newExercises = exercises.filter(
        (exercise): exercise is INewExercise => !('exerciseId' in exercise)
    );

    const foundCount =
        existingIds.length === 0
            ? 0
            : await prisma.exercise.count({ where: { id: { in: existingIds } } });
    if (foundCount !== existingIds.length) {
        throw ApiError.badRequest('One or more exercises do not exist');
    }

    const createdOrFound = await Promise.all(
        newExercises.map((exercise) =>
            prisma.exercise.upsert({
                where: { name_key: normalizeName(exercise.exercise_name) },
                update: {},
                create: {
                    exercise_name: exercise.exercise_name,
                    name_key: normalizeName(exercise.exercise_name),
                    exercise_icon: exercise.exercise_icon,
                    exercise_video: exercise.exercise_video,
                    createdById: userId
                }
            })
        )
    );
    const idByName = new Map(
        createdOrFound.map((exercise) => [normalizeName(exercise.exercise_name), exercise.id])
    );

    const rows = exercises.map((exercise, order) => {
        const exerciseId =
            'exerciseId' in exercise
                ? exercise.exerciseId
                : idByName.get(normalizeName(exercise.exercise_name));
        if (!exerciseId) {
            throw new Error(`Exercise id not found for ${JSON.stringify(exercise)}`);
        }
        return {
            exerciseId,
            sets: exercise.sets,
            repetition: exercise.repetition,
            weight: exercise.weight ?? null,
            order
        };
    });

    // A catalog pick and a typed-in name can resolve to the same exercise
    const resolvedIds = rows.map((row) => row.exerciseId);
    if (new Set(resolvedIds).size !== resolvedIds.length) {
        throw ApiError.badRequest('The same exercise was added more than once');
    }
    return rows;
};

/*
 * Writes stay out of long interactive transactions: against a remote database each query is a
 * full round trip, and a transaction spanning the checks below outlived Prisma's 5 s limit.
 * The checks run first (in parallel); the plan and its exercise rows are then written by a
 * single nested create or update, which Prisma applies atomically.
 * Adding a typed-in exercise to the catalog is safe to keep even if the plan write then fails.
 */

// Expects a payload already validated by workoutBodySchema plus the session userId
export const createWorkoutService = async (parsedBody: WorkoutInput) => {
    const [, rows] = await Promise.all([
        assertDayFree(parsedBody.userId, parsedBody.day),
        resolveExercises(parsedBody.exercises, parsedBody.userId)
    ]);
    return prisma.workout_Plan.create({
        data: {
            day: parsedBody.day,
            time: parsedBody.time,
            muscle_group: parsedBody.muscle_group,
            user: { connect: { id: parsedBody.userId } },
            workoutExercises: { create: rows }
        },
        include: planInclude
    });
};

const dayIndex = (day: string) => WEEKDAYS.indexOf(day as (typeof WEEKDAYS)[number]);

// The user's plans, Monday first
export const listWorkoutsService = async (userId: string) => {
    const plans = await prisma.workout_Plan.findMany({ where: { userId }, include: planInclude });
    return plans.toSorted((a, b) => dayIndex(a.day) - dayIndex(b.day));
};

// Replaces a plan's day, time, muscle group and exercises in one go
export const updateWorkoutService = async (
    workoutId: string,
    body: WorkoutBodyInput,
    userId: string
) => {
    const plan = await prisma.workout_Plan.findFirst({
        where: { id: workoutId, userId },
        select: { id: true }
    });
    if (!plan) throw ApiError.notFound('Workout plan not found');

    const [, rows] = await Promise.all([
        assertDayFree(userId, body.day, workoutId),
        resolveExercises(body.exercises, userId)
    ]);
    // One nested write: the old exercise rows are dropped and the new ones created atomically
    return prisma.workout_Plan.update({
        where: { id: workoutId },
        data: {
            day: body.day,
            time: body.time,
            muscle_group: body.muscle_group,
            workoutExercises: { deleteMany: {}, create: rows }
        },
        include: planInclude
    });
};

export const deleteWorkoutService = async (workoutId: string, userId: string) => {
    // Scoped to the owner, so another user's id reads as "not found"
    const { count } = await prisma.workout_Plan.deleteMany({ where: { id: workoutId, userId } });
    if (count === 0) throw ApiError.notFound('Workout plan not found');
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
