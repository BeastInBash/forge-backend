import type { NextFunction, Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../../lib/auth';
import ApiError from '../libs/ApiError';

type AuthSession = typeof auth.$Infer.Session;

declare global {
    // oxlint-disable-next-line typescript/no-namespace -- Express augmentation requires a namespace
    namespace Express {
        interface Locals {
            session: AuthSession;
        }
    }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers)
        });
        if (!session) {
            return next(ApiError.unauthorized());
        }
        res.locals.session = session;
        next();
    } catch (error) {
        next(error);
    }
};
