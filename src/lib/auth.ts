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
    account: {
        // The OAuth state is stored in the verification table (single use, 10-minute expiry) and
        // also mirrored in a 5-minute browser cookie. The app's sign-in runs in a Custom Tab /
        // auth session, where that cookie is often missing by the time Google redirects back
        // (a slow sign-in outlives it, or the flow finishes in another browser context), and
        // every such sign-in failed with `state_mismatch`. The database check still rejects
        // unknown, reused and expired states.
        skipStateCookieCheck: true,
        accountLinking: {
            // Sign-up never verifies email, so every email-and-password account is unverified and,
            // by default, Google sign-in with the same address failed with `account_not_linked`.
            // Google vouches for the address, so link it; the hook below makes that safe.
            requireLocalEmailVerified: false
        }
    },
    databaseHooks: {
        account: {
            create: {
                /**
                 * Runs when Google is linked to an existing user, before Better Auth marks the
                 * email verified. If the email was never verified, whoever set the password never
                 * proved they own the address — it may have been registered in advance by someone
                 * else. Drop the password login and every open session, so the Google sign-in
                 * that proves ownership is the only way in.
                 */
                after: async (account) => {
                    if (account.providerId === 'credential') return;
                    const user = await prisma.user.findUnique({
                        where: { id: account.userId },
                        select: { emailVerified: true }
                    });
                    if (!user || user.emailVerified) return;
                    await prisma.$transaction([
                        prisma.account.deleteMany({
                            where: { userId: account.userId, providerId: 'credential' }
                        }),
                        prisma.session.deleteMany({ where: { userId: account.userId } })
                    ]);
                }
            }
        }
    },
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
