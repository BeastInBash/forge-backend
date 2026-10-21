import { z } from 'zod';
import { MUSCLES } from '../utils/muscles';

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
    repetition: z.int().positive().max(100),
    sets: z.int().positive().max(20),
    /** Working weight in kg; null or absent for bodyweight. */
    weight: z.number().min(0).max(1000).nullable().optional()
};

/** Plans are one per weekday, Monday first. */
export const WEEKDAYS = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
] as const;

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
        day: z.enum(WEEKDAYS),
        /** ISO 8601 string — JSON has no Date. The service parses it before Prisma. */
        time: z.iso.datetime({ offset: true }),
        muscle_group: z.string().trim().min(1).max(60),
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

/** Route params for `/api/v1/exercise/:exerciseId/...`. */
export const exerciseIdParamsSchema = z.strictObject({ exerciseId: z.uuid() });

export type ExerciseIdParams = z.infer<typeof exerciseIdParamsSchema>;

/** One of the fixed muscle labels in `src/common/utils/muscles.ts`. */
export const muscleSchema = z.enum(MUSCLES).meta({ id: 'Muscle' });

/** A set of muscles: no repeats, at most a handful. */
const musclesSchema = z
    .array(muscleSchema)
    .max(8)
    .refine((muscles) => new Set(muscles).size === muscles.length, 'A muscle is listed twice');

/** A muscle can't be both a primary and a secondary target of one exercise. */
const noOverlap = (value: { primary_muscles?: string[]; secondary_muscles?: string[] }) =>
    !value.primary_muscles?.some((muscle) => value.secondary_muscles?.includes(muscle));
const overlapError = {
    message: 'A muscle can be primary or secondary, not both',
    path: ['secondary_muscles']
};

/**
 * Multipart sends every field as text, so the muscle lists arrive as JSON arrays in a string
 * (`["Upper chest","Front delts"]`). Absent means none.
 */
const musclesFormField = z
    .string()
    .optional()
    .transform((value, ctx) => {
        if (!value) return [];
        try {
            return JSON.parse(value) as unknown;
        } catch {
            ctx.addIssue({ code: 'custom', message: 'Send the muscles as a JSON array' });
            return z.NEVER;
        }
    })
    .pipe(musclesSchema);

/** Text fields of the multipart create-exercise form; the image arrives as `req.file`. */
export const createExerciseFormSchema = z
    .strictObject({
        exercise_name: z.string().trim().min(1).max(100),
        primary_muscles: musclesFormField,
        secondary_muscles: musclesFormField
    })
    .refine(noOverlap, overlapError)
    .meta({ id: 'CreateExerciseForm' });

export type CreateExerciseForm = z.infer<typeof createExerciseFormSchema>;

/** Body for editing a catalog exercise; send only what changes. Admins only. */
export const updateExerciseBodySchema = z
    .strictObject({
        exercise_name: z.string().trim().min(1).max(100).optional(),
        primary_muscles: musclesSchema.optional(),
        secondary_muscles: musclesSchema.optional()
    })
    .refine((body) => Object.keys(body).length > 0, 'Send at least one field to change')
    .meta({ id: 'UpdateExerciseBody' });

export type UpdateExerciseBody = z.infer<typeof updateExerciseBodySchema>;

/** Route params for `/api/v1/workout/:workoutId`. */
export const workoutIdParamsSchema = z.strictObject({ workoutId: z.uuid() });

export type WorkoutIdParams = z.infer<typeof workoutIdParamsSchema>;
