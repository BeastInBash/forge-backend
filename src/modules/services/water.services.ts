import prisma from '../../lib/db';
import ApiError from '../../common/libs/ApiError';
import {
    dueReminder,
    localDate,
    localDayRange,
    reminderSchedule,
    waterReminderMessage
} from '../../common/utils/water';
import type { PushMessage } from '../../lib/push';
import { deliverPush } from './push.services';
import type {
    WaterDayQuery,
    WaterGoalBody,
    WaterLogBody
} from '../../common/zodSchema/waterSchema';
import type { Water_Goal } from '../../generated/prisma/client';

const logSelect = { id: true, amountMl: true, drankAt: true } as const;

/** A goal as the app sees it: the settings plus the reminders to schedule from them. */
const withReminders = ({ userId: _userId, ...goal }: Water_Goal) => ({
    ...goal,
    reminders: goal.remindersEnabled ? reminderSchedule(goal) : null
});

/** The user's goal, or null before they have set one. */
export const getWaterGoalService = async (userId: string) => {
    const goal = await prisma.water_Goal.findUnique({ where: { userId } });
    return goal ? withReminders(goal) : null;
};

export const setWaterGoalService = async (body: WaterGoalBody, userId: string) => {
    const goal = await prisma.water_Goal.upsert({
        where: { userId },
        create: { ...body, user: { connect: { id: userId } } },
        update: body
    });
    return withReminders(goal);
};

/** One local day: what was drunk, against the goal. */
export const getWaterDayService = async (userId: string, query: WaterDayQuery) => {
    const goal = await prisma.water_Goal.findUnique({ where: { userId } });
    const timezone = goal?.timezone ?? query.timezone ?? 'UTC';
    const date = query.date ?? localDate(timezone);
    const { from, to } = localDayRange(date, timezone);

    const logs = await prisma.water_Log.findMany({
        where: { userId, drankAt: { gte: from, lt: to } },
        select: logSelect,
        orderBy: { drankAt: 'asc' }
    });
    const consumedMl = logs.reduce((sum, log) => sum + log.amountMl, 0);
    const goalMl = goal?.dailyGoalMl ?? null;
    return {
        date,
        timezone,
        goalMl,
        consumedMl,
        remainingMl: goalMl === null ? null : Math.max(0, goalMl - consumedMl),
        goalReached: goalMl !== null && consumedMl >= goalMl,
        logs
    };
};

export const createWaterLogService = async (body: WaterLogBody, userId: string) =>
    prisma.water_Log.create({
        data: {
            amountMl: body.amountMl,
            drankAt: body.drankAt ?? new Date(),
            user: { connect: { id: userId } }
        },
        select: logSelect
    });

export const deleteWaterLogService = async (logId: string, userId: string) => {
    // Scoped to the owner, so another user's id reads as "not found"
    const { count } = await prisma.water_Log.deleteMany({ where: { id: logId, userId } });
    if (count === 0) throw ApiError.notFound('Water log not found');
};

/** Water drunk on the user's current local day, in ml. */
const consumedToday = async (userId: string, timezone: string, now: Date) => {
    const { from, to } = localDayRange(localDate(timezone, now), timezone);
    const { _sum } = await prisma.water_Log.aggregate({
        where: { userId, drankAt: { gte: from, lt: to } },
        _sum: { amountMl: true }
    });
    return _sum.amountMl ?? 0;
};

/**
 * Sends a reminder push to every user whose reminder slot is due (see `dueReminder`) and who
 * hasn't reached today's goal. Run by the scheduler every 15 minutes.
 *
 * One intake query per due user; fine for now, batch it if the user count grows a lot.
 */
export const sendWaterRemindersService = async (now = new Date()) => {
    const goals = await prisma.water_Goal.findMany({
        where: { remindersEnabled: true, user: { push_tokens: { some: {} } } },
        include: { user: { select: { push_tokens: { select: { token: true } } } } }
    });
    const due = goals.flatMap((goal) => {
        const reminder = dueReminder(goal, now);
        return reminder ? [{ goal, slotsLeft: reminder.slotsLeft }] : [];
    });
    if (due.length === 0) return { due: 0, sent: 0 };

    // Marked first, so an overlapping run can't send the same slot again
    await prisma.water_Goal.updateMany({
        where: { userId: { in: due.map(({ goal }) => goal.userId) } },
        data: { lastReminderAt: now }
    });

    const perUser = await Promise.all(
        due.map(async ({ goal, slotsLeft }): Promise<PushMessage[]> => {
            const consumed = await consumedToday(goal.userId, goal.timezone, now);
            if (consumed >= goal.dailyGoalMl) return [];
            const content = waterReminderMessage(goal.dailyGoalMl, consumed, slotsLeft);
            return goal.user.push_tokens.map(({ token }) => ({
                to: token,
                ...content,
                sound: 'default',
                data: { type: 'water-reminder', url: '/water' }
            }));
        })
    );
    const { sent } = await deliverPush(perUser.flat());
    return { due: due.length, sent };
};
