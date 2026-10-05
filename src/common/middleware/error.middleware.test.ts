import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import express from 'express';
import type { Server } from 'http';
import { z } from 'zod';
import ApiError from '../libs/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { errorHandler, notFoundHandler } from './error.middleware';
import { validateBody } from './validate.middleware';

type ErrorBody = {
    success: boolean;
    message: string;
    errors?: { field: string; message: string }[];
};

let server: Server;
let baseUrl: string;

beforeAll(() => {
    const app = express();
    app.use(express.json());
    app.post('/validate', validateBody(z.strictObject({ day: z.string().min(1) })), (req, res) => {
        res.json(req.body);
    });
    app.get(
        '/api-error',
        asyncHandler(async () => {
            throw ApiError.conflict('taken');
        })
    );
    app.get(
        '/crash',
        asyncHandler(async () => {
            throw new Error('boom');
        })
    );
    app.use(notFoundHandler);
    app.use(errorHandler);
    server = app.listen(0);
    const address = server.address();
    baseUrl = `http://localhost:${typeof address === 'object' && address ? address.port : 0}`;
});

afterAll(() => {
    server.close();
});

const post = (path: string, body: unknown) =>
    fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
    });

describe('validateBody + errorHandler', () => {
    test('passes the parsed body through', async () => {
        const res = await post('/validate', { day: 'monday' });
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ day: 'monday' });
    });

    test('turns a ZodError into a 400 with field errors', async () => {
        const res = await post('/validate', { day: '' });
        expect(res.status).toBe(400);
        const body = (await res.json()) as ErrorBody;
        expect(body.success).toBe(false);
        expect(body.errors?.[0]?.field).toBe('day');
    });

    test('uses the ApiError status code from an async handler', async () => {
        const res = await fetch(`${baseUrl}/api-error`);
        expect(res.status).toBe(409);
        expect(await res.json()).toEqual({ success: false, message: 'taken' });
    });

    test('returns a JSON 500 for unexpected errors', async () => {
        const originalError = console.error;
        console.error = () => {};
        const res = await fetch(`${baseUrl}/crash`);
        console.error = originalError;
        expect(res.status).toBe(500);
        expect(((await res.json()) as ErrorBody).success).toBe(false);
    });

    test('returns a JSON 404 for unknown routes', async () => {
        const res = await fetch(`${baseUrl}/missing`);
        expect(res.status).toBe(404);
    });
});
