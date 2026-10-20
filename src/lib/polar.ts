import { createPolar } from "@polar-sh/sdk/2026-10";
import { env } from "./env";

export const polar = createPolar({
  accessToken: env.POLAR_ACCESS_TOKEN,
  environment: env.POLAR_SERVER,
});

/**
 * True when a Polar SDK error is a 404 (e.g. no Polar customer exists yet for the org).
 * The SDK's PolarClientError exposes `statusCode`; `status` is checked for safety.
 */
export function isPolarNotFound(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  return (
    ("statusCode" in error && error.statusCode === 404) ||
    ("status" in error && error.status === 404)
  );
}
