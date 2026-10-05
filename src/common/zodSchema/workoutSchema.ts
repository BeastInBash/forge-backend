import { z } from 'zod';

/**
 * Validation for the create-workout request body.
 *
 * Mirrors `src/common/types/IWorkout.ts` — this validates what arrives over
 * HTTP, not what Prisma stores. Anything derived server-side (`name_key`,
 * `order`, ids, the parsed `Date`) is deliberately absent here and must never
 * be accepted from the client.
 */

/** How an exercise is performed inside one specific plan (the join-row values). */
const workoutExerciseFields = {
    repetition: z.int().positive(),
    sets: z.int().positive()
};

/** Picked from the dropdown — the exercise already exists in the catalog. */
export const existingExerciseSchema = z
    .strictObject({
        ...workoutExerciseFields,
        exerciseId: z.uuid()
    })
    .meta({ id: 'ExistingExerciseInput', description: 'An exercise picked from the catalog' });

/**
 * Typed in by the user — not in the catalog yet, so the service must
 * find-or-create it before writing the join row. `name_key` is derived
 * server-side, so it is not part of this shape.
 */
export const newExerciseSchema = z
    .strictObject({
        ...workoutExerciseFields,
        exercise_name: z.string().trim().min(1).max(100),
        exercise_video: z.url().optional(),
        exercise_icon: z.url().optional()
    })
    .meta({
        id: 'NewExerciseInput',
        description: 'A new exercise typed in by the user; added to the catalog if missing'
    });

/**
 * One entry in the plan: either a catalog pick or a brand-new exercise.
 * Both members are strict objects, which is what keeps the union honest — an
 * item carrying both `exerciseId` and `exercise_name` fails both branches
 * instead of silently passing as an existing exercise.
 */
export const exerciseSchema = z
    .union([existingExerciseSchema, newExerciseSchema])
    .meta({ id: 'WorkoutExerciseInput' });

/** The JSON body the client POSTs. */
export const workoutBodySchema = z
    .strictObject({
        day: z.string().trim().min(1),
        /** ISO 8601 string — JSON has no Date. The service parses it before Prisma. */
        time: z.iso.datetime({ offset: true }),
        muscle_group: z.string().trim().min(1),
        exercises: z.array(exerciseSchema).min(1)
    })
    .meta({ id: 'CreateWorkoutBody' });

/**
 * What the service receives: the body plus the userId the controller injects
 * from the session. Validate `req.body` with `workoutBodySchema` so a client
 * can never supply `userId`.
 */
export const workoutSchema = workoutBodySchema.extend({
    userId: z.string().min(1)
});

export type ExistingExerciseInput = z.infer<typeof existingExerciseSchema>;
export type NewExerciseInput = z.infer<typeof newExerciseSchema>;
export type ExerciseInput = z.infer<typeof exerciseSchema>;
export type WorkoutBodyInput = z.infer<typeof workoutBodySchema>;
export type WorkoutInput = z.infer<typeof workoutSchema>;

/**
 * Body for adding exercises straight to the catalog (no plan involved), so it
 * carries none of the per-plan `repetition` / `sets` fields.
 */
export const catalogExerciseSchema = z
    .strictObject({
        exercise_name: z.string().trim().min(1).max(100),
        exercise_video: z.url().optional(),
        exercise_icon: z.url().optional()
    })
    .meta({ id: 'CatalogExerciseInput' });

export const createExercisesBodySchema = z.array(catalogExerciseSchema).min(1);

export type CatalogExerciseInput = z.infer<typeof catalogExerciseSchema>;
