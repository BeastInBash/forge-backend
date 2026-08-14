import express from 'express'
import { env } from '../lib/env';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import cors from 'cors'
import { auth } from '../lib/auth';
export const createApplication = () => {
    const app = express();
    app.use(
        cors({
            origin: "http://localhost:3000", // Replace with your frontend's origin
            methods: ["GET", "POST", "PUT", "DELETE"], // Specify allowed HTTP methods
            credentials: true, // Allow credentials (cookies, authorization headers, etc.)
        })
    );
    app.all("/api/auth/*splat", toNodeHandler(auth))
    app.use(express.json())
    app.get('/api/me', async (req, res) => {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers)
        })
        return res.json(session)
    })
    app.get('/health', (req, res) => {
        res.send(`Server Listening on PORT ${env.PORT}`)
    })
    return app
}
