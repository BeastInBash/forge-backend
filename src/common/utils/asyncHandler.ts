import type { NextFunction, Request, Response } from 'express';

/**
 * Forwards a rejected promise from an async handler to `next()` so the global
 * error handler sees it, instead of leaving an unhandled rejection.
 */
export const asyncHandler = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await fn(req, res, next);
        } catch (error) {
            next(error);
        }
    };
};
