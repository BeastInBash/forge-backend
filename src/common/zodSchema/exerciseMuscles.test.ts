import { describe, expect, test } from 'bun:test';
import {
    createExerciseFormSchema,
    updateExerciseBodySchema,
    type UpdateExerciseBody
} from './workoutSchema';

describe('updateExerciseBodySchema', () => {
    test('accepts known muscles', () => {
        const body: UpdateExerciseBody = {
            primary_muscles: ['Upper chest'],
            secondary_muscles: ['Front delts']
        };
        expect(updateExerciseBodySchema.parse(body)).toEqual(body);
    });

    test('rejects an unknown muscle, a repeat and an empty body', () => {
        expect(updateExerciseBodySchema.safeParse({ primary_muscles: ['Pecs'] }).success).toBe(
            false
        );
        expect(
            updateExerciseBodySchema.safeParse({ primary_muscles: ['Lats', 'Lats'] }).success
        ).toBe(false);
        expect(updateExerciseBodySchema.safeParse({}).success).toBe(false);
    });
});

describe('createExerciseFormSchema', () => {
    test('parses muscle lists sent as JSON text', () => {
        const form = createExerciseFormSchema.parse({
            exercise_name: 'Incline Barbell Bench Press',
            primary_muscles: '["Upper chest"]',
            secondary_muscles: '["Front delts","Triceps"]'
        });
        expect(form.primary_muscles).toEqual(['Upper chest']);
        expect(form.secondary_muscles).toEqual(['Front delts', 'Triceps']);
    });

    test('treats missing lists as none and rejects bad JSON or overlap', () => {
        expect(createExerciseFormSchema.parse({ exercise_name: 'Shrugs' }).primary_muscles).toEqual(
            []
        );
        expect(
            createExerciseFormSchema.safeParse({ exercise_name: 'X', primary_muscles: '[oops' })
                .success
        ).toBe(false);
        expect(
            createExerciseFormSchema.safeParse({
                exercise_name: 'X',
                primary_muscles: '["Triceps"]',
                secondary_muscles: '["Triceps"]'
            }).success
        ).toBe(false);
    });
});
