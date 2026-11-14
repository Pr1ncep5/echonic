import { Data } from "effect";

/**
 * Thrown when a database operation (insert, update, delete) fails.
 */
export class DatabaseError extends Data.TaggedError("Database")<{
  readonly operation: "select" | "insert" | "update" | "delete";
  readonly entity: "generation" | "voice" | "member" | "outbox";
  readonly cause: unknown;
}> {}

/**
 * True when a failed query broke a unique constraint (Postgres code 23505). Drizzle wraps
 * the driver error, so the code can sit on the error itself or anywhere down its causes.
 */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && typeof current === "object" && current !== null; depth += 1) {
    if ("code" in current && current.code === "23505") {
      return true;
    }
    current = "cause" in current ? current.cause : null;
  }
  return false;
}
