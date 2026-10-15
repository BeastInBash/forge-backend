import { z } from 'zod';
import { isValidTimezone, toMinutes } from '../utils/water';

const timeOfDaySchema = z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour "HH:mm"')
    .meta({ description: 'Local time of day, 24-hour "HH:mm"' });

const timezoneSchema = z
    .string()
    .refine(isValidTimezone, 'Unknown time zone')
    .meta({ description: 'IANA time zone, e.g. "Asia/Karachi"' });

/** The JSON body for `PUT /api/v1/water/goal`: the daily target and reminder window. */
export const waterGoalBodySchema = z
    .strictObject({
        dailyGoalMl: z.int().min(500).max(10_000),
        remindersEnabled: z.boolean().default(true),
        reminderStart: timeOfDaySchema.default('08:00'),
        reminderEnd: timeOfDaySchema.default('22:00'),
        reminderIntervalMin: z.int().min(15).max(480).default(120),
        timezone: timezoneSchema
    })
    .refine((goal) => toMinutes(goal.reminderStart) < toMinutes(goal.reminderEnd), {
        message: 'Must be after reminderStart',
        path: ['reminderEnd']
    })
    .meta({
        id: 'WaterGoalBody',
        example: {
            dailyGoalMl: 3000,
            remindersEnabled: true,
            reminderStart: '08:00',
            reminderEnd: '22:00',
            reminderIntervalMin: 120,
            timezone: 'Asia/Karachi'
        }
    });

export type WaterGoalBody = z.infer<typeof waterGoalBodySchema>;

/** The JSON body for `POST /api/v1/water/logs`: one drink. */
export const waterLogBodySchema = z
    .strictObject({
        amountMl: z.int().min(10).max(3000),
        /** When it was drunk; defaults to now. ISO 8601 with offset. */
        drankAt: z.iso
            .datetime({ offset: true })
            .transform((value) => new Date(value))
            // A little slack for clocks that run ahead of the server's
            .refine((date) => date.getTime() <= Date.now() + 10 * 60_000, "Can't be in the future")
            .optional()
    })
    .meta({ id: 'LogWaterBody', example: { amountMl: 250 } });

export type WaterLogBody = z.infer<typeof waterLogBodySchema>;

/** Query for `GET /api/v1/water/day`. */
export const waterDayQuerySchema = z.strictObject({
    /** The local day, "YYYY-MM-DD"; defaults to today in the goal's time zone */
    date: z.iso.date().optional(),
    /** Used only when the user hasn't set a goal yet; defaults to UTC */
    timezone: timezoneSchema.optional()
});

export type WaterDayQuery = z.infer<typeof waterDayQuerySchema>;

/** Route params for `/api/v1/water/logs/:logId`. */
export const waterLogIdParamsSchema = z.strictObject({ logId: z.uuid() });

export type WaterLogIdParams = z.infer<typeof waterLogIdParamsSchema>;
