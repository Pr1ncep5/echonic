import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";

export function useCheckout() {
  const trpc = useTRPC();
  const mutation = useMutation(
    trpc.billings.createCheckout.mutationOptions({
      // Members who are not owners or admins are told so by the server.
      onError: (error) => toast.error(error.message || "Couldn't open the checkout"),
    }),
  );

  const checkout = useCallback(() => {
    mutation.mutate(undefined, {
      onSuccess: (data) => {
        window.location.href = data.checkoutUrl;
      },
    });
  }, [mutation]);

  return { checkout, isPending: mutation.isPending };
}
