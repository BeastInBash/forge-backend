import express from 'express';
import { env } from '../lib/env';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import cors from 'cors';
import { auth } from '../lib/auth';
import workoutRouter from '../modules/routes/workouts';
import exerciseRoute from '../modules/routes/exercise';
import profileRouter from '../modules/routes/profile';
import docsRouter from '../docs/docs.routes';
import { asyncHandler } from '../common/utils/asyncHandler';
import { errorHandler, notFoundHandler } from '../common/middleware/error.middleware';
export const createApplication = () => {
    const app = express();
    app.use(
        cors({
            origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
            credentials: true // Allow credentials (cookies, authorization headers, etc.)
        })
    );
    // Better Auth must be mounted before express.json()
    app.all('/api/auth/*splat', toNodeHandler(auth));
    app.use(express.json());
    app.get(
        '/api/me',
        asyncHandler(async (req, res) => {
            const session = await auth.api.getSession({
                headers: fromNodeHeaders(req.headers)
            });
            return res.json(session);
        })
    );
    app.get('/health', (req, res) => {
        res.send(`Server Listening on PORT ${env.PORT}`);
    });
    app.use('/api/v1/workout', workoutRouter);
    app.use('/api/v1/exercise', exerciseRoute);
    app.use('/api/v1/profile', profileRouter);
    // Scalar UI at /docs and the spec at /openapi.json — not exposed in production
    if (env.NODE_ENV !== 'production') {
        app.use(docsRouter);
    }

    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
};
