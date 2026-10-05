import { describe, expect, test } from 'bun:test';
import ApiError from './ApiError';

describe('ApiError', () => {
    test('is an Error with a status code', () => {
        const err = new ApiError(418, 'teapot');
        expect(err).toBeInstanceOf(Error);
        expect(err.statusCode).toBe(418);
        expect(err.message).toBe('teapot');
    });

    test('badRequest defaults to 400', () => {
        const err = ApiError.badRequest();
        expect(err.statusCode).toBe(400);
        expect(err.message).toBe('Bad Request');
    });

    test('notFound defaults to 404', () => {
        expect(ApiError.notFound().statusCode).toBe(404);
    });

    test('forbidden carries a custom message and 403', () => {
        const err = ApiError.forbidden('nope');
        expect(err.statusCode).toBe(403);
        expect(err.message).toBe('nope');
    });

    test('unauthorized defaults to 401', () => {
        expect(ApiError.unauthorized().statusCode).toBe(401);
    });

    test('conflict defaults to 409', () => {
        expect(ApiError.conflict().statusCode).toBe(409);
    });

    test('badRequest carries field errors', () => {
        const err = ApiError.badRequest('Validation failed', [
            { field: 'day', message: 'Required' }
        ]);
        expect(err.errors).toEqual([{ field: 'day', message: 'Required' }]);
    });
});
