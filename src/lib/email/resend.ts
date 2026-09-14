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
    vatNote: 'Prices include VAT.',
  },
  sk: {
    subject: (ref: string) => `Vaša objednávka GOMP ${ref}`,
    heading: 'Ďakujeme za vašu objednávku.',
    body: 'Vašu žiadosť sme zaznamenali a náš tím sa vám čoskoro ozve, aby potvrdil detaily a platbu. Zatiaľ nebolo nič strhnuté.',
    reference: 'Reference',
    total: 'Spolu',
    vatNote: 'Ceny sú uvedené vrátane DPH.',
  },
  cz: {
    subject: (ref: string) => `Vaše objednávka GOMP ${ref}`,
    heading: 'Děkujeme za vaši objednávku.',
    body: 'Vaši žádost jsme zaznamenali a náš tým se vám brzy ozve, aby potvrdil detaily a platbu. Zatím nebylo nic strhženo.',
    reference: 'Reference',
    total: 'Celkem',
    vatNote: 'Ceny jsou uvedeny včetně DPH.',
  },
} as const;

// Site brand constants (mirrors MAROON/GOLD/PAGE_BG/PANEL_BG/INK/MUTED used throughout
// src/app/page.tsx, SiteFooter.tsx, etc.) — not imported from anywhere, since email HTML can't
// pull in next/font or CSS custom properties; every style here has to be a literal, inline value
// email clients (Outlook included) can render on their own, with web-safe font fallbacks standing
// in for the site's actual Nova Square / DM Sans faces.
const MAROON = '#6E1423';
const GOLD = '#C4A35A';
const PAGE_BG = '#F5F0E6';
const PANEL_BG = '#FDFAF4';
const INK = '#1C1C1A';
const MUTED = '#7A7469';
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = 'Arial, Helvetica, sans-serif';

function fmtKc(n: number): string {
  return `${n.toLocaleString('cs-CZ')} Kč`;
}

function renderHtml(input: OrderConfirmationInput, t: (typeof T)[keyof typeof T]): string {
  const rows = input.buildItems
    .map(
      (item, i, arr) => `
        <tr>
          <td style="padding:10px 0;border-bottom:${i === arr.length - 1 ? 'none' : `1px solid rgba(28,28,26,0.08)`};">
            <div style="font-family:${SANS};font-size:10px;letter-spacing:0.8px;text-transform:uppercase;color:${MUTED};margin-bottom:2px;">${item.category}</div>
            <div style="font-family:${SANS};font-size:13px;color:${INK};">${item.name}</div>
          </td>
          <td align="right" valign="middle" style="padding:10px 0;border-bottom:${i === arr.length - 1 ? 'none' : `1px solid rgba(28,28,26,0.08)`};">
            <span style="font-family:${SERIF};font-size:13px;color:${INK};white-space:nowrap;">${fmtKc(item.price_eur)}</span>
          </td>
        </tr>`,
    )
    .join('');

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE_BG};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${PANEL_BG};border:1px solid rgba(28,28,26,0.1);border-radius:4px;">
            <tr>
              <td style="background:${MAROON};padding:20px 28px;border-radius:4px 4px 0 0;">
                <span style="font-family:${SERIF};font-weight:700;letter-spacing:2px;font-size:20px;color:${GOLD};">GOMP</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 4px;">
                <h1 style="margin:0 0 12px;font-family:${SERIF};font-size:22px;font-weight:700;color:${MAROON};">${t.heading}</h1>
                <p style="margin:0 0 20px;font-family:${SANS};color:${MUTED};font-size:14px;line-height:1.6;">${t.body}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="background:${PAGE_BG};border:1px solid rgba(28,28,26,0.12);border-radius:3px;margin:0 0 24px;">
                  <tr>
                    <td style="padding:10px 14px;font-family:'Courier New',monospace;font-size:13px;color:${MUTED};">
                      ${t.reference}: <strong style="color:${INK};">${input.referenceCode}</strong>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid ${MAROON};">
                  <tr>
                    <td style="padding-top:14px;font-family:${SERIF};font-size:16px;color:${INK};">${t.total}</td>
                    <td align="right" style="padding-top:14px;font-family:${SERIF};font-size:18px;font-weight:700;color:${MAROON};">${fmtKc(input.totalEur)}</td>
                  </tr>
                  <tr>
                    <td colspan="2" align="right" style="padding-top:6px;font-family:${SANS};font-size:11px;color:${MUTED};">${t.vatNote}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:${PAGE_BG};padding:16px 28px;border-top:1px solid rgba(28,28,26,0.08);border-radius:0 0 4px 4px;">
                <span style="font-family:${SANS};font-size:11px;color:${MUTED};">GOMP · Ručne stavané herné počítače</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

export type EmailSendResult = { status: 'sent' } | { status: 'failed'; error: string } | { status: 'skipped' };

export async function sendOrderConfirmationEmail(input: OrderConfirmationInput): Promise<EmailSendResult> {
  const resend = getClient();
  if (!resend) return { status: 'skipped' };

  const lang: Lang = input.lang === 'sk' || input.lang === 'cz' ? input.lang : 'en';
  const t = T[lang];

  try {
    // resend.emails.send() does NOT throw on an API-level rejection (invalid key, invalid from
    // address, quota exceeded, etc.) — like Supabase's client, it resolves normally with an
    // { error } field instead. The try/catch below only catches real network-level exceptions;
    // the `error` check is what actually catches a rejected send.
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: input.to,
      subject: t.subject(input.referenceCode),
      html: renderHtml(input, t),
    });
    if (error) {
      console.error('Order-confirmation email rejected by Resend:', error.message);
      return { status: 'failed', error: error.message };
    }
    return { status: 'sent' };
  } catch (e) {
    console.error('Failed to send order-confirmation email:', e);
    return { status: 'failed', error: e instanceof Error ? e.message : String(e) };
  }
}
