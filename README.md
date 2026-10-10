# forge-backend

The API behind [Forge](../Forge), a fitness app for workout plans and an exercise library. It is an
Express 5 app run on [Bun](https://bun.com), with PostgreSQL through Prisma 7, authentication through
[Better Auth](https://better-auth.com) and exercise images stored on Cloudinary.

## Stack

| Concern    | Tool                                                         |
| ---------- | ------------------------------------------------------------ |
| Runtime    | Bun (local dev, scripts, tests), Node on Vercel              |
| HTTP       | Express 5, `cors`, `multer` for image uploads                |
| Database   | PostgreSQL, Prisma 7 with the `pg` driver adapter            |
| Auth       | Better Auth (email + password, optional Google), Expo plugin |
| Validation | Zod 4 for env, request bodies and params                     |
| API docs   | `zod-openapi` + Scalar, served at `/docs` outside production |
| Images     | Cloudinary                                                   |
| Tooling    | oxlint, Prettier, Husky + lint-staged, commitlint            |

## Getting started

Prerequisites: Bun 1.3+, a PostgreSQL database, and optionally a Cloudinary account and a Google
OAuth client.

```bash
bun install
# create .env with the variables below
bun run db:migrate     # apply migrations and generate the Prisma client
bun run dev            # http://localhost:<PORT>, with hot reload
```

Check it is up with `GET /health`.

### Environment variables

`src/lib/env.ts` validates these on startup and refuses to boot if a required one is missing.

| Variable               | Required | Notes                                                                                             |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | yes      | Postgres connection string                                                                        |
| `BETTER_AUTH_SECRET`   | yes      | `openssl rand -base64 32`                                                                         |
| `BETTER_AUTH_URL`      | yes      | Public URL of this server. Must be reachable from the phone when testing Google sign-in           |
| `PORT`                 | no       | Defaults to `3000`                                                                                |
| `NODE_ENV`             | no       | `development` (default), `production` or `test`. `production` disables `/docs`                    |
| `CORS_ORIGIN`          | no       | Comma-separated browser origins, e.g. `http://localhost:8081` for Expo web. Native apps skip CORS |
| `GOOGLE_CLIENT_ID`     | no       | Google sign-in is enabled only when both Google variables are set                                 |
| `GOOGLE_CLIENT_SECRET` | no       |                                                                                                   |
| `CLOUDINARY_URL`       | no       | `cloudinary://<api_key>:<api_secret>@<cloud_name>`. Needed for image uploads and the seed         |
| `AI_PROVIDER`          | no       | `gemini` (default) or `openai`: which provider `src/lib/ai.ts` calls                              |
| `AI_MODEL`             | no       | Pinned model ID; defaults to `gemini-3.5-flash-lite` for Gemini, required for OpenAI              |
| `GEMINI_API_KEY`       | no       | Needed for `POST /api/v1/meals/analyze` when the provider is Gemini (503 without it)              |
| `OPENAI_API_KEY`       | no       | Needed when `AI_PROVIDER=openai`                                                                  |

For Google sign-in, create a "Web application" OAuth client in Google Cloud Console and add
`<BETTER_AUTH_URL>/api/auth/callback/google` as an authorised redirect URI. When testing on a real
phone against a local server, expose it through a tunnel (cloudflared, ngrok) and use the tunnel URL
as `BETTER_AUTH_URL`.

## Scripts

| Script                      | What it does                                                    |
| --------------------------- | --------------------------------------------------------------- |
| `bun run dev`               | Start `src/server.ts` with hot reload                           |
| `bun run build` / `start`   | Bundle for Bun into `dist/` and run it                          |
| `bun run vercel-build`      | Generate the Prisma client and bundle `src/index.ts` for Vercel |
| `bun run typecheck`         | `tsc --noEmit`                                                  |
| `bun run lint` / `lint:fix` | oxlint                                                          |
| `bun run format`            | Prettier                                                        |
| `bun test`                  | Run the `*.test.ts` files with Bun's test runner                |
| `bun run db:migrate`        | Create and apply a migration in development                     |
| `bun run db:deploy`         | Apply pending migrations (CI / production)                      |
| `bun run db:generate`       | Regenerate the Prisma client into `src/generated/prisma`        |
| `bun run db:studio`         | Open Prisma Studio                                              |
| `bun run db:seed:exercises` | Upload `workout_images/` to Cloudinary and upsert the exercises |

Commits are checked by commitlint (Conventional Commits), and staged files are linted and formatted
by a Husky pre-commit hook.

## Seeding the exercise catalog

Put one image per exercise in `workout_images/` (`.png`, `.jpg`, `.jpeg` or `.webp`). The file name
is the exercise name, so `Barbell Bench Press.png` becomes the exercise "Barbell Bench Press". Then:

```bash
bun run db:seed:exercises --dry-run   # show what would change
bun run db:seed:exercises             # upload and write to the database
```

It is safe to re-run: exercises are matched on a normalised name and images are replaced in place.
The image folder is git-ignored.

## API

All `/api/v1` routes require a signed-in session (cookie, or the `Cookie` header sent by the Expo
app).

| Method   | Path                                 | Description                                                              |
| -------- | ------------------------------------ | ------------------------------------------------------------------------ |
| `*`      | `/api/auth/*`                        | Better Auth: sign-up, sign-in, sign-out, Google OAuth, session           |
| `GET`    | `/api/me`                            | Current session, or `null`                                               |
| `GET`    | `/api/v1/profile`                    | The signed-in user's profile                                             |
| `GET`    | `/api/v1/exercise`                   | Exercise catalog. Sends an `ETag` and answers `If-None-Match` with `304` |
| `POST`   | `/api/v1/exercise`                   | Create one exercise with an image (multipart: `exercise_name`, `image`)  |
| `POST`   | `/api/v1/exercise/create-exercises`  | Create several exercises from JSON                                       |
| `PUT`    | `/api/v1/exercise/:exerciseId/image` | Replace an exercise's image (multipart: `image`)                         |
| `GET`    | `/api/v1/workout`                    | The user's workout plans                                                 |
| `POST`   | `/api/v1/workout/create-workout`     | Create a plan with its exercises (sets, reps, weight)                    |
| `PUT`    | `/api/v1/workout/:workoutId`         | Replace a plan                                                           |
| `DELETE` | `/api/v1/workout/:workoutId`         | Delete a plan                                                            |
| `GET`    | `/health`                            | Liveness check                                                           |

Outside production the full reference, including Better Auth's endpoints, is served by Scalar at
`/docs`, and the raw OpenAPI spec at `/openapi.json`. Request bodies come from the Zod schemas in
`src/common/zodSchema`; routes and responses are declared in `src/docs/openapi.ts`, so add new
routes there when you add them to a router.

Errors are returned as JSON by `src/common/middleware/error.middleware.ts`, using `ApiError` for
expected failures.

## Project layout

```
prisma/
  schema.prisma          User/Session/Account (Better Auth), Exercise, Workout_Plan,
                         Workout_Exercise, and diet tables (Food_Items, Meal_Time, ...)
  migrations/
src/
  server.ts              Local entrypoint (calls listen)
  index.ts               Vercel entrypoint (default-exports the app)
  app/app.ts             Express app: CORS, Better Auth, routers, error handling
  lib/                   env, Prisma client, Better Auth config, Cloudinary
  modules/
    routes/              Express routers
    controllers/         Request/response handling
    services/            Database and business logic
  common/
    middleware/          requireAuth, Zod validation, uploads, errors
    zodSchema/           Request schemas (also feed the OpenAPI spec)
    libs/ utils/ types/
  docs/                  OpenAPI document and the /docs router
  scripts/               seed-exercises.ts
  generated/prisma/      Generated Prisma client (git-ignored)
workout_images/          Source images for the seed (git-ignored)
```

## Deploying to Vercel

`vercel.json` runs `bun run vercel-build`, which generates the Prisma client and bundles
`src/index.ts` (the app as a default export, no `listen()`) into `dist/index.js` for Vercel's Node
runtime. Vercel's Express preset serves that file as a single function.

1. Create a hosted Postgres (Neon, Supabase, …) and apply migrations from your machine:
   `DATABASE_URL=<pooled url> bun run db:deploy`.
2. Import the repo in Vercel and add the environment variables above for Production and Preview.
   Set `NODE_ENV=production` and `BETTER_AUTH_URL=https://<project>.vercel.app`. `DATABASE_URL` is
   also needed at build time for `prisma generate`.
3. In Google Cloud Console, add `https://<project>.vercel.app/api/auth/callback/google` as an
   authorised redirect URI. Preview deployments get new URLs, so Google sign-in only works on the
   production domain.
4. Point the app's `EXPO_PUBLIC_API_URL` at the same `https://<project>.vercel.app`.

To check a build locally: `bun run vercel-build`, then
`node -e 'import("./dist/index.js").then(m => m.default.listen(9099))'`.

## License

Copyright © 2026 BeastInBash ([saifdev0847@gmail.com](mailto:saifdev0847@gmail.com)). All rights
reserved.

This project is proprietary and is not open source. No part of this codebase may be copied, modified,
distributed, deployed or used, in whole or in part, for any purpose without prior written permission
from the author. To request permission, contact saifdev0847@gmail.com.
