import 'dotenv/config'
import z from 'zod'

const envSchema = z.object({
    NODE_ENV: z.enum(["Development", "Production"]).default("Development"),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string(),
    BETTER_AUTH_SECRET: z.string(),
    BETTER_AUTH_URL: z.string(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),

})

function createEnv(env: NodeJS.ProcessEnv) {
    const safeParsed = envSchema.safeParse(env);
    if (!safeParsed.success) throw new Error(safeParsed.error.message)
    return safeParsed.data
}

export const env = createEnv(process.env);
