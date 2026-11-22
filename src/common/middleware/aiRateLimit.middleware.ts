import type { NextFunction, Request, Response } from 'express';
import ApiError from '../libs/ApiError';
import { formatWait } from '../utils/aiRateLimit';
import { reserveAiCall, type AiFeature } from '../../modules/services/aiUsage.services';

/**
 * Lets a request through only if the user has AI calls left; otherwise 429 with Retry-After.
 * Run after `requireAuth` and `validateBody`, so rejected requests don't use up a call.
 */
export const aiRateLimit =
    (feature: AiFeature) => async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const decision = await reserveAiCall(res.locals.session.session.userId, feature);
            if (decision.allowed) return next();
            res.setHeader('Retry-After', String(decision.retryAfterSec));
            next(
                new ApiError(
                    429,
                    `You've used all your AI meal estimates for now. Try again in ${formatWait(decision.retryAfterSec)}.`
                )
            );
        } catch (error) {
            next(error);
        }
    };
