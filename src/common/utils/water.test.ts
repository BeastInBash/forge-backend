import { describe, expect, test } from 'bun:test';
import {
    dueReminder,
    isValidTimezone,
    localDate,
    localDayRange,
    reminderSchedule,
    waterReminderMessage
} from './water';

describe('reminderSchedule', () => {
    test('reminds every interval through the window, splitting the goal into glasses', () => {
        const { times, perReminderMl } = reminderSchedule({
            dailyGoalMl: 3000,
            reminderStart: '08:00',
            reminderEnd: '22:00',
            reminderIntervalMin: 120
        });
        expect(times).toEqual([
            '08:00',
            '10:00',
            '12:00',
            '14:00',
            '16:00',
            '18:00',
            '20:00',
            '22:00'
        ]);
        // 3000 / 8 = 375
        expect(perReminderMl).toBe(400);
    });

    test('stops before an end the interval overshoots', () => {
        const { times } = reminderSchedule({
            dailyGoalMl: 2000,
            reminderStart: '09:30',
            reminderEnd: '12:00',
            reminderIntervalMin: 45
        });
        expect(times).toEqual(['09:30', '10:15', '11:00', '11:45']);
    });

    test('never suggests less than one sip', () => {
        const { perReminderMl } = reminderSchedule({
            dailyGoalMl: 500,
            reminderStart: '00:00',
            reminderEnd: '23:45',
            reminderIntervalMin: 15
        });
        expect(perReminderMl).toBe(50);
    });
});

describe('time zones', () => {
    test('validates IANA names', () => {
        expect(isValidTimezone('Asia/Karachi')).toBe(true);
        expect(isValidTimezone('Mars/Olympus')).toBe(false);
    });

    test('gives the local date', () => {
        const at = new Date('2026-10-15T20:00:00Z');
        expect(localDate('Asia/Karachi', at)).toBe('2026-10-16');
        expect(localDate('America/New_York', at)).toBe('2026-10-15');
    });

    test('bounds a day at local midnight', () => {
        expect(localDayRange('2026-10-15', 'Asia/Karachi')).toEqual({
            from: new Date('2026-10-14T19:00:00Z'),
            to: new Date('2026-10-15T19:00:00Z')
        });
    });

    test('handles a 23-hour DST day', () => {
        const { from, to } = localDayRange('2026-03-08', 'America/New_York');
        expect(from).toEqual(new Date('2026-03-08T05:00:00Z'));
        expect(to).toEqual(new Date('2026-03-09T04:00:00Z'));
    });
});

describe('dueReminder', () => {
    // Karachi is UTC+5 all year: 10:00 local is 05:00 UTC
    const goal = {
        dailyGoalMl: 3000,
        reminderStart: '08:00',
        reminderEnd: '22:00',
        reminderIntervalMin: 120,
        timezone: 'Asia/Karachi',
        lastReminderAt: new Date('2026-10-15T03:00:00Z') // the 08:00 reminder
    };

    test('is due just after a slot, counting the slots left', () => {
        // 10:05 local; 10:00 through 22:00 is 7 slots
        expect(dueReminder(goal, new Date('2026-10-15T05:05:00Z'))).toEqual({ slotsLeft: 7 });
    });

    test('is not sent twice for one slot', () => {
        const sent = { ...goal, lastReminderAt: new Date('2026-10-15T05:05:00Z') };
        expect(dueReminder(sent, new Date('2026-10-15T05:20:00Z'))).toBeNull();
    });

    test('skips a slot that is over 30 minutes old', () => {
        expect(dueReminder(goal, new Date('2026-10-15T05:31:00Z'))).toBeNull();
    });

    test('is not due before the first slot or for a first-time user at night', () => {
        expect(dueReminder(goal, new Date('2026-10-15T02:00:00Z'))).toBeNull();
        expect(
            dueReminder({ ...goal, lastReminderAt: null }, new Date('2026-10-15T18:00:00Z'))
        ).toBeNull();
    });

    test('sends the first reminder to a new user', () => {
        const fresh = { ...goal, lastReminderAt: null };
        expect(dueReminder(fresh, new Date('2026-10-15T17:00:00Z'))).toEqual({ slotsLeft: 1 });
    });
});

describe('waterReminderMessage', () => {
    test('spreads what is left over the remaining slots', () => {
        expect(waterReminderMessage(3000, 1600, 4).body).toBe(
            "Have about 350 ml now. You've had 1.6 L of 3 L today."
        );
    });

    test('mentions an empty day', () => {
        expect(waterReminderMessage(2000, 0, 8).body).toBe(
            "Have about 250 ml now. You haven't logged any water yet today."
        );
    });
});
