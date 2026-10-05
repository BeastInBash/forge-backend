import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import ApiError from '../libs/ApiError';
import { Prisma } from '../../generated/prisma/client';
import { env } from '../../lib/env';

/** Maps Prisma's known request errors onto HTTP errors; anything else stays unknown. */
const fromPrismaError = (err: Prisma.PrismaClientKnownRequestError): ApiError | undefined => {
    switch (err.code) {
        case 'P2002':
            return ApiError.conflict('Resource already exists');
        case 'P2003':
            return ApiError.badRequest('Referenced resource does not exist');
        case 'P2025':
            return ApiError.notFound('Resource not found');
        default:
            return undefined;
    }
};

const toApiError = (err: unknown): ApiError | undefined => {
    if (err instanceof ApiError) return err;
    if (err instanceof ZodError) {
        return ApiError.badRequest(
            'Validation failed',
            err.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }))
        );
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) return fromPrismaError(err);
    // Malformed JSON bodies from express.json()
    if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
        return ApiError.badRequest('Malformed JSON body');
    }
    return undefined;
};

/** Catches requests that matched no route. Mount after all routers. */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
    next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

/** Global error handler. Must be mounted last and keep all four parameters. */
export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const apiError = toApiError(err);
    if (apiError) {
        return res.status(apiError.statusCode).json({
            success: false,
            message: apiError.message,
            ...(apiError.errors && { errors: apiError.errors })
        });
    }

    console.error({
        error: err instanceof Error ? err.message : err,
        stack: err instanceof Error ? err.stack : undefined,
        method: req.method,
        url: req.originalUrl
    });

    // Don't leak internals in production
    const message =
        env.NODE_ENV === 'production' || !(err instanceof Error)
            ? 'Internal server error'
            : err.message;
    return res.status(500).json({ success: false, message });
};
