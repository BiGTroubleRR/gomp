// The price rule used by /api/checkout: a price always comes from the live catalog, never from the browser.
// Pure on purpose, so it can be unit-tested without a database (src/lib/checkout-pricing.test.mjs).
import { applyVat } from '@/lib/component-db-seed';

export type CatalogEntry = { price: number; sitePrice: number | null };

// The configurator offers a synthetic "double kit" for RAM: the cheapest 2-stick kit twice. It is named
// `${base name}${DOUBLE_KIT_SUFFIX}` and is not a database row (see synthesizeDoubledRamKits in build/page.tsx).
export const DOUBLE_KIT_SUFFIX = ' (2× kits)';

// Gross (VAT-included) price of one order line, or null when the name is not something we sell.
export function catalogGrossPrice(name: string, catalog: Map<string, CatalogEntry>, vatRatePct: number): number | null {
  const entry = catalog.get(name);
  if (entry) return entry.sitePrice ?? applyVat(entry.price, vatRatePct);
  if (name.endsWith(DOUBLE_KIT_SUFFIX)) {
    const base = catalog.get(name.slice(0, -DOUBLE_KIT_SUFFIX.length));
    // same maths as the configurator shows: an override doubles, otherwise the doubled net price is taxed
    if (base) return base.sitePrice != null ? base.sitePrice * 2 : applyVat(Math.round(base.price * 2), vatRatePct);
  }
  return null;
}
