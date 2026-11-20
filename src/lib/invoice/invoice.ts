// SERVER ONLY. Invoice data model, wording (sk / cz / en) and the conversion from an order snapshot
// (OrderTicketData, the same object the confirmation email is built from) into an InvoiceData.
//
// The checkout stores amounts in CZK, gross (VAT included); EUR is derived at the site's reference
// rate (1 € = 24.30 Kč, see fmtPrice in gomp-storage.ts). Invoices are issued in the currency the
// customer saw: EUR for Slovak customers, CZK for Czech ones.
import type { Currency, Lang } from '@/lib/gomp-storage';
import { type OrderTicketData, TICKET_T } from '@/lib/order-ticket';
import { type InvoiceSeller, SELLER } from './company';

export const EUR_RATE = 24.3;

// 'proforma' = zálohová faktúra (advance / proforma invoice, no tax document). 'invoice' = daňový doklad.
export type InvoiceKind = 'proforma' | 'invoice';

export type InvoiceLine = { description: string; detail?: string; imageUrl?: string; qty: number; unitGross: number };

export type InvoiceData = {
  kind: InvoiceKind;
  number: string; // also used as the variable symbol when it is numeric
  variableSymbol: string;
  issueDate: string; // ISO
  dueDate: string; // ISO
  taxPointDate: string; // ISO (dátum dodania / DUZP)
  lang: Lang;
  currency: Currency;
  vatRatePct: number;
  seller: InvoiceSeller;
  buyer: { name: string; addressLines: string[]; email: string; phone?: string; ico?: string; dic?: string; icDph?: string };
  lines: InvoiceLine[]; // amounts in the invoice currency, gross, may include a negative discount line
  paymentLabel: string;
  note?: string;
  orderRef: string;
};

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// CZK (native) -> invoice currency, 2 decimals.
export function toCurrency(czk: number, currency: Currency): number {
  return currency === 'eur' ? round2(czk / EUR_RATE) : round2(czk);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

// Numbering. TODO: replace with a real gap-free sequence stored in the database (one counter per year and
// per document type) once the accountant confirms the scheme. Until then it is derived from the order
// reference: <year><last 4 digits of the reference> — unique enough for a template, not for real books.
export function provisionalInvoiceNumber(orderRef: string, issuedIso: string, kind: InvoiceKind): string {
  const year = new Date(issuedIso).getUTCFullYear();
  const digits = orderRef.replace(/\D/g, '').slice(-6).padStart(6, '0');
  return `${kind === 'proforma' ? '1' : '2'}${String(year).slice(-2)}${digits}`;
}

export type Totals = { gross: number; net: number; vat: number };

export function invoiceTotals(lines: InvoiceLine[], vatRatePct: number): Totals {
  const gross = round2(lines.reduce((s, l) => s + l.qty * l.unitGross, 0));
  const net = round2(gross / (1 + vatRatePct / 100));
  return { gross, net, vat: round2(gross - net) };
}

type LineWords = { parts: string; assembly: string; shipping: string; discount: string; freeShipping: string };
const LINE_WORDS: Record<Lang, LineWords> = {
  en: { parts: 'Components', assembly: 'Assembly & testing', shipping: 'Shipping', discount: 'Discount', freeShipping: 'free' },
  sk: { parts: 'Komponenty', assembly: 'Montáž a testovanie', shipping: 'Doprava', discount: 'Zľava', freeShipping: 'zdarma' },
  cz: { parts: 'Komponenty', assembly: 'Montáž a testování', shipping: 'Doprava', discount: 'Sleva', freeShipping: 'zdarma' },
};

// One component per line (so the customer and the accountant see what is on the invoice), then assembly,
// shipping and an optional discount.
export function buildInvoiceFromOrder(
  order: OrderTicketData,
  opts: { kind?: InvoiceKind; vatRatePct: number; imageByName?: Record<string, string>; seller?: InvoiceSeller; invoiceNumber?: string; dueDays?: number },
): InvoiceData {
  const kind = opts.kind ?? 'proforma';
  const { lang, currency } = order;
  const w = LINE_WORDS[lang];
  const t = TICKET_T[lang];
  const money = (czk: number) => toCurrency(czk, currency);

  const lines: InvoiceLine[] = order.items.map((i) => ({
    description: i.name,
    detail: i.category || undefined,
    imageUrl: opts.imageByName?.[i.name],
    qty: 1,
    unitGross: money(i.price),
  }));
  lines.push({ description: w.assembly, qty: 1, unitGross: money(order.assembly) });
  lines.push({ description: `${w.shipping} · ${t.shippingNames[order.shippingMethod].name}`, qty: 1, unitGross: money(order.shipping) });
  if (order.discount > 0) {
    lines.push({ description: order.promoCode ? `${w.discount} (${order.promoCode})` : w.discount, qty: 1, unitGross: -money(order.discount) });
  }

  const number = opts.invoiceNumber ?? provisionalInvoiceNumber(order.referenceCode, order.createdAt, kind);
  return {
    kind,
    number,
    variableSymbol: number.replace(/\D/g, '').slice(0, 10),
    issueDate: order.createdAt,
    dueDate: addDays(order.createdAt, opts.dueDays ?? 7),
    taxPointDate: order.createdAt,
    lang,
    currency,
    vatRatePct: opts.vatRatePct,
    seller: opts.seller ?? SELLER,
    buyer: { name: order.customerName, addressLines: order.addressLines, email: order.email },
    lines,
    paymentLabel: lang === 'en' ? 'Bank transfer' : lang === 'sk' ? 'Prevodom na účet' : 'Bankovním převodem',
    orderRef: order.referenceCode,
  };
}

type InvoiceCopy = {
  title: Record<InvoiceKind, string>;
  numberLabel: string;
  seller: string;
  buyer: string;
  ico: string;
  dic: string;
  icDph: string;
  issued: string;
  due: string;
  taxPoint: string;
  payment: string;
  variableSymbol: string;
  description: string;
  qty: string;
  unitPrice: string;
  amount: string;
  base: string;
  vat: string;
  toPay: string;
  paid: string;
  payBlock: string;
  iban: string;
  bic: string;
  bank: string;
  account: string;
  qrCaption: Record<'sk' | 'cz', string>;
  qrCaptionEn: string;
  orderRef: string;
  footerProforma: string;
  footerInvoice: string;
  notVatPayer: string;
  page: string;
};

export const INVOICE_T: Record<Lang, InvoiceCopy> = {
  sk: {
    title: { proforma: 'Zálohová faktúra', invoice: 'Faktúra – daňový doklad' },
    numberLabel: 'č.',
    seller: 'Dodávateľ',
    buyer: 'Odberateľ',
    ico: 'IČO',
    dic: 'DIČ',
    icDph: 'IČ DPH',
    issued: 'Dátum vystavenia',
    due: 'Dátum splatnosti',
    taxPoint: 'Dátum dodania',
    payment: 'Spôsob úhrady',
    variableSymbol: 'Variabilný symbol',
    description: 'Popis',
    qty: 'Množstvo',
    unitPrice: 'Cena / ks s DPH',
    amount: 'Spolu s DPH',
    base: 'Základ dane',
    vat: 'DPH',
    toPay: 'K úhrade',
    paid: 'Uhradené',
    payBlock: 'Platobné údaje',
    iban: 'IBAN',
    bic: 'BIC / SWIFT',
    bank: 'Banka',
    account: 'Číslo účtu',
    qrCaption: { sk: 'Platba QR kódom (PAY by square)', cz: 'Platba QR kódem' },
    qrCaptionEn: 'Pay by QR code',
    orderRef: 'Objednávka',
    footerProforma: 'Zálohová faktúra nie je daňový doklad. Daňový doklad vystavíme po prijatí platby a dodaní tovaru.',
    footerInvoice: 'Faktúra bola vystavená elektronicky a je platná bez podpisu a pečiatky.',
    notVatPayer: 'Dodávateľ nie je platiteľ DPH.',
    page: 'Strana',
  },
  cz: {
    title: { proforma: 'Zálohová faktura', invoice: 'Faktura – daňový doklad' },
    numberLabel: 'č.',
    seller: 'Dodavatel',
    buyer: 'Odběratel',
    ico: 'IČO',
    dic: 'DIČ',
    icDph: 'IČ DPH',
    issued: 'Datum vystavení',
    due: 'Datum splatnosti',
    taxPoint: 'Datum dodání',
    payment: 'Způsob úhrady',
    variableSymbol: 'Variabilní symbol',
    description: 'Popis',
    qty: 'Množství',
    unitPrice: 'Cena / ks s DPH',
    amount: 'Celkem s DPH',
    base: 'Základ daně',
    vat: 'DPH',
    toPay: 'K úhradě',
    paid: 'Uhrazeno',
    payBlock: 'Platební údaje',
    iban: 'IBAN',
    bic: 'BIC / SWIFT',
    bank: 'Banka',
    account: 'Číslo účtu',
    qrCaption: { sk: 'Platba QR kódem (PAY by square)', cz: 'Platba QR kódem' },
    qrCaptionEn: 'Pay by QR code',
    orderRef: 'Objednávka',
    footerProforma: 'Zálohová faktura není daňový doklad. Daňový doklad vystavíme po přijetí platby a dodání zboží.',
    footerInvoice: 'Faktura byla vystavena elektronicky a je platná bez podpisu a razítka.',
    notVatPayer: 'Dodavatel není plátcem DPH.',
    page: 'Strana',
  },
  en: {
    title: { proforma: 'Proforma invoice', invoice: 'Invoice – tax document' },
    numberLabel: 'No.',
    seller: 'Supplier',
    buyer: 'Customer',
    ico: 'Company ID',
    dic: 'Tax ID',
    icDph: 'VAT ID',
    issued: 'Issue date',
    due: 'Due date',
    taxPoint: 'Delivery date',
    payment: 'Payment method',
    variableSymbol: 'Variable symbol',
    description: 'Description',
    qty: 'Qty',
    unitPrice: 'Unit price incl. VAT',
    amount: 'Total incl. VAT',
    base: 'Tax base',
    vat: 'VAT',
    toPay: 'Amount due',
    paid: 'Paid',
    payBlock: 'Payment details',
    iban: 'IBAN',
    bic: 'BIC / SWIFT',
    bank: 'Bank',
    account: 'Account number',
    qrCaption: { sk: 'Pay by QR code', cz: 'Pay by QR code' },
    qrCaptionEn: 'Pay by QR code',
    orderRef: 'Order',
    footerProforma: 'A proforma invoice is not a tax document. The tax invoice is issued after payment and delivery.',
    footerInvoice: 'This invoice was issued electronically and is valid without a signature or stamp.',
    notVatPayer: 'The supplier is not a VAT payer.',
    page: 'Page',
  },
};
