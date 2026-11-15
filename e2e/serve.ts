/**
 * Builds the app and keeps it and the fake server running, so `bun run e2e` can be run
 * again and again without rebuilding. Start with `bun run e2e:serve`, stop with Ctrl+C.
 * Restart it after changing anything under src/: it serves the build it started with.
 */
import { spawn } from "node:child_process";

import { APP_PORT, appEnv } from "./support/env";

const commands = [
  { command: "bun e2e/fakes/server.ts", env: process.env },
  {
    command: `bun run build && bun run start --port ${APP_PORT}`,
    // Bun has already loaded the developer's .env into process.env. appEnv comes last so
    // the test bucket's R2 values replace the development bucket's.
    env: { ...process.env, ...appEnv() },
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
