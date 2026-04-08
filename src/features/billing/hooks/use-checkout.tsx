import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function useCheckout() {
  const trpc = useTRPC();
  const mutation = useMutation(trpc.billings.createCheckout.mutationOptions({}));

  const checkout = useCallback(() => {
    mutation.mutate(undefined, {
      onSuccess: (data) => {
        window.location.href = data.checkoutUrl;
      },
    });
  }, [mutation]);

  return { checkout, isPending: mutation.isPending };
}
