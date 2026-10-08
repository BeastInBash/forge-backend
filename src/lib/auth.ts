import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { openAPI } from 'better-auth/plugins';
import { expo } from '@better-auth/expo';

import prisma from './db';
import { env } from './env';

const isDev = env.NODE_ENV !== 'production';

// Google is switched on once both keys are set in .env, so the app's Google button
// returns a clear "provider not found" error until then instead of crashing the server.
const google =
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
              google: {
                  clientId: env.GOOGLE_CLIENT_ID,
                  clientSecret: env.GOOGLE_CLIENT_SECRET,
                  prompt: 'select_account' as const
              }
          }
        : undefined;

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'postgresql'
    }),
    emailAndPassword: {
        enabled: true
    },
    socialProviders: google,
    user: {
        additionalFields: {
            // Sent with every session so the app can route a new user to onboarding without an
            // extra request. Only PUT /api/v1/profile/onboarding sets it.
            onboardedAt: { type: 'date', required: false, input: false }
        }
    },
    trustedOrigins: [
        // The Forge app's deep-link scheme (app.json "scheme"); the Expo plugin sends it as the origin.
        'forge://',
        // Browser origins (Expo web) are already listed for CORS.
        ...env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
        // Expo Go and dev-client URLs while developing.
        ...(isDev ? ['exp://', 'exp://**'] : [])
    ],
    plugins: [
        // Lets the native app authenticate: maps its `expo-origin` header to `origin` and
        // hands the session back to the app after social sign-in.
        expo(),
        // Exposes /api/auth/open-api/generate-schema, merged into /docs (src/docs).
        // Scalar is served by our own /docs route, so Better Auth's page is disabled.
        ...(isDev ? [openAPI({ disableDefaultReference: true })] : [])
    ],
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL
});
