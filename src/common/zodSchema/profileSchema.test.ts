import { describe, expect, test } from 'bun:test';
import { onboardingBodySchema } from './profileSchema';

describe('onboardingBodySchema', () => {
    test('accepts a full set of answers', () => {
        const body = { age: 29, heightCm: 178.5, weightKg: 81, goal: 'MUSCLE_BUILDING' as const };
        expect(onboardingBodySchema.parse(body)).toEqual(body);
    });

    test('accepts every step skipped', () => {
        const body = { age: null, heightCm: null, weightKg: null, goal: null };
        expect(onboardingBodySchema.parse(body)).toEqual(body);
    });

    test('rejects out-of-range values and unknown goals', () => {
        const base = { age: null, heightCm: null, weightKg: null, goal: null };
        expect(onboardingBodySchema.safeParse({ ...base, age: 8 }).success).toBe(false);
        expect(onboardingBodySchema.safeParse({ ...base, age: 30.5 }).success).toBe(false);
        expect(onboardingBodySchema.safeParse({ ...base, heightCm: 20 }).success).toBe(false);
        expect(onboardingBodySchema.safeParse({ ...base, weightKg: 900 }).success).toBe(false);
        expect(onboardingBodySchema.safeParse({ ...base, goal: 'BULK' }).success).toBe(false);
    });

    test('rejects a missing answer or an extra field', () => {
        expect(onboardingBodySchema.safeParse({ age: 30 }).success).toBe(false);
        const extra = { age: null, heightCm: null, weightKg: null, goal: null, onboardedAt: 'x' };
        expect(onboardingBodySchema.safeParse(extra).success).toBe(false);
    });
});
