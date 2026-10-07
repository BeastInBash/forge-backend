import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

/**
 * Validates `req.body` against a Zod schema and replaces it with the parsed
 * (trimmed, stripped) value. A ZodError is forwarded to the global error
 * handler, which turns it into a 400 with per-field messages.
 */
export const validateBody = (schema: ZodType) => {
    return async (req: Request, _res: Response, next: NextFunction) => {
        try {
            req.body = await schema.parseAsync(req.body);
            next();
        } catch (error) {
            next(error);
        }
    };
};

/** Like `validateBody`, for route params (`/:exerciseId` and the like). */
export const validateParams = (schema: ZodType) => {
    return async (req: Request, _res: Response, next: NextFunction) => {
        try {
            req.params = (await schema.parseAsync(req.params)) as Request['params'];
            next();
        } catch (error) {
            next(error);
        }
    };
};
