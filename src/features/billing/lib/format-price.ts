import { COST_PER_UNIT } from "@/features/text-to-speech/data/constants";

// Prices are charged in euros; the interface is English, hence the locale.
const price = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });
const estimate = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 4,
});

export function formatPrice(cents: number): string {
  return price.format(cents / 100);
}

/** The estimated price of generating speech for a text of this length. */
export function formatEstimate(characters: number): string {
  return estimate.format(characters * COST_PER_UNIT);
}

export const PRICE_PER_THOUSAND_CHARACTERS = price.format(COST_PER_UNIT * 1000);
