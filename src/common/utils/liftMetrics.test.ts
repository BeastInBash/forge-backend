import { describe, expect, test } from 'bun:test';
import { bestSet, estimateOneRepMax } from './liftMetrics';

describe('estimateOneRepMax', () => {
    test('a single is its own max', () => {
        expect(estimateOneRepMax({ weight: 140, reps: 1 })).toBe(140);
    });
    test('uses Epley for multiple reps', () => {
        expect(estimateOneRepMax({ weight: 100, reps: 5 })).toBeCloseTo(116.67, 2);
    });
    test('bodyweight counts as 0', () => {
        expect(estimateOneRepMax({ weight: null, reps: 12 })).toBe(0);
    });
});

describe('bestSet', () => {
    test('picks the heaviest estimated max', () => {
        const sets = [
            { weight: 100, reps: 5 },
            { weight: 105, reps: 3 },
            { weight: 95, reps: 8 }
        ];
        expect(bestSet(sets)).toEqual({ weight: 95, reps: 8 });
    });
    test('falls back to most reps for bodyweight', () => {
        expect(
            bestSet([
                { weight: null, reps: 8 },
                { weight: null, reps: 11 }
            ])
        ).toEqual({
            weight: null,
            reps: 11
        });
    });
    test('is undefined for no sets', () => {
        expect(bestSet([])).toBeUndefined();
    });
});
