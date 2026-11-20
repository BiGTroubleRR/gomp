// SERVER ONLY. Renders an InvoiceData to an A4 PDF (pdf-lib + embedded Inter, so č ď ľ ň š ž ô ä … print
// correctly) with a payment QR code. Returns the PDF bytes.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { INVOICE_T, invoiceTotals, type InvoiceData } from './invoice';
import { paymentAmount, paymentQrPayload, qrMatrix } from './qr';

const A4: [number, number] = [595.28, 841.89];
const M = 44; // page margin
const INK = rgb(0.09, 0.12, 0.1);
const MUTED = rgb(0.4, 0.45, 0.42);
const LINE = rgb(0.86, 0.88, 0.87);
const ACCENT = rgb(0.1, 0.52, 0.34);
const GOLD = rgb(0.72, 0.56, 0.2);
const PANEL = rgb(0.96, 0.975, 0.965);

const FONT_DIR = path.join(process.cwd(), 'src', 'lib', 'invoice', 'fonts');
let fontBytes: Promise<[Buffer, Buffer]> | null = null;
function loadFonts() {
  fontBytes ??= Promise.all([readFile(path.join(FONT_DIR, 'DMSans-Regular.ttf')), readFile(path.join(FONT_DIR, 'DMSans-Bold.ttf'))]);
  return fontBytes;
}

const LOCALE = { en: 'en-GB', sk: 'sk-SK', cz: 'cs-CZ' } as const;

// Non-breaking / narrow spaces from Intl become plain spaces, so every glyph exists in the font.
const clean = (s: string) => s.replace(/[  ]/g, ' ');

function money(n: number, currency: 'eur' | 'czk', lang: InvoiceData['lang']): string {
  const v = new Intl.NumberFormat(LOCALE[lang], { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  return clean(`${v} ${currency === 'eur' ? '€' : 'Kč'}`);
}

function dateStr(iso: string, lang: InvoiceData['lang']): string {
  return clean(
    new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'Europe/Prague' }).format(new Date(iso)),
  );
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) line = test;
    else {
      if (line) out.push(line);
      line = word;
    }
  }
  if (line) out.push(line);
  return out.length ? out : [''];
}

export async function renderInvoicePdf(inv: InvoiceData): Promise<Uint8Array> {
  const t = INVOICE_T[inv.lang];
  const [regularBytes, boldBytes] = await loadFonts();
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const reg = await pdf.embedFont(regularBytes);
  const bold = await pdf.embedFont(boldBytes);
  pdf.setTitle(`${t.title[inv.kind]} ${inv.number}`);
  pdf.setAuthor(inv.seller.name);
  pdf.setProducer('GOMP');

  let page: PDFPage = pdf.addPage(A4);
  const W = A4[0];
  const H = A4[1];
  let y = H - M;

  const text = (s: string, x: number, yy: number, size = 9.5, font = reg, color = INK, align: 'left' | 'right' = 'left') => {
    const w = font.widthOfTextAtSize(s, size);
    page.drawText(s, { x: align === 'right' ? x - w : x, y: yy, size, font, color });
  };
  const rule = (yy: number, x1 = M, x2 = W - M, color = LINE, thickness = 0.7) =>
    page.drawLine({ start: { x: x1, y: yy }, end: { x: x2, y: yy }, thickness, color });
  const cur = inv.currency;
  const m = (n: number) => money(n, cur, inv.lang);
  const totals = invoiceTotals(inv.lines, inv.vatRatePct);

  // ---- Header: wordmark + title -------------------------------------------------------------
  text('GOMP', M, y - 20, 26, bold, ACCENT);
  page.drawRectangle({ x: M, y: y - 30, width: 34, height: 2.5, color: GOLD });
  text(t.title[inv.kind].toUpperCase(), W - M, y - 8, 14, bold, INK, 'right');
  text(`${t.numberLabel} ${inv.number}`, W - M, y - 26, 11, reg, MUTED, 'right');
  y -= 50;
  rule(y);
  y -= 18;

  // ---- Seller / buyer -----------------------------------------------------------------------
  const colW = (W - 2 * M - 24) / 2;
  const party = (title: string, name: string, lines: string[], ids: [string, string][], x: number): number => {
    let yy = y;
    text(title.toUpperCase(), x, yy, 7.5, bold, MUTED);
    yy -= 14;
    for (const l of wrap(name, bold, 11, colW)) {
      text(l, x, yy, 11, bold);
      yy -= 14;
    }
    for (const line of lines) {
      for (const l of wrap(line, reg, 9.5, colW)) {
        text(l, x, yy, 9.5);
        yy -= 12.5;
      }
    }
    yy -= 4;
    for (const [k, v] of ids) {
      if (!v) continue;
      text(`${k}: ${v}`, x, yy, 9, reg, MUTED);
      yy -= 12;
    }
    return yy;
  };
  const sellerIds: [string, string][] = [
    [t.ico, inv.seller.ico],
    [t.dic, inv.seller.dic],
    [t.icDph, inv.seller.vatPayer ? inv.seller.icDph : ''],
  ];
  const buyerIds: [string, string][] = [
    [t.ico, inv.buyer.ico ?? ''],
    [t.dic, inv.buyer.dic ?? ''],
    [t.icDph, inv.buyer.icDph ?? ''],
  ];
  const buyerLines = [...inv.buyer.addressLines.filter((l) => l !== inv.buyer.email), inv.buyer.email];
  const y1 = party(t.seller, inv.seller.name, inv.seller.addressLines, sellerIds, M);
  const y2 = party(t.buyer, inv.buyer.name || inv.buyer.email, buyerLines, buyerIds, M + colW + 24);
  y = Math.min(y1, y2) - 8;

  // ---- Meta strip ---------------------------------------------------------------------------
  const metaH = 40;
  page.drawRectangle({ x: M, y: y - metaH, width: W - 2 * M, height: metaH, color: PANEL });
  const meta: [string, string][] = [
    [t.issued, dateStr(inv.issueDate, inv.lang)],
    [t.due, dateStr(inv.dueDate, inv.lang)],
    [t.payment, inv.paymentLabel],
    [t.variableSymbol, inv.variableSymbol],
  ];
  const cw = (W - 2 * M - 24) / meta.length;
  meta.forEach(([k, v], i) => {
    const x = M + 12 + i * cw;
    text(k.toUpperCase(), x, y - 15, 7, bold, MUTED);
    text(v, x, y - 30, 10, bold);
  });
  y -= metaH + 20;

  // ---- Items table --------------------------------------------------------------------------
  const xDesc = M;
  const xQty = W - M - 230;
  const xUnit = W - M - 120;
  const xTot = W - M;
  const headRow = () => {
    text(t.description.toUpperCase(), xDesc, y, 7.5, bold, MUTED);
    text(t.qty.toUpperCase(), xQty, y, 7.5, bold, MUTED, 'right');
    text(t.unitPrice.toUpperCase(), xUnit, y, 7.5, bold, MUTED, 'right');
    text(t.amount.toUpperCase(), xTot, y, 7.5, bold, MUTED, 'right');
    y -= 7;
    rule(y, M, W - M, INK, 1);
    y -= 14;
  };
  headRow();
  for (const l of inv.lines) {
    const descX = xDesc + 70;
    const descLines = wrap(l.description, reg, 9, xQty - descX - 40);
    const rowH = descLines.length * 11.5 + 1;
    if (y - rowH < M + 40) {
      page = pdf.addPage(A4);
      y = H - M;
      headRow();
    }
    if (l.detail) text(l.detail.toUpperCase().slice(0, 14), xDesc, y, 6.3, bold, MUTED);
    descLines.forEach((d, i) => text(d, descX, y - i * 11.5, 9));
    text(String(l.qty), xQty, y, 9, reg, INK, 'right');
    text(m(l.unitGross), xUnit, y, 9, reg, INK, 'right');
    text(m(l.qty * l.unitGross), xTot, y, 9, bold, l.unitGross < 0 ? ACCENT : INK, 'right');
    y -= rowH;
    rule(y + 4);
    y -= 7;
  }

  // ---- Totals -------------------------------------------------------------------------------
  y -= 2;
  const tx = W - M - 210;
  const totalRow = (k: string, v: string) => {
    text(k, tx, y, 9.5, reg, MUTED);
    text(v, xTot, y, 9.5, reg, INK, 'right');
    y -= 13;
  };
  if (inv.seller.vatPayer) {
    totalRow(t.base, m(totals.net));
    totalRow(`${t.vat} ${inv.vatRatePct} %`, m(totals.vat));
  }
  y -= 12;
  page.drawRectangle({ x: tx - 10, y: y - 9, width: xTot - tx + 10, height: 27, color: ACCENT });
  text(inv.kind === 'proforma' ? t.toPay.toUpperCase() : t.amount.toUpperCase(), tx, y + 1, 9, bold, rgb(1, 1, 1));
  text(m(paymentAmount(inv)), xTot - 10, y, 13, bold, rgb(1, 1, 1), 'right');
  y -= 32;
  if (!inv.seller.vatPayer) {
    text(t.notVatPayer, M, y + 20, 8.5, reg, MUTED);
  }

  // ---- Payment block with QR ----------------------------------------------------------------
  const blockH = 112;
  if (y - blockH < M + 70) {
    page = pdf.addPage(A4);
    y = H - M;
  }
  page.drawRectangle({ x: M, y: y - blockH, width: W - 2 * M, height: blockH, color: PANEL });
  page.drawRectangle({ x: M, y: y - blockH, width: 3, height: blockH, color: ACCENT });
  text(t.payBlock.toUpperCase(), M + 18, y - 20, 7.5, bold, MUTED);
  const pay: [string, string][] = [
    [t.iban, inv.seller.iban],
    [t.bic, inv.seller.bic],
    [t.bank, inv.seller.bankName],
    ...(inv.currency === 'czk' && inv.seller.czAccount ? ([[t.account, inv.seller.czAccount]] as [string, string][]) : []),
    [t.variableSymbol, inv.variableSymbol],
    [t.toPay, m(paymentAmount(inv))],
  ];
  pay.forEach(([k, v], i) => {
    const yy = y - 36 - i * 13.5;
    text(k, M + 18, yy, 9, reg, MUTED);
    text(v, M + 100, yy, 9.5, bold);
  });
  // QR
  let qrPayload: ReturnType<typeof paymentQrPayload> | null = null;
  try {
    qrPayload = paymentQrPayload(inv);
  } catch {
    qrPayload = null; // IBAN not filled in / invalid yet: the invoice still renders, just without a QR code
  }
  const matrix = qrPayload ? qrMatrix(qrPayload.text) : [];
  const standard = qrPayload?.standard ?? 'spayd';
  const quiet = 2;
  const modules = matrix.length + quiet * 2;
  const qrSize = 88;
  const cell = qrSize / modules;
  const qx = W - M - qrSize - 14;
  const qy = y - blockH + 18; // bottom of the QR
  page.drawRectangle({ x: qx - 3, y: qy - 3, width: qrSize + 6, height: qrSize + 6, color: rgb(1, 1, 1), borderColor: LINE, borderWidth: 0.7 });
  if (!qrPayload) text('QR', qx + qrSize / 2 - 7, qy + qrSize / 2 - 4, 14, bold, LINE);
  matrix.forEach((row, r) =>
    row.forEach((on, c) => {
      if (on) page.drawRectangle({ x: qx + (c + quiet) * cell, y: qy + qrSize - (r + quiet + 1) * cell, width: cell + 0.15, height: cell + 0.15, color: INK });
    }),
  );
  const caption = inv.lang === 'en' ? t.qrCaptionEn : standard === 'bysquare' ? t.qrCaption.sk : t.qrCaption.cz;
  const capW = reg.widthOfTextAtSize(caption, 7);
  text(caption, qx + qrSize / 2 - capW / 2, qy - 14, 7, reg, MUTED);
  y -= blockH + 14;

  // ---- Footer -------------------------------------------------------------------------------
  const footer: string[] = [];
  if (inv.seller.registration) footer.push(inv.seller.registration);
  footer.push(inv.kind === 'proforma' ? t.footerProforma : t.footerInvoice);
  footer.push(`${t.orderRef}: ${inv.orderRef}`);
  const contact = [inv.seller.email, inv.seller.phone, inv.seller.web].filter(Boolean).join('  ·  ');
  let fy = M + 12 + footer.reduce((n, f) => n + wrap(f, reg, 7.5, W - 2 * M).length * 10, 0);
  rule(fy + 8);
  for (const f of footer) {
    for (const l of wrap(f, reg, 7.5, W - 2 * M)) {
      text(l, M, fy - 4, 7.5, reg, MUTED);
      fy -= 10;
    }
  }
  const cWidth = bold.widthOfTextAtSize(contact, 8);
  text(contact, W - M - cWidth, M - 4, 8, bold, ACCENT);
  text('GOMP', M, M - 4, 8, bold, ACCENT);

  // page numbers when it spilled over
  const pages = pdf.getPages();
  if (pages.length > 1) {
    pages.forEach((p, i) => {
      const label = `${t.page} ${i + 1}/${pages.length}`;
      p.drawText(label, { x: W / 2 - reg.widthOfTextAtSize(label, 7.5) / 2, y: M - 20, size: 7.5, font: reg, color: MUTED });
    });
  }
  return pdf.save();
}
