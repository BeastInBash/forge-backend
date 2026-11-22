import { describe, expect, test } from 'bun:test';
import { checkAiLimit, formatWait } from './aiRateLimit';

const now = new Date('2026-11-22T12:00:00Z');
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60 * 1000);
const limits = { perHour: 3, perDay: 5 };

describe('checkAiLimit', () => {
    test('allows calls under both limits', () => {
        expect(checkAiLimit([], now, limits)).toEqual({ allowed: true });
        expect(checkAiLimit([minutesAgo(5), minutesAgo(10)], now, limits)).toEqual({
            allowed: true
        });
    });

    test('blocks at the hourly limit until the oldest call in the hour ages out', () => {
        const calls = [minutesAgo(50), minutesAgo(20), minutesAgo(5)];
        // The call 50 minutes ago leaves the hour in 10 minutes
        expect(checkAiLimit(calls, now, limits)).toEqual({ allowed: false, retryAfterSec: 600 });
    });

    test('ignores calls older than an hour for the hourly limit', () => {
        const calls = [minutesAgo(90), minutesAgo(70), minutesAgo(20), minutesAgo(5)];
        expect(checkAiLimit(calls, now, limits)).toEqual({ allowed: true });
    });

    test('blocks at the daily limit even when the last hour is quiet', () => {
        const calls = [600, 500, 400, 300, 200].map(minutesAgo);
        // The call 600 minutes ago leaves the day in 840 minutes
        expect(checkAiLimit(calls, now, limits)).toEqual({
            allowed: false,
            retryAfterSec: 840 * 60
        });
    });

    test('waits for the later of the two windows when both are full', () => {
        const calls = [1000, 900, 30, 20, 10].map(minutesAgo);
        // Hour frees in 30 min, day frees in 440 min
        expect(checkAiLimit(calls, now, limits)).toEqual({
            allowed: false,
            retryAfterSec: 440 * 60
        });
    });

    test('does not depend on the order calls are passed in', () => {
        const calls = [minutesAgo(5), minutesAgo(50), minutesAgo(20)];
        expect(checkAiLimit(calls, now, limits)).toEqual({ allowed: false, retryAfterSec: 600 });
    });
});

describe('formatWait', () => {
    test('rounds up to minutes, then hours', () => {
        expect(formatWait(1)).toBe('1 minute');
        expect(formatWait(61)).toBe('2 minutes');
        expect(formatWait(59 * 60)).toBe('59 minutes');
        expect(formatWait(60 * 60)).toBe('1 hour');
        expect(formatWait(61 * 60)).toBe('2 hours');
    });
});
