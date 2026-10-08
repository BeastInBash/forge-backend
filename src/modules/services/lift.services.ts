import prisma from '../../lib/db';
import ApiError from '../../common/libs/ApiError';
import { bestSet, estimateOneRepMax } from '../../common/utils/liftMetrics';
import type { LiftBodyInput } from '../../common/zodSchema/liftSchema';
import type { Prisma } from '../../generated/prisma/client';

/** How many recent sessions each summary carries for its sparkline. */
const TREND_LENGTH = 12;

const exerciseSelect = {
    id: true,
    exercise_name: true,
    exercise_icon: true
} satisfies Prisma.ExerciseSelect;

/** What a lift returns: its sets in order. */
const liftInclude = {
    sets: { orderBy: { order: 'asc' }, select: { id: true, weight: true, reps: true, order: true } }
} satisfies Prisma.Lift_LogInclude;

type LiftWithSets = Prisma.Lift_LogGetPayload<{ include: typeof liftInclude }>;

/** The number a session is charted by: best estimated max, or best reps for bodyweight. */
const sessionScore = (lift: LiftWithSets) => {
    const top = bestSet(lift.sets);
    if (!top) return 0;
    return top.weight === null ? top.reps : Math.round(estimateOneRepMax(top) * 10) / 10;
};

/**
 * One row per exercise the user has logged, most recently trained first: session count, the
 * latest session, the all-time best set and a short trend for a sparkline.
 *
 * Reads every log the user has and groups in memory; a lifter logs a few thousand rows over
 * years, which is fine. Move to a grouped query if that stops being true.
 */
export const listLiftSummariesService = async (userId: string) => {
    const lifts = await prisma.lift_Log.findMany({
        where: { userId },
        include: { ...liftInclude, exercise: { select: exerciseSelect } },
        orderBy: { performedAt: 'asc' }
    });

    const byExercise = new Map<string, typeof lifts>();
    for (const lift of lifts) {
        const group = byExercise.get(lift.exerciseId);
        if (group) group.push(lift);
        else byExercise.set(lift.exerciseId, [lift]);
    }

    return [...byExercise.values()]
        .map((group) => {
            const last = group[group.length - 1]!;
            const top = bestSet(
                group.flatMap((lift) =>
                    lift.sets.map((set) => ({ ...set, performedAt: lift.performedAt }))
                )
            );
            const { exercise, ...lastLift } = last;
            return {
                exercise,
                sessions: group.length,
                last: lastLift,
                best: top
                    ? { weight: top.weight, reps: top.reps, performedAt: top.performedAt }
                    : null,
                trend: group.slice(-TREND_LENGTH).map(sessionScore)
            };
        })
        .toSorted((a, b) => b.last.performedAt.getTime() - a.last.performedAt.getTime());
};

/** Every logged session of one exercise, oldest first. */
export const listExerciseLiftsService = async (userId: string, exerciseId: string) => {
    const [exercise, lifts] = await Promise.all([
        prisma.exercise.findUnique({ where: { id: exerciseId }, select: exerciseSelect }),
        prisma.lift_Log.findMany({
            where: { userId, exerciseId },
            include: liftInclude,
            orderBy: { performedAt: 'asc' }
        })
    ]);
    if (!exercise) throw ApiError.notFound('Exercise not found');
    return { exercise, lifts };
};

export const createLiftService = async (body: LiftBodyInput, userId: string) => {
    const exists = await prisma.exercise.count({ where: { id: body.exerciseId } });
    if (!exists) throw ApiError.badRequest('That exercise does not exist');
    return prisma.lift_Log.create({
        data: {
            performedAt: body.performedAt,
            note: body.note || null,
            user: { connect: { id: userId } },
            exercise: { connect: { id: body.exerciseId } },
            sets: { create: body.sets.map((set, order) => ({ ...set, order })) }
        },
        include: liftInclude
    });
};

export const deleteLiftService = async (liftId: string, userId: string) => {
    // Scoped to the owner, so another user's id reads as "not found"
    const { count } = await prisma.lift_Log.deleteMany({ where: { id: liftId, userId } });
    if (count === 0) throw ApiError.notFound('Lift not found');
};
