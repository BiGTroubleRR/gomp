// Shared, PURE data + copy for the order "ticket" — rendered as React on the checkout confirmation
// screen (src/components/OrderTicket.tsx) and as table-based HTML in the confirmation email
// (src/lib/email/resend.ts). Keeping both on this one module means the two can never drift apart.
// No 'use client' and no server-only imports, so either side can import it.
import { fmtPrice, type Currency, type Lang } from '@/lib/gomp-storage';

export type OrderTicketData = {
  referenceCode: string;
  createdAt: string; // ISO timestamp (the checkout_intents row's own created_at)
  customerName: string;
  email: string;
  addressLines: string[];
  lang: Lang;
  currency: Currency;
  paymentMethod: 'card' | 'google_pay' | 'apple_pay';
  shippingMethod: 'standard' | 'express' | 'overnight';
  items: { category: string; name: string; price: number }[];
  // All gross (VAT-inclusive) CZK, exactly as stored on the row — format with ticketMoney().
  partsTotal: number;
  assembly: number;
  shipping: number;
  discount: number;
  promoCode: string;
  total: number;
  // Absolute URL of the customer's account page — set only when the order is attached to an account.
  accountUrl?: string;
};

export function normalizeLang(v: unknown): Lang {
  return v === 'sk' || v === 'cz' ? v : 'en';
}

export function normalizeCurrency(v: unknown): Currency {
  return typeof v === 'string' && v.toLowerCase() === 'eur' ? 'eur' : 'czk';
}

export function ticketMoney(czk: number, currency: Currency): string {
  return fmtPrice(czk, currency);
}

type TicketCopy = {
  subject: (ref: string) => string;
  heading: string;
  subtitle: string;
  reference: string;
  total: string;
  dateTime: string;
  deliverTo: string;
  payment: string;
  shipping: string;
  buildTime: string;
  items: string;
  parts: string;
  assembly: string;
  shippingFee: string;
  free: string;
  discount: string;
  vatNote: string;
  note: string;
  footer: string;
  viewInAccount: string;
  payments: Record<OrderTicketData['paymentMethod'], string>;
  shippingNames: Record<OrderTicketData['shippingMethod'], { name: string; eta: string }>;
};

export const TICKET_T: Record<Lang, TicketCopy> = {
  en: {
    subject: (ref) => `Your GOMP order request ${ref}`,
    heading: 'Thank you!',
    subtitle: 'Your order request has been received',
    reference: 'Reference',
    total: 'Total',
    dateTime: 'Date & time',
    deliverTo: 'For delivery to',
    payment: 'Preferred payment',
    shipping: 'Shipping',
    buildTime: 'Indicative build time',
    items: 'Your build',
    parts: 'Components',
    assembly: 'Assembly & testing',
    shippingFee: 'Shipping',
    free: 'Free',
    discount: 'Discount',
    vatNote: 'Prices include VAT.',
    note: 'Card and wallet payments are not live on GOMP yet, so nothing has been charged. The GOMP team will contact you to confirm availability and complete the order. The final price may vary from the estimate above, depending on component prices and availability at the time of assembly.',
    footer: 'GOMP · Hand-built gaming PCs',
    viewInAccount: 'View this order in your account',
    payments: { card: 'Card', google_pay: 'Google Pay', apple_pay: 'Apple Pay' },
    shippingNames: {
      standard: { name: 'Standard Shipping', eta: '8–12 business days' },
      express: { name: 'Express Shipping', eta: '3–5 business days' },
      overnight: { name: 'Overnight', eta: 'Next business day' },
    },
  },
  sk: {
    subject: (ref) => `Vaša objednávka GOMP ${ref}`,
    heading: 'Ďakujeme!',
    subtitle: 'Vašu žiadosť o objednávku sme prijali',
    reference: 'Referencia',
    total: 'Spolu',
    dateTime: 'Dátum a čas',
    deliverTo: 'Na doručenie na',
    payment: 'Preferovaná platba',
    shipping: 'Doprava',
    buildTime: 'Orientačný čas zostavenia',
    items: 'Vaša zostava',
    parts: 'Komponenty',
    assembly: 'Montáž a testovanie',
    shippingFee: 'Doprava',
    free: 'Zdarma',
    discount: 'Zľava',
    vatNote: 'Ceny sú uvedené vrátane DPH.',
    note: 'Platby kartou a peňaženkou na GOMP ešte nie sú aktívne, takže sa nič nestrhlo. Tím GOMP vás bude kontaktovať, aby potvrdil dostupnosť a dokončil objednávku. Konečná cena sa môže líšiť od uvedeného odhadu podľa cien a dostupnosti komponentov v čase montáže.',
    footer: 'GOMP · Ručne stavané herné PC',
    viewInAccount: 'Zobraziť objednávku vo vašom účte',
    payments: { card: 'Karta', google_pay: 'Google Pay', apple_pay: 'Apple Pay' },
    shippingNames: {
      standard: { name: 'Štandardná doprava', eta: '8 – 12 pracovných dní' },
      express: { name: 'Expresná doprava', eta: '3 – 5 pracovných dní' },
      overnight: { name: 'Cez noc', eta: 'Nasledujúci pracovný deň' },
    },
  },
  cz: {
    subject: (ref) => `Vaše objednávka GOMP ${ref}`,
    heading: 'Děkujeme!',
    subtitle: 'Vaši žádost o objednávku jsme přijali',
    reference: 'Reference',
    total: 'Celkem',
    dateTime: 'Datum a čas',
    deliverTo: 'Pro doručení na',
    payment: 'Preferovaná platba',
    shipping: 'Doprava',
    buildTime: 'Orientační doba sestavení',
    items: 'Vaše sestava',
    parts: 'Komponenty',
    assembly: 'Montáž a testování',
    shippingFee: 'Doprava',
    free: 'Zdarma',
    discount: 'Sleva',
    vatNote: 'Ceny jsou uvedeny včetně DPH.',
    note: 'Platby kartou a peněženkou na GOMP zatím nejsou aktivní, takže nic nebylo strženo. Tým GOMP vás bude kontaktovat, aby potvrdil dostupnost a dokončil objednávku. Konečná cena se může lišit od uvedeného odhadu podle cen a dostupnosti komponent v době montáže.',
    footer: 'GOMP · Ručně stavěná herní PC',
    viewInAccount: 'Zobrazit objednávku ve vašem účtu',
    payments: { card: 'Karta', google_pay: 'Google Pay', apple_pay: 'Apple Pay' },
    shippingNames: {
      standard: { name: 'Standardní doprava', eta: '8–12 pracovních dnů' },
      express: { name: 'Expresní doprava', eta: '3–5 pracovních dnů' },
      overnight: { name: 'Přes noc', eta: 'Následující pracovní den' },
    },
  },
};

const LOCALE: Record<Lang, string> = { en: 'en-GB', sk: 'sk-SK', cz: 'cs-CZ' };
const LONG_DATE_LOCALE: Record<Lang, string> = { en: 'en-US', sk: 'sk-SK', cz: 'cs-CZ' };

// "19 Jun 2025 • 10:15" — 24h, in the customer's own language. Rendered in Prague time so the server
// (UTC) and the customer's browser agree on the same wall-clock string.
export function formatTicketDate(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(LOCALE[lang], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Prague',
  })
    .format(d)
    .replace(',', ' •');
}

// Same rule the checkout page has always used for its "indicative build time": shipping days + 2.
export function estimatedDelivery(iso: string, shippingMethod: OrderTicketData['shippingMethod'], lang: Lang): string {
  const days = shippingMethod === 'overnight' ? 1 : shippingMethod === 'express' ? 5 : 12;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days + 2);
  return d.toLocaleDateString(LONG_DATE_LOCALE[lang], {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Europe/Prague',
  });
}

function hashCode(s: string): number {
  return s.split('').reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
}

// Deterministic 0..1 pseudo-random from a seed (pure — safe to call during render).
export function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Decorative barcode: bar widths derived from the reference code, as in the original component.
// Not scannable and not presented as such.
export function barcodeBars(value: string, count = 60): { width: number }[] {
  const seed = hashCode(value);
  return Array.from({ length: count }, (_, i) => ({ width: seededRandom(seed + i) > 0.7 ? 2.5 : 1.5 }));
}

export const BARCODE_SPACING = 1.5;

export function seedFromString(value: string): number {
  return hashCode(value);
}
