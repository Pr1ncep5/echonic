import { auth } from "@/lib/auth";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

/**
 * This context creator accepts `headers` so it can be reused in both
 * the RSC server caller (where you pass `next/headers`) and the
 * API route handler (where you pass the request headers).
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  // Read session natively via Better Auth's server API using the HTTP incoming request headers
  const sessionData = await auth.api.getSession({ headers: opts.headers });

  return {
    user: sessionData?.user || null,
    session: sessionData?.session || null,
    userId: sessionData?.user?.id || null,
    orgId: sessionData?.session?.activeOrganizationId || null,
  };
};

// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC.context<Awaited<ReturnType<typeof createTRPCContext>>>().create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  transformer: superjson,
});
// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;

/**
 * Authenticated procedure - blocks if no session exists or user is not logged in.
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId || !ctx.user || !ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }

  return next({
    ctx: {
      userId: ctx.userId,
      user: ctx.user,
      session: ctx.session,
      // orgId is inherited but could be null here.
    },
  });
});

/**
 * Organization procedure - strict block if the user has not selected an active organization.
 */
export const orgProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Organization context required",
    });
  }

  return next({
    ctx: {
      ...ctx,
      orgId: ctx.orgId,
    },
  });
});
