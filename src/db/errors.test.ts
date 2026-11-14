import { describe, expect, it } from "vitest";

import { isUniqueViolation } from "./errors";

describe("isUniqueViolation", () => {
  it("recognises the Postgres code on the error itself", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
  });

  it("recognises it under the causes Drizzle wraps the driver error in", () => {
    const wrapped = new Error("Failed query", {
      cause: new Error("driver", { cause: { code: "23505" } }),
    });

    expect(isUniqueViolation(wrapped)).toBe(true);
  });

  it("rejects other database errors and non-errors", () => {
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation(new Error("connection refused"))).toBe(false);
    expect(isUniqueViolation("23505")).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});
