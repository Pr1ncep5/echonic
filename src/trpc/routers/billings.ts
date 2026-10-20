import { TRPCError } from "@trpc/server";
import { isPolarNotFound, polar } from "@/lib/polar";
import { env } from "@/lib/env";
import { createTRPCRouter, orgProcedure } from "../init";

export const billingsRouter = createTRPCRouter({
  createCheckout: orgProcedure.mutation(async ({ ctx }) => {
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

  createPortalSession: orgProcedure.mutation(async ({ ctx }) => {
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
    try {
      const customerState = await polar.customers.getStateExternal(ctx.orgId);

      const hasActiveSubscription = (customerState.active_subscriptions ?? []).length > 0;

      // Sum up estimated costs from all meters across active subscriptions
      let estimatedCostCents = 0;
      for (const sub of customerState.active_subscriptions ?? []) {
        for (const meter of sub.meters ?? []) {
          estimatedCostCents += meter.amount ?? 0;
        }
      }

      return {
        hasActiveSubscription,
        customerId: customerState.id,
        estimatedCostCents,
      };
    } catch (error) {
      // Customer doesn't exist yet in Polar
      if (!isPolarNotFound(error)) throw error;
      return {
        hasActiveSubscription: false,
        customerId: null,
        estimatedCostCents: 0,
      };
    }
  }),
});
