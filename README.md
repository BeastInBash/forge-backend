# forge-backend

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run dev
```

## API docs

Outside production, the Scalar API reference is served at `/docs` and the raw
OpenAPI spec at `/openapi.json`. Request bodies come from the Zod schemas in
`src/common/zodSchema`; routes, responses and Better Auth merging live in
`src/docs/openapi.ts`. Add new routes there when you add them to a router.

## Deploying to Vercel

`vercel.json` runs `bun run vercel-build`, which generates the Prisma client and bundles
`src/index.ts` (the app as a default export, no `listen()`) into `dist/index.js` for Vercel's
Node runtime. Vercel's Express preset serves that file as a single function. `src/server.ts`
stays the local entrypoint.

1. Create a hosted Postgres (Neon, Supabase, …) and apply migrations from your machine:
   `DATABASE_URL=<pooled url> bun run db:deploy`.
2. Import the repo in Vercel and add these environment variables (Production and Preview):

   | Variable               | Value                                                                |
   | ---------------------- | -------------------------------------------------------------------- |
   | `DATABASE_URL`         | Pooled connection string; also needed at build for `prisma generate` |
   | `BETTER_AUTH_SECRET`   | `openssl rand -base64 32`                                            |
   | `BETTER_AUTH_URL`      | `https://<project>.vercel.app` (your production domain)              |
   | `CORS_ORIGIN`          | Browser origins allowed to call the API, comma-separated             |
   | `NODE_ENV`             | `production` (disables `/docs` and the OpenAPI plugin)               |
   | `GOOGLE_CLIENT_ID`     | Optional: enables Google sign-in                                     |
   | `GOOGLE_CLIENT_SECRET` | Optional: enables Google sign-in                                     |

3. In Google Cloud Console, add `https://<project>.vercel.app/api/auth/callback/google` as an
   authorised redirect URI. Preview deployments get new URLs, so Google sign-in only works on
   the production domain.
4. Point the app's `EXPO_PUBLIC_API_URL` at the same `https://<project>.vercel.app`.

Check a build locally with `bun run vercel-build`, then
`node -e 'import("./dist/index.js").then(m => m.default.listen(9099))'`.

This project was created using `bun init` in bun v1.3.14. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
