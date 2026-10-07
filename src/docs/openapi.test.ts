import { describe, expect, test } from 'bun:test';
import { getOpenApiDocument } from './openapi';

describe('OpenAPI document', () => {
    test('includes app routes and the merged Better Auth routes', async () => {
        const doc = await getOpenApiDocument();
        const paths = Object.keys(doc.paths ?? {});
        expect(paths).toContain('/api/v1/workout/create-workout');
        expect(paths).toContain('/api/v1/exercise/create-exercises');
        expect(paths).toContain('/api/v1/profile');
        expect(paths).toContain('/api/v1/exercise');
        expect(paths).toContain('/api/v1/exercise/{exerciseId}/image');
        expect(paths).toContain('/api/auth/sign-in/email');
    });

    test('has no dangling component references', async () => {
        const doc = await getOpenApiDocument();
        const components = (doc.components ?? {}) as Record<string, Record<string, unknown>>;
        const refs = JSON.stringify(doc).matchAll(/"#\/components\/(\w+)\/(\w+)"/g);
        for (const [, section, name] of refs) {
            expect(components[section!]?.[name!], `${section}/${name}`).toBeDefined();
        }
    });
});
