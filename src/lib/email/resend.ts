// SERVER ONLY. Never import this from a client component.
//
// Thin wrapper around Resend for the one transactional email this app sends: an order
// confirmation after /api/checkout records a checkout_intents row. Mirrors the
// "missing key degrades gracefully" pattern already used for the Supabase service-role
// key (see src/lib/supabase/admin-server.ts) — checkout must keep working even before
// Jakub finishes setting up Resend, so a missing RESEND_API_KEY logs a warning and
// no-ops rather than throwing.
//
// RESEND_FROM_EMAIL defaults to Resend's own sandbox address, which only delivers to
// the Resend account's own verified email — enough to test the flow end to end. Real
// customer delivery needs a verified sending domain at Resend and a real
// RESEND_FROM_EMAIL pointing at it.
import { Resend } from 'resend';
import type { Lang } from '@/lib/gomp-storage';

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || 'GOMP <onboarding@resend.dev>';

let client: Resend | null | undefined;

function getClient(): Resend | null {
  if (client !== undefined) return client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY is not set — skipping order-confirmation email.');
    client = null;
    return client;
  }
  client = new Resend(apiKey);
  return client;
}

export type OrderConfirmationInput = {
  to: string;
  referenceCode: string;
  buildItems: { category: string; name: string; price_eur: number }[];
  totalEur: number;
  lang: string;
};

const T = {
  en: {
    subject: (ref: string) => `Your GOMP order request ${ref}`,
    heading: 'Thanks for your order request.',
    body: 'We’ve recorded your request and a member of our team will be in touch shortly to confirm details and payment. Nothing has been charged yet.',
    reference: 'Reference',
    total: 'Total',
  },
  sk: {
    subject: (ref: string) => `Vaša objednávka GOMP ${ref}`,
    heading: 'Ďakujeme za vašu objednávku.',
    body: 'Vašu žiadosť sme zaznamenali a náš tím sa vám čoskoro ozve, aby potvrdil detaily a platbu. Zatiaľ nebolo nič strhnuté.',
    reference: 'Reference',
    total: 'Spolu',
  },
  cz: {
    subject: (ref: string) => `Vaše objednávka GOMP ${ref}`,
    heading: 'Děkujeme za vaši objednávku.',
    body: 'Vaši žádost jsme zaznamenali a náš tým se vám brzy ozve, aby potvrdil detaily a platbu. Zatím nebylo nic strhženo.',
    reference: 'Reference',
    total: 'Celkem',
  },
} as const;

function renderHtml(input: OrderConfirmationInput, t: (typeof T)[keyof typeof T]): string {
  const rows = input.buildItems
    .map(
      (item) =>
        `<tr><td style="padding:6px 0;color:#7A7469;font-size:13px;">${item.category}</td><td style="padding:6px 0;font-size:13px;">${item.name}</td></tr>`,
    )
    .join('');
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1C1C1A;">
      <h2 style="margin:0 0 12px;">${t.heading}</h2>
      <p style="color:#7A7469;line-height:1.6;">${t.body}</p>
      <p style="font-family:monospace;font-size:13px;color:#7A7469;">${t.reference}: <strong>${input.referenceCode}</strong></p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">${rows}</table>
      <p style="font-size:15px;"><strong>${t.total}: ${input.totalEur.toLocaleString('cs-CZ')} Kč</strong></p>
    </div>
  `;
}

export async function sendOrderConfirmationEmail(input: OrderConfirmationInput): Promise<void> {
  const resend = getClient();
  if (!resend) return;

  const lang: Lang = input.lang === 'sk' || input.lang === 'cz' ? input.lang : 'en';
  const t = T[lang];

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: input.to,
      subject: t.subject(input.referenceCode),
      html: renderHtml(input, t),
    });
  } catch (e) {
    console.error('Failed to send order-confirmation email:', e);
  }
}
