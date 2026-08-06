// Records a visitor's intent to buy a configured build, without taking money.
//
// This is the demand-test stand-in for a real payment integration: the visitor
// tells us how they would like to pay, we capture that plus their contact and
// delivery details, and nothing is charged. See the `checkout_intents` table
// comment in supabase/schema.sql for the data-protection reasoning.
//
// ---------------------------------------------------------------------------
// WHEN THIS BECOMES A REAL CHECKOUT
// ---------------------------------------------------------------------------
// `submitCheckoutIntent` is the seam. Going live means keeping this call (the
// intent row stays useful as your own order record) and adding a payment step
// around it:
//
//   1. Server-side, create a payment with your provider (Stripe PaymentIntent,
//      Adyen session, GoPay/Comgate payment) for `total_eur`. This must happen
//      in a route handler or server action, never here — it needs a secret key.
//   2. Hand the client only the provider's public client-secret/redirect URL.
//   3. Let the PROVIDER collect the card details, via their hosted fields
//      (Stripe Payment Element), Google Pay / Apple Pay sheet, or a redirect.
//      Card numbers must never touch this codebase or this database, or the
//      project falls into PCI DSS scope.
//   4. Store only the provider's opaque reference against the intent row (add
//      a `payment_reference text` column) and let their webhook flip `status`.
//
// The Google Pay / Apple Pay buttons in the UI are, today, labelled choices —
// they do not invoke the Google Pay or Apple Pay APIs. Making them real means
// wiring the provider's own Google/Apple Pay support in step 3 (both require
// domain verification and a payment provider behind them; neither can settle
// money on its own).
'use client';

export type PaymentMethod = 'card' | 'google_pay' | 'apple_pay';

export type CheckoutIntentInput = {
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  zip: string;
  paymentMethod: PaymentMethod;
  shippingMethod: 'standard' | 'express' | 'overnight';
  partsTotalEur: number;
  shippingEur: number;
  assemblyEur: number;
  discountEur: number;
  totalEur: number;
  promoCode: string;
  buildItems: { category: string; name: string; priceEur: number }[];
  displayCurrency: string;
  lang: string;
  contactConsent: boolean;
};

// Posts to /api/checkout rather than inserting into Supabase directly: the
// anon key has no insert policy on checkout_intents anymore (see
// supabase/schema.sql). That route rate-limits by IP and recomputes the price
// fields from the authoritative catalog before inserting with the
// service-role key — the partsTotalEur/shippingEur/assemblyEur/discountEur/
// totalEur below are sent along only so the route can fall back to them for
// line items it can't find in the live catalog (e.g. the /checkout page's
// static demo fallback); they are not trusted as the final price.
export async function submitCheckoutIntent(input: CheckoutIntentInput): Promise<{ error: string | null }> {
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}) as { error?: string });
  if (!res.ok) return { error: body.error ?? `Request failed (${res.status}).` };
  return { error: null };
}
