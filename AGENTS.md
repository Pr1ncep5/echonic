# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Echonic

Open-source text-to-speech and voice cloning for teams. Next.js App Router, tRPC, Drizzle, Effect.ts, Better Auth, Polar billing, Cloudflare R2.

Domain vocabulary lives in `GLOSSARY.md`. Read it before naming anything. Hard-to-reverse decisions live in `docs/adr/`; smaller ones, with their reasons, in `docs/decisions.md`. Open follow-ups are in `TODO.md`.

## Commands

IMPORTANT: Bun only. Never use npm, npx, yarn or pnpm. Use `bunx` for one-off tools.

- `bun dev` — dev server
- `bun run check` — lint + types + format check. Run before finishing any change; it is what CI runs.
- `bun run fmt` / `bun run lint:fix` — fix formatting and lint
- `bun run db:seed` — seed system voices; `bunx drizzle-kit push` — apply schema
- `bun run sync-api` — regenerate the Chatterbox API types

- `bun run test:db` — start the test database (Docker, port 5433); `bun run test:db:stop` to remove it
- `bun run test` — run the tests once; `bun run test:watch` while working

## Tests

Vitest, against a real Postgres. Run `bun run test` together with `bun run check` before finishing a change to server code.

- A test file sits next to what it tests: `voices.ts` → `voices.test.ts`. Shared helpers live in `src/tests/`.
- Test through the public entry point: the tRPC caller (`callerAs` in `src/tests/trpc.ts`) or the Route Handler's exported function. Sign in with `signInAs`, create rows with `src/tests/factories.ts`.
- The database is real and emptied before each test. Never mock `@/db`.
- Only what leaves our system is replaced, in `src/tests/setup.ts`: the Better Auth session, R2, Polar, Chatterbox, the global `fetch` and Next's `after`. Add a new external service there, not in individual tests: the app's modules are loaded once for the whole run, so a `vi.mock` in one test file leaks into the files after it. Create the stand-in itself in `src/tests/external.ts`, never inside a `vi.mock` factory.
- Every test starts with no Subscription and a working Chatterbox. Say otherwise with `givenSubscription`, `givenPolarOutage` or `givenChatterboxFails` from `src/tests/external.ts`.
- A new rule under "Domain rules" comes with a test named after the rule. Assert on what the caller sees and on the rows left behind, not on which functions were called.
- No tests for components or for `src/components/ui`.

Lint is oxlint, format is oxfmt. Do not hand-format or argue with them.

## Domain rules

- The unit of tenancy and billing is the **Organization**. Custom voices and Generations belong to an Organization, never to a User. System voices belong to no Organization and are shared by all of them, so never restrict them by Organization. Never say "workspace".
- tRPC: any procedure touching Custom voices, Generations or billing uses `orgProcedure` and filters by `ctx.orgId`. Queries that list Voices must still include System voices.
- Route Handlers (`src/app/api`): take `orgId` only from the session's `activeOrganizationId`.
- Never accept an `orgId` from client input.
- Paid operations check for an active Polar subscription first, then queue a usage event in the same transaction as the row for the work.
- Billing and deleting a Custom voice are for owners and admins: use `orgAdminProcedure`.
- Deleting from R2 and reporting usage to Polar go through the outbox (`features/outbox`, ADR 0002), never as a bare call after a database write.

## Structure

- `src/features/<name>/` — domain code: `views` compose `components`; `hooks`; `data` (constants); `services` and `workflows` (server logic); `domain` (tagged errors).
- `src/components/` — shared, domain-free UI. If a component's name mentions a domain concept (Voice, Generation, Organization), it belongs in a feature.
- `src/components/ui/` — generated shadcn code. Add with `bunx shadcn@latest add <name>`; never hand-edit it, wrap it instead.
- `src/trpc/routers/` — thin routers; business logic goes in feature workflows.

## Code rules

- Server-side logic that can fail uses Effect, with tagged errors from the feature's `domain/errors.ts`. Follow `features/text-to-speech/workflows/generate-workflow.ts`. Do not convert unrelated code.
- No `any`. Avoid `as` assertions: let inference, the Effect error channel, Zod parsing and type guards narrow types. If an assertion is unavoidable (`as const` aside), add a one-line comment saying why.
- Import across directories with `@/`; relative imports only for siblings.
- Server config comes from `@/lib/env`, never `process.env`. Do not add new exceptions.
- No `console.log`. Use `Sentry.logger`.
- tRPC procedures run workflows with `runEffect` (`src/trpc/run-effect.ts`). When the client must react to a failure in a specific way, give it an `appError` code; never match on error messages.
- Filenames are kebab-case. No barrel files (`index.ts` that only re-exports).
- Comments only for non-obvious why (business rules, bug workarounds).
