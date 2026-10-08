import { z } from 'zod';

/** One set as lifted: load and reps. */
export const liftSetSchema = z
    .strictObject({
        /** Load in kg; null for bodyweight. */
        weight: z.number().min(0).max(1000).nullable(),
        reps: z.int().positive().max(100)
    })
    .meta({ id: 'LiftSetInput' });

/** The JSON body for logging one exercise from one session. */
export const liftBodySchema = z
    .strictObject({
        exerciseId: z.uuid(),
        /** ISO 8601 string — when the lift was performed. */
        performedAt: z.iso.datetime({ offset: true }),
        sets: z.array(liftSetSchema).min(1).max(30),
        note: z.string().trim().max(200).optional()
    })
    .meta({ id: 'LogLiftBody' });

export type LiftBodyInput = z.infer<typeof liftBodySchema>;

/** Route params for `/api/v1/lifts/:liftId`. */
export const liftIdParamsSchema = z.strictObject({ liftId: z.uuid() });

export type LiftIdParams = z.infer<typeof liftIdParamsSchema>;

/** Route params for `/api/v1/lifts/exercise/:exerciseId`. */
export const liftExerciseParamsSchema = z.strictObject({ exerciseId: z.uuid() });

export type LiftExerciseParams = z.infer<typeof liftExerciseParamsSchema>;
