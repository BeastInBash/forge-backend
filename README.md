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

This project was created using `bun init` in bun v1.3.14. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
