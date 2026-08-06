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

import { createClient } from './client';
import type { Database } from './types';

export type PaymentMethod = 'card' | 'google_pay' | 'apple_pay';

type CheckoutIntentInsert = Database['public']['Tables']['checkout_intents']['Insert'];

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

export async function submitCheckoutIntent(input: CheckoutIntentInput): Promise<{ error: string | null }> {
  const supabase = createClient();
  const row: CheckoutIntentInsert = {
    user_id: input.userId,
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    city: input.city.trim(),
    region: input.region.trim(),
    zip: input.zip.trim(),
    payment_method: input.paymentMethod,
    shipping_method: input.shippingMethod,
    parts_total_eur: input.partsTotalEur,
    shipping_eur: input.shippingEur,
    assembly_eur: input.assemblyEur,
    discount_eur: input.discountEur,
    total_eur: input.totalEur,
    promo_code: input.promoCode.trim(),
    build_items: input.buildItems.map((i) => ({ category: i.category, name: i.name, price_eur: i.priceEur })),
    display_currency: input.displayCurrency,
    lang: input.lang,
    contact_consent: input.contactConsent,
  };

  // No .select() chained on purpose: the table's RLS grants insert but not read
  // to the anon key, so asking for the row back would fail the whole call.
  const { error } = await supabase.from('checkout_intents').insert(row);
  return { error: error ? error.message : null };
}
