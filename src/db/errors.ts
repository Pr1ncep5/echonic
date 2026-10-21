import { Data } from "effect";

/**
 * Thrown when a database operation (insert, update, delete) fails.
 */
export class DatabaseError extends Data.TaggedError("Database")<{
  readonly operation: "select" | "insert" | "update" | "delete";
  readonly entity: "generation" | "voice";
  readonly cause: unknown;
}> {}
