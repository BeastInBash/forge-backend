import 'dotenv/config';
import z from 'zod';

const envSchema = z.object({
    // Lowercased so "Production" and "production" both work
    NODE_ENV: z.preprocess(
        (value) => (typeof value === 'string' ? value.toLowerCase() : value),
        z.enum(['development', 'production', 'test']).default('development')
    ),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string(),
    BETTER_AUTH_SECRET: z.string(),
    BETTER_AUTH_URL: z.string(),
    // Comma-separated list of allowed frontend origins
    CORS_ORIGIN: z.string().default('http://localhost:3000'),
    // Comma-separated emails of users who may add exercises to the catalog
    ADMIN_EMAILS: z.string().default('mohammadsaif0847@gmail.com'),
    // Optional until Google sign-in is enabled in src/lib/auth.ts
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    // cloudinary://<api_key>:<api_secret>@<cloud_name>; optional until image uploads are used
    CLOUDINARY_URL: z
        .string()
        .regex(
            /^cloudinary:\/\/[^:]+:[^@]+@.+$/,
            'Expected cloudinary://<api_key>:<api_secret>@<cloud_name>'
        )
        .optional()
});

function createEnv(env: NodeJS.ProcessEnv) {
    const safeParsed = envSchema.safeParse(env);
    if (!safeParsed.success) throw new Error(safeParsed.error.message);
    return safeParsed.data;
}

export const env = createEnv(process.env);
