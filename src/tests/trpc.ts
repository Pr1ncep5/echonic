import { TRPCError } from "@trpc/server";

import { createCallerFactory, createTRPCContext } from "@/trpc/init";
import { appRouter } from "@/trpc/routers/_app";
import { signInAs, signOut, type TestSession } from "./session";

const createCaller = createCallerFactory(appRouter);

/**
 * The tRPC API as this User would call it. The context is built by the real
 * `createTRPCContext`, so the procedure guards run exactly as they do in the app.
 */
export async function callerAs(testSession: TestSession) {
  signInAs(testSession);
  return createCaller(await createTRPCContext({ headers: new Headers() }));
}

/** The TRPCError a call failed with. Fails the test if the call succeeded. */
export async function rejection(call: Promise<unknown>): Promise<TRPCError> {
  const error: unknown = await call.then(
    () => null,
    (cause: unknown) => cause,
  );
  if (!(error instanceof TRPCError)) {
    throw new Error("Expected the call to fail with a TRPCError", { cause: error });
  }
  return error;
}

export async function signedOutCaller() {
  signOut();
  return createCaller(await createTRPCContext({ headers: new Headers() }));
}
