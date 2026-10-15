# forge-backend

Express 5 API for the [Forge](../Forge) app, run with Bun locally and on Node at Vercel
(`src/index.ts`). PostgreSQL (Neon) through Prisma 7 with the `pg` adapter, Better Auth, Zod 4,
Cloudinary for exercise images, and an LLM (Gemini by default) for meal nutrition. README.md has
setup, env vars and scripts.

Express, `pg` and `dotenv` are deliberate choices here; don't swap them for `Bun.serve`,
`Bun.sql` or Bun's env loading.

## Commands

- `bun run dev` (hot reload), `bun test`, `bun run typecheck`, `bun run lint` (oxlint),
  `bun run format` (Prettier: 4 spaces, single quotes, no trailing commas, 100 columns).
- Use `bun` / `bunx` rather than node, npm or npx.
- The Husky pre-commit hook runs oxlint and Prettier on staged files; commitlint enforces
  Conventional Commits.

## Structure and conventions

- `src/modules/routes/*.ts` → `controllers/*.controller.ts` → `services/*.services.ts`.
  Routes add `requireAuth` (and `requireAdmin` for catalog writes), `validateBody` /
  `validateParams` with a Zod schema, and wrap handlers in `asyncHandler`. Mount routers in
  `src/app/app.ts`.
- Zod request schemas live in `src/common/zodSchema/` (`z.strictObject`, `.meta({ id })`, and
  exported `z.infer` types). Express 5's `req.query` can't be reassigned, so parse query
  schemas in the controller.
- Respond with `ApiResponses.ok` / `create`; fail with `ApiError` (`badRequest`, `notFound`, …).
  The error middleware maps ZodError to 400 and known Prisma errors (P2002, P2003, P2025).
- Scope every user query by the session's `userId` (`res.locals.session.session.userId`), so
  another user's id reads as 404.
- Every new route also goes into the OpenAPI document: `src/docs/openapi.ts` for paths and
  `src/docs/schemas.ts` for response shapes. `src/docs/openapi.test.ts` checks the paths exist.
- Pure logic is in `src/common/utils/` with a colocated `*.test.ts` (`liftMetrics`, `nutrition`).
- oxlint's `no-console` allows only `warn` and `error`.

## Database

- Schema: `prisma/schema.prisma`; generated client in `src/generated/prisma` (`bun run
db:generate`). Prisma config is `prisma.config.ts`.
- `DATABASE_URL` is a shared Neon database (it can take ~7 s to wake up). There is no shadow
  database, so `prisma migrate dev` / `migrate diff --from-migrations` don't work. To add a
  migration: edit the schema, write the SQL with
  `bunx --bun prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`
  into `prisma/migrations/<timestamp>_<name>/migration.sql`, review it, then apply it with
  `bun run db:deploy`. Ask before applying anything that drops or rewrites data.
- `Food_Items`, `Nutrition_Information`, `Meal_Time` and `Diet` are unused placeholders.

## AI and meals

- `src/lib/ai.ts` is the only place that calls an LLM: `generateJson({ system, prompt, schema,
schemaName })` sends a Zod schema as JSON Schema, validates the answer, and throws `ApiError`
  503 (no key), 502 (provider failed) or `AiOutputError` (bad output, callers may retry once).
  The provider is chosen by `AI_PROVIDER` / `AI_MODEL` (Gemini via `@google/genai`, OpenAI via
  fetch). Never call a provider SDK directly from a feature.
- Gemini rejects `maxItems` in a response schema with a bare `400 INVALID_ARGUMENT`; the adapter
  strips it, and Zod still enforces it. Bisect schema keywords when Gemini returns that error.
- Meals (`/api/v1/meals`, design in `MEAL_LOGGING.md`): the AI returns grams plus nutrients per
  100 g for each food. The server checks plausibility (`checkPer100g`), scales, sums and rounds
  (`src/common/utils/nutrition.ts`, whose `NUTRIENTS` table defines every reported nutrient).
  `meal_item` stores grams and `per100g` JSON; totals are computed on read, never stored.
  `POST /meals` analyses and saves; `POST /meals/analyze` only analyses.
- Bump `PROMPT_VERSION` in `meal.services.ts` whenever the prompt changes.
- Not built yet: per-user rate limiting of AI calls, the `Food` cache table from the design doc,
  and editing logged items.

## Water

- `/api/v1/water`: `water_goal` (one row per user: daily ml, reminder window as local "HH:mm",
  interval, IANA `timezone`) and `water_log` (one drink). A day is bounded at local midnight in
  the goal's time zone (`localDayRange` in `src/common/utils/water.ts`).
- Reminders are server-sent pushes. A scheduler calls `GET /api/v1/cron/water-reminders`
  (`requireCronSecret`: `Authorization: Bearer <CRON_SECRET>`) every 15 minutes; `dueReminder`
  sends each slot at most once (`water_goal.lastReminderAt`), skips slots over 30 minutes old and
  users who have met today's goal.

## Push notifications

- `src/lib/push.ts` is the only place that sends push notifications (`expo-server-sdk`, optional
  `EXPO_ACCESS_TOKEN`); it has no database access. `push.services.ts` stores tickets and deletes
  tokens: `deliverPush(messages)` is what features call.
- The app registers its Expo token with `POST /api/v1/notifications/push-token` after sign-in and
  removes it with `DELETE` on sign-out. `push_token` is keyed by token, so a shared device moves
  to whoever signed in last. `POST /api/v1/notifications/test` pushes to your own devices.
- Expo returns a ticket per push; the receipt (delivered or `DeviceNotRegistered`) is ready after
  ~15 minutes. Each cron run checks receipts of older tickets and deletes dead tokens.

## Email and password reset

- `src/lib/email.ts` is the only place that sends email (Resend, `RESEND_API_KEY`, `EMAIL_FROM`);
  templates are pure builders in `src/common/utils/authEmails.ts`.
- Forgot password uses Better Auth's `emailOTP` plugin, limited to password resets: its other
  endpoints are in `disabledPaths` in `src/lib/auth.ts`. The app calls
  `/api/auth/email-otp/request-password-reset` then `/api/auth/email-otp/reset-password`.
  Google-only accounts get a "sign in with Google" email instead of a code, so a reset can't add
  a password to them. A reset revokes every session.
- The request endpoint always answers `success` and only logs a failed send, so a missing key
  shows up in the server logs, not in the app.

## Commits

Conventional Commits with a scope (`feat(meals): …`). No `Co-Authored-By` or other AI
attribution lines.
