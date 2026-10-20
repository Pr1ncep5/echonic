import "server-only"; // <-- ensure this file cannot be imported from the client
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { headers } from "next/headers";
import { cache } from "react";
import { createTRPCContext } from "./init";
import { makeQueryClient } from "./query-client";
import { appRouter } from "./routers/_app";
import {
  dehydrate,
  HydrationBoundary,
  type InfiniteQueryExecuteOptions,
  noop,
  type QueryExecuteOptions,
  type QueryKey,
} from "@tanstack/react-query";
// IMPORTANT: Create a stable getter for the query client that
//            will return the same client during the same request.
export const getQueryClient = cache(makeQueryClient);
export const trpc = createTRPCOptionsProxy({
  ctx: async () =>
    createTRPCContext({
      headers: await headers(),
    }),
  router: appRouter,
  queryClient: getQueryClient,
});
// If your router is on a separate server, pass a client instead:
// createTRPCOptionsProxy({
//   client: createTRPCClient({ links: [httpLink({ url: '...' })] }),
//   queryClient: getQueryClient,
// });

export function HydrateClient(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return <HydrationBoundary state={dehydrate(queryClient)}>{props.children}</HydrationBoundary>;
}

// Not awaited on purpose: the pending query is dehydrated (see `shouldDehydrateQuery` in
// query-client.ts) and streamed to the client, so the page doesn't block on the fetch.
export function prefetch<TQueryFnData, TError, TData, TQueryData, TQueryKey extends QueryKey>(
  queryOptions: QueryExecuteOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>,
) {
  void getQueryClient().query(queryOptions).catch(noop);
}

export function prefetchInfinite<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey,
  TPageParam,
>(queryOptions: InfiniteQueryExecuteOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>) {
  void getQueryClient().infiniteQuery(queryOptions).catch(noop);
}
