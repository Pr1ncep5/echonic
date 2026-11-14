import { TRPCError } from "@trpc/server";

/**
 * Failures the client reacts to in a specific way (not only by showing the message).
 * Sent to the client as `error.data.appCode` by the error formatter in init.ts, so the
 * client switches on a typed code instead of matching message strings.
 */
export type AppErrorCode = "SUBSCRIPTION_REQUIRED" | "RATE_LIMITED" | "ROLE_REQUIRED";

class AppError extends Error {
  constructor(readonly appCode: AppErrorCode) {
    super(appCode);
  }
}

export function appError(
  appCode: AppErrorCode,
  code: TRPCError["code"],
  message: string,
): TRPCError {
  return new TRPCError({ code, message, cause: new AppError(appCode) });
}

export function getAppErrorCode(error: TRPCError): AppErrorCode | null {
  return error.cause instanceof AppError ? error.cause.appCode : null;
}
