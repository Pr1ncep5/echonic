# End-to-end tests

Playwright journeys against the built app. The conventions for writing them are in [ARCHITECTURE.md](ARCHITECTURE.md); read it before adding or changing a journey.

## What runs

| Piece                | What it is                                                                |
| -------------------- | ------------------------------------------------------------------------- |
| App                  | A production build (`next build`, `next start`) on port 3100              |
| Database             | Real Postgres: database `echonic_e2e` in the Docker container Vitest uses |
| R2                   | A real test bucket (objects expire after a day)                           |
| Polar and Chatterbox | One local fake server on port 4010 (`fakes/server.ts`)                    |

## Before the first run

1. Docker running, then `bun run test:db`.
2. A `.env.e2e` file in the repository root with the test bucket's `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and `R2_BUCKET_NAME`. It is not in git. In CI the same values come from the `E2E_R2_*` secrets.
3. `bunx playwright install chromium`.

## Running

```sh
bun run e2e                          # everything
bun run e2e clone-voice.spec.ts      # one file
bun run e2e -g "bills nothing"       # journeys whose title matches
bun run e2e --ui                     # Playwright's UI mode: watch, step, time-travel
bun run e2e --debug                  # step through with the inspector
bun run e2e --workers=1              # one at a time, when hunting a flaky journey
```

Each run rebuilds the database from the schema, so there is nothing to clean up between runs.

## Parallel runs and isolation

Journeys run in parallel. That works because each one gets its own Organization and owner from the `organization` fixture, and the fake Polar is scoped to that Organization.

For this to hold, a spec file MUST import `test` and `expect` from `./support/test`, never from `@playwright/test`. Lint enforces it.

```ts
// Correct
import { expect, test } from "./support/test";

// Wrong: no Organization, no signed-in page, and shared state between journeys
import { expect, test } from "@playwright/test";
```

## Working on journeys

A plain `bun run e2e` builds the app first, which takes about 40 seconds. To skip that while writing a journey, keep the servers running in a second terminal:

```sh
bun run e2e:serve
```

`bun run e2e` then uses the running servers and starts in seconds. The servers serve the build they started with, so restart `e2e:serve` after changing anything under `src/`; changes under `e2e/` need no restart, except to `fakes/server.ts`. CI never reuses servers.

## When a journey fails

- Locally, the failure output names a screenshot and a trace under `test-results/`. Open the trace with `bunx playwright show-trace <path to trace.zip>`: it has the DOM, network and console at every step.
- In CI, download the `playwright-report` artifact from the failed run and open it with `bunx playwright show-report <folder>`.
- A journey that passed only on retry is listed as "flaky" in the report. Treat it as a failure to fix, see the retry policy in ARCHITECTURE.md.

## Layout

```
e2e/
  *.spec.ts          one file per journey area
  pages/             page objects, one per route
  support/test.ts    the `test` every spec imports: fixtures
  support/seed.ts    rows a journey needs that the interface cannot create quickly
  support/fake.ts    steering and reading the fake Polar
  support/r2.ts      reading and writing the R2 test bucket
  support/env.ts     ports, URLs and the environment the app runs with
  fakes/server.ts    the fake Polar and Chatterbox
  global-setup.ts    rebuilds the database once per run
  serve.ts           `bun run e2e:serve`
```
