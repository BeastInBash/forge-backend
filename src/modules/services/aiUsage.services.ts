import prisma from '../../lib/db';
import { env } from '../../lib/env';
import { checkAiLimit, DAY_MS, type AiLimitDecision } from '../../common/utils/aiRateLimit';

export type AiFeature = 'meal_analyze' | 'meal_create' | 'meal_photo';

/**
 * Records one AI call for the user if it fits their hourly and daily limits. The count and the
 * insert run under a per-user lock, so two requests at once can't both take the last slot.
 * The call is counted before the AI runs, so failed calls (which still cost) count too.
 */
export const reserveAiCall = (userId: string, feature: AiFeature): Promise<AiLimitDecision> =>
    prisma.$transaction(async (tx) => {
        // Held until the transaction ends; other users' requests aren't blocked
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;

        const now = new Date();
        const recent = await tx.ai_Usage.findMany({
            where: { userId, createdAt: { gt: new Date(now.getTime() - DAY_MS) } },
            select: { createdAt: true }
        });
        const decision = checkAiLimit(
            recent.map((call) => call.createdAt),
            now,
            { perHour: env.AI_LIMIT_PER_HOUR, perDay: env.AI_LIMIT_PER_DAY }
        );
        if (decision.allowed) {
            await tx.ai_Usage.create({ data: { userId, feature, createdAt: now } });
        }
        return decision;
    });
