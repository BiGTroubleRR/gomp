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
//
// The email is the HTML twin of the on-screen order ticket (src/components/OrderTicket.tsx): both
// are fed the same OrderTicketData and copy from src/lib/order-ticket.ts. Email clients can't run
// next/font, CSS variables, flexbox/absolute positioning or inline SVG, so this is a <table> layout
// with fully inline styles, web-safe font stacks and a barcode made of table cells. It uses the
// site's dark palette from design-tokens.ts; every dark surface is set via both a `bgcolor`
// attribute and inline CSS, plus color-scheme meta tags, so dark-mode clients don't re-invert it.
import { Resend } from 'resend';
import {
  type OrderTicketData,
  TICKET_T,
  BARCODE_SPACING,
  barcodeBars,
  estimatedDelivery,
  formatTicketDate,
  ticketMoney,
} from '@/lib/order-ticket';
import { ACCENT, ACCENT_DEEP, ACCENT_FILL, ON_ACCENT, BORDER, BORDER_STRONG, GOLD, INK, MUTED, PANEL_BG, SURFACE_ALT } from '@/lib/design-tokens';

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

export type OrderConfirmationInput = OrderTicketData;

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = 'Arial, Helvetica, sans-serif';
const MONO = "'Courier New', Courier, monospace";
// ACCENT at ~12% over PANEL_BG — the check-circle fill (email clients can't blend alpha reliably).
const CHECK_FILL = '#182C22';
// The email's surround is white (the dark ticket card sits on it); the ticket's cut-out notches are
// painted in this colour so they read as bites out of the card.
const EMAIL_BG = '#FFFFFF';

// Customer-typed text (name, address, item names) goes into the markup — always escape it.
function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const label = (text: string) =>
  `<div style="font-family:${SANS};font-size:10px;letter-spacing:1px;text-transform:uppercase;color:${MUTED};margin-bottom:4px;">${esc(text)}</div>`;

// Dashed divider with the two ticket cut-outs (rounded cells in the page colour; they degrade to plain
// square gaps in clients without border-radius support, e.g. desktop Outlook).
function tearLine(): string {
  const notch = (radius: string) =>
    `<td width="16" bgcolor="${EMAIL_BG}" style="width:16px;height:32px;background:${EMAIL_BG};border-radius:${radius};font-size:0;line-height:0;">&nbsp;</td>`;
  return `
    <tr><td style="padding:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        ${notch('0 16px 16px 0')}
        <td valign="middle" style="padding:0 12px;font-size:0;line-height:0;"><div style="border-top:2px dashed ${BORDER_STRONG};height:0;font-size:0;line-height:0;">&nbsp;</div></td>
        ${notch('16px 0 0 16px')}
      </tr></table>
    </td></tr>`;
}

function barcode(value: string): string {
  const cells = barcodeBars(value)
    .map(
      (bar, i, arr) =>
        `<td width="${bar.width}" bgcolor="${INK}" style="width:${bar.width}px;height:46px;background:${INK};font-size:0;line-height:0;">&nbsp;</td>` +
        (i < arr.length - 1 ? `<td width="${BARCODE_SPACING}" style="width:${BARCODE_SPACING}px;font-size:0;line-height:0;">&nbsp;</td>` : ''),
    )
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>${cells}</tr></table>`;
}

function renderHtml(d: OrderTicketData): string {
  const t = TICKET_T[d.lang];
  const money = (n: number) => ticketMoney(n, d.currency);
  const ship = t.shippingNames[d.shippingMethod];
  const eta = estimatedDelivery(d.createdAt, d.shippingMethod, d.lang);

  const itemRows = d.items
    .map((item, i, arr) => {
      const border = i === arr.length - 1 ? 'none' : `1px solid ${BORDER}`;
      return `
        <tr>
          <td style="padding:9px 0;border-bottom:${border};">
            <div style="font-family:${SANS};font-size:10px;letter-spacing:0.8px;text-transform:uppercase;color:${MUTED};margin-bottom:2px;">${esc(item.category)}</div>
            <div style="font-family:${SANS};font-size:13px;color:${INK};">${esc(item.name)}</div>
          </td>
          <td align="right" valign="middle" style="padding:9px 0 9px 12px;border-bottom:${border};">
            <span style="font-family:${SERIF};font-size:13px;color:${INK};white-space:nowrap;">${money(item.price)}</span>
          </td>
        </tr>`;
    })
    .join('');

  const sumRow = (name: string, value: string, color: string = MUTED) => `
        <tr>
          <td style="padding:3px 0;font-family:${SANS};font-size:12px;color:${MUTED};">${esc(name)}</td>
          <td align="right" style="padding:3px 0;font-family:${SANS};font-size:12px;color:${color};white-space:nowrap;">${value}</td>
        </tr>`;
  const breakdown =
    sumRow(t.parts, money(d.partsTotal)) +
    sumRow(t.assembly, money(d.assembly)) +
    sumRow(`${t.shippingFee} · ${ship.name}`, d.shipping > 0 ? money(d.shipping) : esc(t.free)) +
    (d.discount > 0 ? sumRow(d.promoCode ? `${t.discount} (${d.promoCode})` : t.discount, `−${money(d.discount)}`, ACCENT) : '');

  // Bulletproof button: a padded <a> inside a coloured <td>, so it renders in every mail client.
  const accountButton = d.accountUrl
    ? `
        <tr>
          <td align="center" style="padding:10px 28px 28px;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td align="center" bgcolor="${ACCENT_FILL}" style="background:${ACCENT_FILL};border-radius:6px;">
                <a href="${esc(d.accountUrl)}" style="display:inline-block;padding:13px 26px;font-family:${SANS};font-size:14px;font-weight:700;color:${ON_ACCENT};text-decoration:none;">${esc(t.viewInAccount)} &rarr;</a>
              </td>
            </tr></table>
          </td>
        </tr>`
    : '';

  const addressHtml = [d.customerName, ...d.addressLines, d.email].filter(Boolean).map(esc).join('<br>');

  return `<!doctype html>
<html lang="${d.lang === 'cz' ? 'cs' : d.lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${esc(t.subject(d.referenceCode))}</title>
</head>
<body bgcolor="${EMAIL_BG}" style="margin:0;padding:0;background:${EMAIL_BG};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${EMAIL_BG}" style="background:${EMAIL_BG};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${PANEL_BG}" style="max-width:480px;background:${PANEL_BG};border:1px solid ${ACCENT_DEEP};border-radius:16px;">
        <tr>
          <td align="center" bgcolor="${SURFACE_ALT}" style="background:${SURFACE_ALT};padding:20px 28px;border-radius:15px 15px 0 0;border-bottom:3px solid ${ACCENT_DEEP};">
            <span style="font-family:${SERIF};font-weight:700;letter-spacing:4px;font-size:22px;color:${GOLD};">◆ GOMP</span>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:30px 28px 26px;">
            <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
              <td align="center" valign="middle" width="60" height="60" bgcolor="${CHECK_FILL}" style="width:60px;height:60px;background:${CHECK_FILL};border:1px solid ${ACCENT_DEEP};border-radius:30px;font-family:${SANS};font-size:28px;line-height:60px;color:${ACCENT};">&#10003;</td>
            </tr></table>
            <h1 style="margin:18px 0 6px;font-family:${SERIF};font-size:26px;font-weight:700;color:${INK};">${esc(t.heading)}</h1>
            <p style="margin:0;font-family:${SANS};font-size:14px;line-height:1.5;color:${MUTED};">${esc(t.subtitle)}</p>
          </td>
        </tr>
        ${tearLine()}
        <tr>
          <td style="padding:22px 28px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td valign="top">${label(t.reference)}<div style="font-family:${MONO};font-size:15px;font-weight:700;color:${GOLD};">${esc(d.referenceCode)}</div></td>
              <td valign="top" align="right">${label(t.total)}<div style="font-family:${SERIF};font-size:22px;font-weight:700;color:${ACCENT};white-space:nowrap;">${money(d.total)}</div></td>
            </tr></table>
            <div style="height:18px;line-height:18px;font-size:0;">&nbsp;</div>
            ${label(t.dateTime)}<div style="font-family:${SANS};font-size:14px;color:${INK};">${esc(formatTicketDate(d.createdAt, d.lang))}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 28px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${SURFACE_ALT}" style="background:${SURFACE_ALT};border:1px solid ${BORDER};border-radius:10px;"><tr><td style="padding:16px;">
              ${label(t.deliverTo)}<div style="font-family:${SANS};font-size:13px;line-height:1.6;color:${INK};">${addressHtml}</div>
              <div style="border-top:1px solid ${BORDER};margin:14px 0;height:0;font-size:0;line-height:0;">&nbsp;</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td valign="top">${label(t.payment)}<div style="font-family:${SANS};font-size:13px;font-weight:700;color:${INK};">${esc(t.payments[d.paymentMethod])}</div></td>
                <td valign="top" align="right">${label(t.shipping)}<div style="font-family:${SANS};font-size:13px;font-weight:700;color:${INK};">${esc(ship.name)}</div><div style="font-family:${SANS};font-size:11px;color:${MUTED};">${esc(ship.eta)}</div></td>
              </tr></table>
              <div style="border-top:1px solid ${BORDER};margin:14px 0;height:0;font-size:0;line-height:0;">&nbsp;</div>
              ${label(t.buildTime)}<div style="font-family:${SERIF};font-size:15px;color:${INK};">${esc(eta)}</div>
            </td></tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 28px 0;">
            ${label(t.items)}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows}</table>
            <div style="border-top:1px solid ${BORDER_STRONG};margin:6px 0 8px;height:0;font-size:0;line-height:0;">&nbsp;</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${breakdown}
              <tr>
                <td style="padding-top:12px;border-top:2px solid ${ACCENT_DEEP};font-family:${SERIF};font-size:16px;color:${INK};">${esc(t.total)}</td>
                <td align="right" style="padding-top:12px;border-top:2px solid ${ACCENT_DEEP};font-family:${SERIF};font-size:18px;font-weight:700;color:${ACCENT};white-space:nowrap;">${money(d.total)}</td>
              </tr>
              <tr><td colspan="2" align="right" style="padding-top:6px;font-family:${SANS};font-size:11px;color:${MUTED};">${esc(t.vatNote)}</td></tr>
            </table>
          </td>
        </tr>
        <tr><td style="height:24px;font-size:0;line-height:0;">&nbsp;</td></tr>
        ${tearLine()}
        <tr>
          <td align="center" style="padding:22px 28px 8px;">
            ${barcode(d.referenceCode)}
            <div style="margin-top:10px;font-family:${MONO};font-size:12px;letter-spacing:4px;color:${MUTED};">${esc(d.referenceCode)}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 28px ${d.accountUrl ? '8px' : '26px'};font-family:${SANS};font-size:11.5px;line-height:1.7;color:${MUTED};">${esc(t.note)}</td>
        </tr>${accountButton}
        <tr>
          <td align="center" bgcolor="${SURFACE_ALT}" style="background:${SURFACE_ALT};padding:14px 28px;border-top:1px solid ${BORDER};border-radius:0 0 15px 15px;font-family:${SANS};font-size:11px;color:${MUTED};">${esc(t.footer)}</td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function renderText(d: OrderTicketData): string {
  const t = TICKET_T[d.lang];
  const money = (n: number) => ticketMoney(n, d.currency);
  const ship = t.shippingNames[d.shippingMethod];
  const lines = [
    `${t.heading} ${t.subtitle}`,
    '',
    `${t.reference}: ${d.referenceCode}`,
    `${t.dateTime}: ${formatTicketDate(d.createdAt, d.lang)}`,
    '',
    `${t.deliverTo}:`,
    ...[d.customerName, ...d.addressLines, d.email].filter(Boolean),
    '',
    `${t.payment}: ${t.payments[d.paymentMethod]}`,
    `${t.shipping}: ${ship.name} (${ship.eta})`,
    `${t.buildTime}: ${estimatedDelivery(d.createdAt, d.shippingMethod, d.lang)}`,
    '',
    `${t.items}:`,
    ...d.items.map((i) => `- ${i.category}: ${i.name} — ${money(i.price)}`),
    '',
    `${t.parts}: ${money(d.partsTotal)}`,
    `${t.assembly}: ${money(d.assembly)}`,
    `${t.shippingFee}: ${d.shipping > 0 ? money(d.shipping) : t.free}`,
    ...(d.discount > 0 ? [`${t.discount}: −${money(d.discount)}`] : []),
    `${t.total}: ${money(d.total)} (${t.vatNote})`,
    '',
    t.note,
    ...(d.accountUrl ? ['', `${t.viewInAccount}: ${d.accountUrl}`] : []),
    '',
    t.footer,
  ];
  return lines.join('\n');
}

// Exposed for the scratch preview script / tests — renders without sending anything.
export function renderOrderConfirmation(d: OrderTicketData): { subject: string; html: string; text: string } {
  return { subject: TICKET_T[d.lang].subject(d.referenceCode), html: renderHtml(d), text: renderText(d) };
}

export type EmailSendResult = { status: 'sent' } | { status: 'failed'; error: string } | { status: 'skipped' };

export async function sendOrderConfirmationEmail(input: OrderConfirmationInput): Promise<EmailSendResult> {
  const resend = getClient();
  if (!resend) return { status: 'skipped' };

  try {
    const { subject, html, text } = renderOrderConfirmation(input);
    // resend.emails.send() does NOT throw on an API-level rejection (invalid key, invalid from
    // address, quota exceeded, etc.) — like Supabase's client, it resolves normally with an
    // { error } field instead. The try/catch below only catches real network-level exceptions;
    // the `error` check is what actually catches a rejected send.
    const { error } = await resend.emails.send({ from: FROM_ADDRESS, to: input.email, subject, html, text });
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
