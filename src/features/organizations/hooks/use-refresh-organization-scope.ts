"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * After the active Organization changes, every cached Voice, Generation and usage
 * query belongs to the previous one. Drop them all and re-run server components.
 */
export function useRefreshOrganizationScope() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useCallback(
    async (redirectTo?: string) => {
      await queryClient.invalidateQueries();
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    },
    [queryClient, router],
  );
}
