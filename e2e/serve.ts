/**
 * Builds the app and keeps it and the fake server running, so `bun run e2e` can be run
 * again and again without rebuilding. Start with `bun run e2e:serve`, stop with Ctrl+C.
 * Restart it after changing anything under src/: it serves the build it started with.
 */
import { spawn } from "node:child_process";
import { config as loadEnv } from "dotenv";

import { APP_PORT, appEnv } from "./support/env";

// Bun has already loaded the developer's .env, whose R2 values point at the development
// bucket. The test bucket's values must win, or the journeys write to the wrong bucket.
loadEnv({ path: ".env.e2e", quiet: true, override: true });

const commands = [
  { command: "bun e2e/fakes/server.ts", env: process.env },
  {
    command: `bun run build && bun run start --port ${APP_PORT}`,
    env: { ...process.env, ...appEnv(process.env) },
  },
];

const children = commands.map(({ command, env }) =>
  spawn(command, { shell: true, stdio: "inherit", env }),
);

for (const child of children) {
  // If one stops, stop the other: half a setup only produces confusing failures.
  child.on("exit", (code) => {
    for (const other of children) other.kill();
    process.exit(code ?? 1);
  });
}
