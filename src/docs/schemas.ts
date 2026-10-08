import { z } from 'zod';

/**
 * Response shapes for the OpenAPI document only — nothing validates against
 * these at runtime. Keep them in step with what the services return.
 */

export const errorResponseSchema = z
    .object({
        success: z.literal(false),
        message: z.string(),
        errors: z
            .array(
                z.object({
                    field: z.string(),
                    message: z.string()
                })
            )
            .optional()
            .meta({ description: 'Per-field messages, present on validation errors' })
    })
    .meta({ id: 'ErrorResponse' });

/** Wraps `data` in the `{ success, message, data }` envelope from ApiResponses. */
export const successResponse = <T extends z.ZodType>(data: T, id: string) =>
    z
        .object({
            success: z.literal(true),
            message: z.string(),
            data
        })
        .meta({ id });

export const exerciseResponseSchema = z
    .object({
        id: z.uuid(),
        exercise_name: z.string(),
        name_key: z
            .string()
            .meta({ description: 'Lowercased, trimmed name; unique across the catalog' }),
        exercise_video: z.string().nullable(),
        exercise_icon: z.string().nullable(),
        createdById: z.string().nullable()
    })
    .meta({ id: 'Exercise' });

export const workoutExerciseResponseSchema = z
    .object({
        id: z.uuid(),
        workout_PlanId: z.uuid(),
        exerciseId: z.uuid(),
        repetition: z.int(),
        sets: z.int(),
        weight: z
            .number()
            .nullable()
            .meta({ description: 'Working weight in kg; null for bodyweight' }),
        order: z.int().meta({ description: 'Position in the plan, starting at 0' }),
        exercise: exerciseResponseSchema
    })
    .meta({ id: 'WorkoutExercise' });

export const workoutPlanResponseSchema = z
    .object({
        id: z.uuid(),
        day: z.string(),
        time: z.iso.datetime(),
        muscle_group: z.string(),
        userId: z.string(),
        workoutExercises: z.array(workoutExerciseResponseSchema)
    })
    .meta({ id: 'WorkoutPlan' });

export const meResponseSchema = z
    .object({
        session: z.looseObject({
            id: z.string(),
            userId: z.string(),
            expiresAt: z.iso.datetime()
        }),
        user: z.looseObject({
            id: z.string(),
            name: z.string(),
            email: z.email()
        })
    })
    .nullable()
    .meta({ id: 'MeResponse', description: 'The current session, or null when signed out' });

export const profileResponseSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        email: z.email(),
        bio: z.string().nullable(),
        emailVerified: z.boolean(),
        image: z.string().nullable(),
        createdAt: z.iso.datetime(),
        updatedAt: z.iso.datetime(),
        accounts: z
            .array(z.object({ providerId: z.string(), createdAt: z.iso.datetime() }))
            .meta({ description: 'Linked sign-in methods ("credential" is email and password)' }),
        sessions: z
            .array(
                z.object({
                    createdAt: z.iso.datetime(),
                    updatedAt: z.iso.datetime(),
                    expiresAt: z.iso.datetime(),
                    ipAddress: z.string().nullable(),
                    userAgent: z.string().nullable(),
                    current: z
                        .boolean()
                        .meta({ description: 'True for the session making this request' })
                })
            )
            .meta({ description: 'Unexpired sessions, most recently active first' }),
        stats: z.object({ workoutPlans: z.int(), exercisesCreated: z.int() })
    })
    .meta({ id: 'Profile' });

export const exerciseSummarySchema = z
    .object({
        id: z.uuid(),
        exercise_name: z.string(),
        exercise_icon: z.string().nullable().meta({
            description:
                'Cloudinary URL of the original image; add e.g. `f_auto,q_auto,w_192,h_192,c_fill` after `/upload/` for a thumbnail'
        }),
        exercise_video: z.string().nullable()
    })
    .meta({ id: 'ExerciseSummary' });

const liftExerciseSchema = z
    .object({ id: z.uuid(), exercise_name: z.string(), exercise_icon: z.string().nullable() })
    .meta({ id: 'LiftExercise' });

export const liftResponseSchema = z
    .object({
        id: z.uuid(),
        userId: z.string(),
        exerciseId: z.uuid(),
        performedAt: z.iso.datetime(),
        note: z.string().nullable(),
        createdAt: z.iso.datetime(),
        sets: z.array(
            z.object({
                id: z.uuid(),
                weight: z
                    .number()
                    .nullable()
                    .meta({ description: 'Load in kg; null for bodyweight' }),
                reps: z.int(),
                order: z.int()
            })
        )
    })
    .meta({ id: 'Lift' });

export const liftSummarySchema = z
    .object({
        exercise: liftExerciseSchema,
        sessions: z.int(),
        last: liftResponseSchema,
        best: z
            .object({
                weight: z.number().nullable(),
                reps: z.int(),
                performedAt: z.iso.datetime()
            })
            .nullable()
            .meta({ description: 'The all-time best set by estimated one-rep max' }),
        trend: z.array(z.number()).meta({
            description:
                'Best estimated one-rep max (or reps, for bodyweight) of each of the last 12 sessions, oldest first'
        })
    })
    .meta({ id: 'LiftSummary' });

export const liftHistorySchema = z
    .object({ exercise: liftExerciseSchema, lifts: z.array(liftResponseSchema) })
    .meta({ id: 'LiftHistory' });
