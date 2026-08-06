// Public checkout-intent submission. Replaces a direct client insert into
// `checkout_intents` (see supabase/schema.sql — the anon key has no insert
// policy on that table anymore) with two things a browser can't be trusted to
// do honestly:
//
//   1. Rate limiting by IP, via src/lib/rate-limit.ts — the old direct-insert
//      path had no limit at all, so a script could flood the table.
//   2. Server-side price recomputation — the old path trusted whatever
//      parts_total_eur/shipping_eur/assembly_eur/discount_eur/total_eur the
//      client sent. Those are now derived here from the authoritative
//      `components` catalog and the site's own shipping/assembly/promo rules,
//      so editing the client's network request can no longer submit an
//      arbitrary price for a real build.
//
// Still no payment happens here — see checkout-intents.ts for that seam.
import { NextResponse } from 'next/server';
import { createAdminClient, MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';
import { checkRateLimit, clientIpFromHeaders } from '@/lib/rate-limit';

type PaymentMethod = 'card' | 'google_pay' | 'apple_pay';
type ShippingMethod = 'standard' | 'express' | 'overnight';

const PAYMENT_METHODS: PaymentMethod[] = ['card', 'google_pay', 'apple_pay'];
const SHIPPING_COSTS_EUR: Record<ShippingMethod, number> = { standard: 0, express: 43, overnight: 112 };
const ASSEMBLY_FEE_EUR = 130;
const PROMO_CODE = 'gomp2026';
const PROMO_DISCOUNT_RATE = 0.05;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CheckoutRequestBody = {
  userId?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  region?: string;
  zip?: string;
  paymentMethod?: string;
  shippingMethod?: string;
  promoCode?: string;
  buildItems?: { category?: string; name?: string; priceEur?: number }[];
  displayCurrency?: string;
  lang?: string;
  contactConsent?: boolean;
};

function isShippingMethod(v: unknown): v is ShippingMethod {
  return typeof v === 'string' && v in SHIPPING_COSTS_EUR;
}

export async function POST(request: Request) {
  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    if (e instanceof MissingServiceRoleKeyError) {
      return NextResponse.json({ error: e.message, code: 'missing_service_role_key' }, { status: 503 });
    }
    throw e;
  }

  const ip = clientIpFromHeaders(request.headers);
  const rateLimit = await checkRateLimit(supabase, `checkout:${ip}`, { limit: 8, windowSeconds: 10 * 60 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    );
  }

  const body = (await request.json().catch(() => null)) as CheckoutRequestBody | null;
  if (!body) return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });

  const email = (body.email ?? '').trim();
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  if (!PAYMENT_METHODS.includes(body.paymentMethod as PaymentMethod)) {
    return NextResponse.json({ error: 'Invalid payment method.' }, { status: 400 });
  }
  if (!isShippingMethod(body.shippingMethod)) {
    return NextResponse.json({ error: 'Invalid shipping method.' }, { status: 400 });
  }
  const submittedItems = Array.isArray(body.buildItems) ? body.buildItems : [];
  if (submittedItems.length === 0) {
    return NextResponse.json({ error: 'No build items submitted.' }, { status: 400 });
  }

  // Authoritative prices: look up each submitted item by name in the live
  // catalog. A miss (discontinued component, or the /checkout page's static
  // demo fallback shown when a visitor lands there without building first)
  // falls back to the client-submitted price for that one line only — the
  // items that matter (a real, currently-sold component) are always
  // server-priced; there is no live catalog entry to be honest about otherwise.
  const { data: catalogRows } = await supabase.from('components').select('name, price');
  const priceByName = new Map((catalogRows ?? []).map((r) => [r.name, Number(r.price)]));

  const buildItems = submittedItems.map((item) => {
    const name = (item.name ?? '').trim();
    const authoritativePrice = priceByName.get(name);
    return {
      category: (item.category ?? '').trim(),
      name,
      price_eur: authoritativePrice ?? (Number(item.priceEur) || 0),
    };
  });

  const partsTotalEur = buildItems.reduce((sum, i) => sum + i.price_eur, 0);
  const shippingEur = SHIPPING_COSTS_EUR[body.shippingMethod];
  const assemblyEur = ASSEMBLY_FEE_EUR;
  const promoCodeInput = (body.promoCode ?? '').trim();
  const promoApplied = promoCodeInput.toLowerCase() === PROMO_CODE;
  const discountEur = promoApplied ? Math.round(partsTotalEur * PROMO_DISCOUNT_RATE) : 0;
  const totalEur = partsTotalEur - discountEur + shippingEur + assemblyEur;

  const { error } = await supabase.from('checkout_intents').insert({
    user_id: body.userId ?? null,
    first_name: (body.firstName ?? '').trim(),
    last_name: (body.lastName ?? '').trim(),
    email,
    phone: (body.phone ?? '').trim(),
    address: (body.address ?? '').trim(),
    city: (body.city ?? '').trim(),
    region: (body.region ?? '').trim(),
    zip: (body.zip ?? '').trim(),
    payment_method: body.paymentMethod as PaymentMethod,
    shipping_method: body.shippingMethod,
    parts_total_eur: partsTotalEur,
    shipping_eur: shippingEur,
    assembly_eur: assemblyEur,
    discount_eur: discountEur,
    total_eur: totalEur,
    promo_code: promoApplied ? promoCodeInput : '',
    build_items: buildItems,
    display_currency: (body.displayCurrency ?? 'EUR').trim(),
    lang: (body.lang ?? 'en').trim(),
    contact_consent: Boolean(body.contactConsent),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
