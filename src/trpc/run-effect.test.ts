import { TRPCError } from "@trpc/server";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { rejection } from "@/tests/trpc";
import { runEffect } from "./run-effect";

const toTRPCError = (error: string) => new TRPCError({ code: "NOT_FOUND", message: error });

describe("runEffect", () => {
  it("returns what the workflow produced", async () => {
    await expect(runEffect(Effect.succeed(42), { toTRPCError })).resolves.toBe(42);
  });

  it("turns a domain error into the TRPCError chosen for it", async () => {
    const error = await rejection(runEffect(Effect.fail("Voice not found"), { toTRPCError }));

    expect(error).toMatchObject({ code: "NOT_FOUND", message: "Voice not found" });
  });

  it("turns a bug into a generic error that reveals nothing", async () => {
    const bug = Effect.die(new Error("password=hunter2 at db.internal:5432"));

    const error = await rejection(runEffect(bug, { toTRPCError }));

    expect(error).toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    });
  });
});
