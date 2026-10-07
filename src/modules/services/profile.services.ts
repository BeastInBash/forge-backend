import prisma from '../../lib/db';
import ApiError from '../../common/libs/ApiError';

/**
 * Everything stored about the signed-in user, for the profile screen. Account and session rows
 * are reduced to what's safe to show: no tokens, password hashes or session tokens leave here.
 */
export const getProfileService = async (userId: string, currentSessionId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            bio: true,
            emailVerified: true,
            image: true,
            createdAt: true,
            updatedAt: true,
            accounts: {
                select: { providerId: true, createdAt: true },
                orderBy: { createdAt: 'asc' }
            },
            sessions: {
                where: { expiresAt: { gt: new Date() } },
                select: {
                    id: true,
                    createdAt: true,
                    updatedAt: true,
                    expiresAt: true,
                    ipAddress: true,
                    userAgent: true
                },
                orderBy: { updatedAt: 'desc' }
            },
            _count: { select: { workout_plan: true, exercises: true } }
        }
    });
    if (!user) throw ApiError.notFound('User not found');

    const { accounts, sessions, _count, ...profile } = user;
    return {
        ...profile,
        accounts,
        sessions: sessions.map(({ id, ...session }) =>
            Object.assign(session, { current: id === currentSessionId })
        ),
        stats: { workoutPlans: _count.workout_plan, exercisesCreated: _count.exercises }
    };
};
