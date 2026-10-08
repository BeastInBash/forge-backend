import { z } from 'zod';
import { createDocument, type ZodOpenApiResponsesObject } from 'zod-openapi';
import { auth } from '../lib/auth';
import { env } from '../lib/env';
import {
    createExercisesBodySchema,
    exerciseIdParamsSchema,
    workoutBodySchema,
    workoutIdParamsSchema
} from '../common/zodSchema/workoutSchema';
import {
    liftBodySchema,
    liftExerciseParamsSchema,
    liftIdParamsSchema
} from '../common/zodSchema/liftSchema';
import {
    errorResponseSchema,
    exerciseResponseSchema,
    exerciseSummarySchema,
    liftHistorySchema,
    liftResponseSchema,
    liftSummarySchema,
    meResponseSchema,
    profileResponseSchema,
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
            { name: 'Profile', description: 'The signed-in user' },
            { name: 'Workouts', description: 'Workout plans' },
            { name: 'Exercises', description: 'Exercise catalog' },
            { name: 'Lifts', description: 'Logged sets and progress per exercise' }
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
            '/api/v1/profile': {
                get: {
                    tags: ['Profile'],
                    summary: 'Signed-in user profile',
                    description:
                        'The user record with linked sign-in methods, active sessions and activity counts. Tokens and password hashes are never included.',
                    security: sessionSecurity,
                    responses: {
                        '200': {
                            description: 'Profile',
                            content: {
                                'application/json': {
                                    schema: successResponse(
                                        profileResponseSchema,
                                        'ProfileResponse'
                                    )
                                }
                            }
                        },
                        '401': errorResponse('No valid session cookie'),
                        '404': errorResponse('The session belongs to a deleted user'),
                        '500': errorResponse('Unexpected server error')
                    }
                }
            },
            '/api/v1/workout': {
                get: {
                    tags: ['Workouts'],
                    summary: "List the user's workout plans",
                    description: 'One plan per weekday at most, Monday first, exercises in order.',
                    security: sessionSecurity,
                    responses: {
                        '200': {
                            description: 'The plans',
                            content: {
                                'application/json': {
                                    schema: successResponse(
                                        z.array(workoutPlanResponseSchema),
                                        'ListWorkoutsResponse'
                                    )
                                }
                            }
                        },
                        '401': errorResponse('No valid session cookie'),
                        '500': errorResponse('Unexpected server error')
                    }
                }
            },
            '/api/v1/workout/{workoutId}': {
                put: {
                    tags: ['Workouts'],
                    summary: 'Replace a workout plan',
                    description:
                        "Same body as create; the plan's day, time, muscle group and exercises are replaced. Moving it to a day that already has a plan is a 409.",
                    security: sessionSecurity,
                    requestParams: { path: workoutIdParamsSchema },
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: workoutBodySchema } }
                    },
                    responses: {
                        '200': {
                            description: 'Plan updated',
                            content: {
                                'application/json': {
                                    schema: successResponse(
                                        workoutPlanResponseSchema,
                                        'UpdateWorkoutResponse'
                                    )
                                }
                            }
                        },
                        ...commonErrors,
                        '404': errorResponse('No plan with that id belongs to this user'),
                        '403': errorResponse('A new exercise name was sent by a non-admin'),
                        '409': errorResponse('Another plan already uses that day')
                    }
                },
                delete: {
                    tags: ['Workouts'],
                    summary: 'Delete a workout plan',
                    security: sessionSecurity,
                    requestParams: { path: workoutIdParamsSchema },
                    responses: {
                        '200': {
                            description: 'Plan deleted',
                            content: {
                                'application/json': {
                                    schema: successResponse(z.null(), 'DeleteWorkoutResponse')
                                }
                            }
                        },
                        ...commonErrors,
                        '404': errorResponse('No plan with that id belongs to this user')
                    }
                }
            },
            '/api/v1/workout/create-workout': {
                post: {
                    tags: ['Workouts'],
                    summary: 'Create a workout plan',
                    description:
                        'Each exercise is either a catalog pick (`exerciseId`) or, for admins only, a new one (`exercise_name`); new names are added to the catalog, or matched to an existing entry case-insensitively. The same exercise may appear only once per plan.',
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
                        ...commonErrors,
                        '403': errorResponse('A new exercise name was sent by a non-admin'),
                        '409': errorResponse('You already have a plan for that day')
                    }
                }
            },
            '/api/v1/lifts': {
                get: {
                    tags: ['Lifts'],
                    summary: 'Progress per exercise',
                    description:
                        'One summary per exercise the user has logged, most recently trained first.',
                    security: sessionSecurity,
                    responses: {
                        '200': {
                            description: 'The summaries',
                            content: {
                                'application/json': {
                                    schema: successResponse(
                                        z.array(liftSummarySchema),
                                        'ListLiftSummariesResponse'
                                    )
                                }
                            }
                        },
                        '401': errorResponse('No valid session cookie'),
                        '500': errorResponse('Unexpected server error')
                    }
                },
                post: {
                    tags: ['Lifts'],
                    summary: 'Log a lift',
                    description: 'The sets performed for one exercise in one session, in order.',
                    security: sessionSecurity,
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: liftBodySchema } }
                    },
                    responses: {
                        '201': {
                            description: 'Lift logged',
                            content: {
                                'application/json': {
                                    schema: successResponse(liftResponseSchema, 'LogLiftResponse')
                                }
                            }
                        },
                        ...commonErrors
                    }
                }
            },
            '/api/v1/lifts/exercise/{exerciseId}': {
                get: {
                    tags: ['Lifts'],
                    summary: "An exercise's lift history",
                    description: 'Every logged session of the exercise, oldest first.',
                    security: sessionSecurity,
                    requestParams: { path: liftExerciseParamsSchema },
                    responses: {
                        '200': {
                            description: 'The history',
                            content: {
                                'application/json': {
                                    schema: successResponse(
                                        liftHistorySchema,
                                        'LiftHistoryResponse'
                                    )
                                }
                            }
                        },
                        ...commonErrors,
                        '404': errorResponse('No exercise with that id')
                    }
                }
            },
            '/api/v1/lifts/{liftId}': {
                delete: {
                    tags: ['Lifts'],
                    summary: 'Delete a logged lift',
                    security: sessionSecurity,
                    requestParams: { path: liftIdParamsSchema },
                    responses: {
                        '200': {
                            description: 'Lift deleted',
                            content: {
                                'application/json': {
                                    schema: successResponse(z.null(), 'DeleteLiftResponse')
                                }
                            }
                        },
                        ...commonErrors,
                        '404': errorResponse('No lift with that id belongs to this user')
                    }
                }
            },
            '/api/v1/exercise': {
                get: {
                    tags: ['Exercises'],
                    summary: 'List the exercise catalog',
                    description: 'Every exercise, alphabetically, with its image URL.',
                    security: sessionSecurity,
                    responses: {
                        '200': {
                            description: 'The catalog',
                            content: {
                                'application/json': {
                                    schema: successResponse(
                                        z.array(exerciseSummarySchema),
                                        'ListExercisesResponse'
                                    )
                                }
                            }
                        },
                        '401': errorResponse('No valid session cookie'),
                        '500': errorResponse('Unexpected server error')
                    }
                },
                post: {
                    tags: ['Exercises'],
                    summary: 'Add an exercise with its image',
                    description:
                        'Multipart form with `exercise_name` and `image` (PNG, JPEG or WebP, max 4 MB). The name is checked for duplicates (ignoring case) before the image is uploaded to Cloudinary.',
                    security: sessionSecurity,
                    requestBody: {
                        required: true,
                        content: {
                            'multipart/form-data': {
                                schema: {
                                    type: 'object',
                                    required: ['exercise_name', 'image'],
                                    properties: {
                                        exercise_name: {
                                            type: 'string',
                                            minLength: 1,
                                            maxLength: 100
                                        },
                                        image: { type: 'string', format: 'binary' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Exercise created',
                            content: {
                                'application/json': {
                                    schema: successResponse(
                                        exerciseResponseSchema,
                                        'CreateExerciseResponse'
                                    )
                                }
                            }
                        },
                        ...commonErrors,
                        '403': errorResponse('Only admins can change the catalog'),
                        '409': errorResponse('An exercise with that name already exists'),
                        '413': errorResponse('Image is larger than 4 MB'),
                        '502': errorResponse('Cloudinary rejected the upload'),
                        '503': errorResponse('CLOUDINARY_URL is not set on the server')
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
                        '403': errorResponse('Only admins can change the catalog'),
                        '409': errorResponse('An exercise with that name already exists')
                    }
                }
            },
            '/api/v1/exercise/{exerciseId}/image': {
                put: {
                    tags: ['Exercises'],
                    summary: "Upload or replace an exercise's image",
                    description:
                        'Multipart upload in the `image` field (PNG, JPEG or WebP, max 4 MB). The original is stored on Cloudinary unchanged and `exercise_icon` is set to its URL; add transformations such as `f_auto,q_auto,w_192,h_192,c_fill` after `/upload/` in that URL to get a resized AVIF/WebP.',
                    security: sessionSecurity,
                    requestParams: { path: exerciseIdParamsSchema },
                    requestBody: {
                        required: true,
                        content: {
                            'multipart/form-data': {
                                schema: {
                                    type: 'object',
                                    required: ['image'],
                                    properties: { image: { type: 'string', format: 'binary' } }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Image uploaded; the updated exercise',
                            content: {
                                'application/json': {
                                    schema: successResponse(
                                        exerciseResponseSchema,
                                        'ExerciseImageResponse'
                                    )
                                }
                            }
                        },
                        ...commonErrors,
                        '403': errorResponse('Only admins can change the catalog'),
                        '404': errorResponse('No exercise with that id'),
                        '413': errorResponse('Image is larger than 4 MB'),
                        '503': errorResponse('CLOUDINARY_URL is not set on the server')
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
