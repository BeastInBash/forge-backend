import { z } from 'zod';
import { createDocument, type ZodOpenApiResponsesObject } from 'zod-openapi';
import { auth } from '../lib/auth';
import { env } from '../lib/env';
import { createExercisesBodySchema, workoutBodySchema } from '../common/zodSchema/workoutSchema';
import {
    errorResponseSchema,
    exerciseResponseSchema,
    meResponseSchema,
    successResponse,
    workoutPlanResponseSchema
} from './schemas';

const AUTH_BASE_PATH = '/api/auth';

type OpenApiDocument = ReturnType<typeof createDocument>;
type PathsObject = NonNullable<OpenApiDocument['paths']>;
type PathItemObject = PathsObject[string];

const errorResponse = (description: string) => ({
    description,
    content: { 'application/json': { schema: errorResponseSchema } }
});

/** Errors every authenticated, body-validated route can return. */
const commonErrors: ZodOpenApiResponsesObject = {
    '400': errorResponse('Validation failed or malformed JSON'),
    '401': errorResponse('No valid session cookie'),
    '500': errorResponse('Unexpected server error')
};

const sessionSecurity = [{ sessionCookie: [] }];

const createAppDocument = () =>
    createDocument({
        openapi: '3.1.0',
        info: {
            title: 'Forge API',
            version: '1.0.0',
            description:
                'Forge backend API. Sign in through the Auth endpoints first — the session cookie is then sent automatically with "Try it" requests.'
        },
        // Relative, so "Try it" calls whichever origin is serving the docs
        servers: [{ url: '/', description: 'This server' }],
        tags: [
            { name: 'System', description: 'Health and session helpers' },
            { name: 'Workouts', description: 'Workout plans' },
            { name: 'Exercises', description: 'Exercise catalog' }
        ],
        components: {
            securitySchemes: {
                sessionCookie: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'better-auth.session_token',
                    description: 'Session cookie set by Better Auth on sign-in'
                }
            }
        },
        paths: {
            '/health': {
                get: {
                    tags: ['System'],
                    summary: 'Health check',
                    responses: {
                        '200': {
                            description: 'Server is up',
                            content: { 'text/plain': { schema: { type: 'string' } } }
                        }
                    }
                }
            },
            '/api/me': {
                get: {
                    tags: ['System'],
                    summary: 'Current session',
                    description:
                        'Returns the signed-in user and session, or `null` when signed out.',
                    responses: {
                        '200': {
                            description: 'Session or null',
                            content: { 'application/json': { schema: meResponseSchema } }
                        }
                    }
                }
            },
            '/api/v1/workout/create-workout': {
                post: {
                    tags: ['Workouts'],
                    summary: 'Create a workout plan',
                    description:
                        'Each exercise is either a catalog pick (`exerciseId`) or a new one (`exercise_name`); new names are added to the catalog, or matched to an existing entry case-insensitively. The same exercise may appear only once per plan.',
                    security: sessionSecurity,
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: workoutBodySchema } }
                    },
                    responses: {
                        '201': {
                            description: 'Plan created',
                            content: {
                                'application/json': {
                                    schema: successResponse(
                                        workoutPlanResponseSchema,
                                        'CreateWorkoutResponse'
                                    )
                                }
                            }
                        },
                        ...commonErrors
                    }
                }
            },
            '/api/v1/exercise/create-exercises': {
                post: {
                    tags: ['Exercises'],
                    summary: 'Add exercises to the catalog',
                    description: 'Names must be unique, ignoring case and surrounding spaces.',
                    security: sessionSecurity,
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: createExercisesBodySchema } }
                    },
                    responses: {
                        '201': {
                            description: 'Exercises created',
                            content: {
                                'application/json': {
                                    schema: successResponse(
                                        z.array(exerciseResponseSchema),
                                        'CreateExercisesResponse'
                                    )
                                }
                            }
                        },
                        ...commonErrors,
                        '409': errorResponse('An exercise with that name already exists')
                    }
                }
            }
        }
    });

/**
 * Better Auth's own spec (from its openAPI plugin), with paths prefixed by the
 * auth base path and every operation grouped under one "Auth" tag.
 */
const fetchAuthDocument = async (): Promise<OpenApiDocument> => {
    const response = await auth.handler(
        new Request(
            new URL(`${AUTH_BASE_PATH}/open-api/generate-schema`, env.BETTER_AUTH_URL).toString()
        )
    );
    if (!response.ok) {
        throw new Error(`Better Auth schema request failed with ${response.status}`);
    }
    return (await response.json()) as OpenApiDocument;
};

const mergeAuthDocument = (app: OpenApiDocument, authDoc: OpenApiDocument): OpenApiDocument => {
    const authPaths: PathsObject = {};
    for (const [path, item] of Object.entries(authDoc.paths ?? {})) {
        const pathItem: PathItemObject = { ...item };
        for (const method of ['get', 'put', 'post', 'delete', 'patch'] as const) {
            const operation = pathItem[method];
            if (operation) pathItem[method] = { ...operation, tags: ['Auth'] };
        }
        authPaths[`${AUTH_BASE_PATH}${path}`] = pathItem;
    }

    return {
        ...app,
        tags: [
            { name: 'Auth', description: 'Sign up, sign in and session management (Better Auth)' },
            ...(app.tags ?? [])
        ],
        paths: { ...authPaths, ...app.paths },
        components: {
            ...app.components,
            // App definitions win on a name clash
            schemas: { ...authDoc.components?.schemas, ...app.components?.schemas },
            securitySchemes: {
                ...authDoc.components?.securitySchemes,
                ...app.components?.securitySchemes
            }
        }
    };
};

let cachedDocument: OpenApiDocument | undefined;

/** Builds the merged document once and reuses it; falls back to app routes only if Better Auth's spec is unavailable. */
export const getOpenApiDocument = async (): Promise<OpenApiDocument> => {
    if (cachedDocument) return cachedDocument;

    const appDocument = createAppDocument();
    try {
        cachedDocument = mergeAuthDocument(appDocument, await fetchAuthDocument());
    } catch (error) {
        console.warn(
            'OpenAPI: serving app routes only, could not load the Better Auth schema:',
            error
        );
        return appDocument;
    }
    return cachedDocument;
};
