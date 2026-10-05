// Vercel entrypoint. Vercel runs the default-exported Express app as a single function, so this
// file must not call listen(). Local development keeps using src/server.ts.
//
// `bun run vercel-build` bundles this file to dist/index.js; Vercel's Express preset picks it up
// from there because the bundle keeps app.ts's `import express from "express"`.
import { createApplication } from './app/app';

export default createApplication();
