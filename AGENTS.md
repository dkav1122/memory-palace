<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

The game is a client-only Next.js app. A `dev` terminal is started by `.cursor/environment.json` at `http://localhost:3000`. Persistence is IndexedDB in the browser — there is no login. Demo from `/` → deck setup → palace as needed. Do not rewrite `.cursor/environment.json` as part of a ticket fix.

