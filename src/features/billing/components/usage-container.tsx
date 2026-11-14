import { useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCheckout } from "@/features/billing/hooks/use-checkout";
import { formatPrice, PRICE_PER_THOUSAND_CHARACTERS } from "@/features/billing/lib/format-price";
import { useCanManageOrganization } from "@/features/organizations/hooks/use-can-manage-organization";
import { useTRPC } from "@/trpc/client";

function SubscribeCard({ canManage }: { canManage: boolean }) {
  const { checkout, isPending: isCheckoutPending } = useCheckout();

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold tracking-tight text-foreground">No subscription</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Pay as you go: {PRICE_PER_THOUSAND_CHARACTERS} per 1,000 characters.
        </p>
      </div>

      {canManage ? (
        <Button
          variant="outline"
          className="w-full text-xs"
          size="sm"
          disabled={isCheckoutPending}
          onClick={checkout}
        >
          {isCheckoutPending ? (
            <>
              <Spinner className="size-3" />
              Redirecting...
            </>
          ) : (
            "Subscribe"
          )}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">Ask an owner or admin to subscribe.</p>
      )}
    </div>
  );
}

function UsageCard({
  estimatedCostCents,
  canManage,
}: {
  estimatedCostCents: number;
  canManage: boolean;
}) {
  const trpc = useTRPC();
  const portalMutation = useMutation(
    trpc.billings.createPortalSession.mutationOptions({
      onError: (error) => toast.error(error.message || "Couldn't open the billing portal"),
    }),
  );

  const openPortal = useCallback(() => {
    portalMutation.mutate(undefined, {
      onSuccess: (data) => {
        window.open(data.portalUrl, "_blank", "noopener");
      },
    });
  }, [portalMutation]);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold tracking-tight text-foreground">Current usage</p>
        <p className="mt-1 text-xl font-bold tracking-tight text-foreground tabular-nums">
          {formatPrice(estimatedCostCents)}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">Estimated this period</p>
      </div>

      {canManage && (
        <Button
          variant="outline"
          className="w-full text-xs"
          size="sm"
          disabled={portalMutation.isPending}
          onClick={openPortal}
        >
          {portalMutation.isPending ? (
            <>
              <Spinner className="size-3" />
              Redirecting...
            </>
          ) : (
            "Manage subscription"
          )}
        </Button>
      )}
    </div>
  );
}

export function UsageContainer() {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.billings.getStatus.queryOptions());
  const canManage = useCanManageOrganization();

  // Nothing is shown until the status is known, so a subscribed Organization never
  // sees a flash of the subscribe prompt.
  if (!data) return null;

  return (
    <div className="rounded-lg border border-border bg-background p-3 group-data-[collapsible=icon]:hidden">
      {data.hasActiveSubscription ? (
        <UsageCard estimatedCostCents={data.estimatedCostCents} canManage={canManage} />
      ) : (
        <SubscribeCard canManage={canManage} />
      )}
    </div>
  );
}
