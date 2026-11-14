import { createCallerFactory, createTRPCContext } from "@/trpc/init";
import { appRouter } from "@/trpc/routers/_app";
import { signInAs, type TestSession } from "./session";

const createCaller = createCallerFactory(appRouter);

/**
 * The tRPC API as this User would call it. The context is built by the real
 * `createTRPCContext`, so the procedure guards run exactly as they do in the app.
 */
export async function callerAs(testSession: TestSession) {
  signInAs(testSession);
  return createCaller(await createTRPCContext({ headers: new Headers() }));
}

export async function signedOutCaller() {
  return createCaller(await createTRPCContext({ headers: new Headers() }));
}
