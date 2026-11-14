import { TRPCError } from "@trpc/server";
import { polar } from "@/lib/polar";
import { env } from "@/lib/env";
import {
  getCustomerState,
  hasActiveSubscription,
} from "@/features/billing/services/subscription-service";
import { createTRPCRouter, orgAdminProcedure, orgProcedure } from "../init";
import { runEffect } from "../run-effect";

export const billingsRouter = createTRPCRouter({
  // Billing is managed by owners and admins only.
  createCheckout: orgAdminProcedure.mutation(async ({ ctx }) => {
    const result = await polar.checkouts.create({
      products: [env.POLAR_PRODUCT_ID],
      external_customer_id: ctx.orgId,
      success_url: env.APP_URL,
    });

    if (!result.url) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create checkout session",
      });
    }

    return { checkoutUrl: result.url };
  }),

  createPortalSession: orgAdminProcedure.mutation(async ({ ctx }) => {
    const result = await polar.customerSessions.create({
      external_customer_id: ctx.orgId,
    });

    if (!result.customer_portal_url) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create customer portal session",
      });
    }

    return { portalUrl: result.customer_portal_url };
  }),

  getStatus: orgProcedure.query(async ({ ctx }) => {
    const customerState = await runEffect(getCustomerState(ctx.orgId), {
      toTRPCError: () =>
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to communicate with billing service",
        }),
      tags: { orgId: ctx.orgId },
    });

    // Sum up estimated costs from all meters across active subscriptions
    let estimatedCostCents = 0;
    for (const sub of customerState?.active_subscriptions ?? []) {
      for (const meter of sub.meters ?? []) {
        estimatedCostCents += meter.amount ?? 0;
      }
    }

    return {
      hasActiveSubscription: hasActiveSubscription(customerState),
      customerId: customerState?.id ?? null,
      estimatedCostCents,
    };
  }),
});
