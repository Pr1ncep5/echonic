import { describe, expect, it } from "vitest";

import { formatEstimate, formatPrice, PRICE_PER_THOUSAND_CHARACTERS } from "./format-price";

describe("prices are shown in euros", () => {
  it("formats an amount given in cents", () => {
    expect(formatPrice(1234)).toBe("€12.34");
    expect(formatPrice(0)).toBe("€0.00");
  });

  it("estimates a text's price from its length, to four decimals", () => {
    expect(formatEstimate(1)).toBe("€0.0003");
    expect(formatEstimate(5000)).toBe("€1.5000");
  });

  it("states the price per thousand characters", () => {
    expect(PRICE_PER_THOUSAND_CHARACTERS).toBe("€0.30");
  });
});
