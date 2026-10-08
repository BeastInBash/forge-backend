import { z } from 'zod';

export const fitnessGoalSchema = z
    .enum(['WEIGHT_LOSS', 'WEIGHT_GAIN', 'MUSCLE_BUILDING'])
    .meta({ id: 'FitnessGoal' });

/**
 * The JSON body for finishing onboarding. Every answer can be skipped, so each one is nullable;
 * the bounds only reject values no person has.
 */
export const onboardingBodySchema = z
    .strictObject({
        age: z.int().min(13).max(100).nullable(),
        /** Height in cm. */
        heightCm: z.number().min(100).max(250).nullable(),
        /** Body weight in kg. */
        weightKg: z.number().min(30).max(300).nullable(),
        goal: fitnessGoalSchema.nullable()
    })
    .meta({ id: 'OnboardingBody' });

export type OnboardingBodyInput = z.infer<typeof onboardingBodySchema>;
