import { isTRPCClientError } from "@trpc/client";
import type { AppErrorCode } from "./app-error";
import type { AppRouter } from "./routers/_app";

/** The typed reason a tRPC call failed, when the server sent one. */
export function getAppErrorCode(error: unknown): AppErrorCode | null {
  return isTRPCClientError<AppRouter>(error) ? (error.data?.appCode ?? null) : null;
}
