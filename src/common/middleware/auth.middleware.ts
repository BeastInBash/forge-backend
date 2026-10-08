import type { NextFunction, Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../../lib/auth';
import { env } from '../../lib/env';
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

const adminEmails = new Set(
    env.ADMIN_EMAILS.split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
);

/** True for the users listed in ADMIN_EMAILS. */
export const isAdmin = (session: AuthSession) => adminEmails.has(session.user.email.toLowerCase());

/** Lets only admins through; run after `requireAuth`. */
export const requireAdmin = (_req: Request, res: Response, next: NextFunction) => {
    if (!isAdmin(res.locals.session)) {
        return next(ApiError.forbidden('Only admins can change the exercise catalog'));
    }
    next();
};
