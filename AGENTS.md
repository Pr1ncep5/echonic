# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Echonic

Open-source text-to-speech and voice cloning for teams. Next.js App Router, tRPC, Drizzle, Effect.ts, Better Auth, Polar billing, Cloudflare R2.

Domain vocabulary lives in `GLOSSARY.md`. Read it before naming anything. Hard-to-reverse decisions live in `docs/adr/`.

## Commands

IMPORTANT: Bun only. Never use npm, npx, yarn or pnpm. Use `bunx` for one-off tools.

- `bun dev` — dev server
- `bun run check` — lint + types + format check. Run before finishing any change; it is what CI runs.
- `bun run fmt` / `bun run lint:fix` — fix formatting and lint
- `bun run db:seed` — seed system voices; `bunx drizzle-kit push` — apply schema
- `bun run sync-api` — regenerate the Chatterbox API types

There is no test runner yet. Verify with `bun run check` and by running the app. Do not add test files or frameworks unprompted.

Lint is oxlint, format is oxfmt. Do not hand-format or argue with them.

## Domain rules

- The unit of tenancy and billing is the **Organization**. Voices and Generations belong to an Organization, never to a User. Never say "workspace".
- tRPC: any procedure touching Voices, Generations or billing uses `orgProcedure` and filters by `ctx.orgId`.
- Route Handlers (`src/app/api`): take `orgId` only from the session's `activeOrganizationId`.
- Never accept an `orgId` from client input.
- Paid operations check for an active Polar subscription first, then ingest a usage event after the work succeeds.

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
- Filenames are kebab-case. No barrel files (`index.ts` that only re-exports).
- Comments only for non-obvious why (business rules, bug workarounds).
