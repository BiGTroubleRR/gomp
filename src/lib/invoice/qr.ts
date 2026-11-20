// SERVER ONLY. Payment QR codes for the invoice.
//   EUR / Slovak customers -> "PAY by square" (the Slovak banking standard, every SK banking app reads it)
//   CZK / Czech customers  -> SPAYD (the Czech standard, "SPD*1.0*ACC:...")
// Both end up as a vector QR drawn straight into the PDF (no canvas, no image files).
import QRCode from 'qrcode';
import { CurrencyCode, PaymentOptions, encode as encodePayBySquare } from 'bysquare/pay';
import type { InvoiceData } from './invoice';
import { invoiceTotals } from './invoice';

const stripDiacritics = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const spaydSafe = (s: string) => stripDiacritics(s).replace(/[*]/g, ' ').slice(0, 60);

export function paymentAmount(inv: InvoiceData): number {
  return invoiceTotals(inv.lines, inv.vatRatePct).gross;
}

export function spaydPayload(inv: InvoiceData): string {
  const iban = inv.seller.iban.replace(/\s+/g, '');
  const parts = [
    'SPD*1.0',
    `ACC:${iban}${inv.seller.bic && !inv.seller.bic.includes('DOPLNIŤ') ? '+' + inv.seller.bic.replace(/\s+/g, '') : ''}`,
    `AM:${paymentAmount(inv).toFixed(2)}`,
    `CC:${inv.currency === 'eur' ? 'EUR' : 'CZK'}`,
    `X-VS:${inv.variableSymbol}`,
    `MSG:${spaydSafe(`GOMP ${inv.orderRef}`)}`,
  ];
  return parts.join('*');
}

export function payBySquarePayload(inv: InvoiceData): string {
  return encodePayBySquare({
    invoiceId: inv.number,
    payments: [
      {
        type: PaymentOptions.PaymentOrder,
        amount: paymentAmount(inv),
        currencyCode: inv.currency === 'eur' ? CurrencyCode.EUR : CurrencyCode.CZK,
        variableSymbol: inv.variableSymbol,
        paymentNote: `GOMP ${inv.orderRef}`,
        beneficiary: { name: inv.seller.name },
        bankAccounts: [{ iban: inv.seller.iban.replace(/\s+/g, '') }],
      },
    ],
  });
}

// Which standard to use: SK customers (EUR) get PAY by square, Czech (CZK) get SPAYD.
export function paymentQrPayload(inv: InvoiceData): { text: string; standard: 'bysquare' | 'spayd' } {
  // Test invoice: a QR that is just text, so no banking app can read it as a payment.
  if (inv.test) return { text: `GOMP TESTOVACIA FAKTURA ${inv.number} - NEPLATNY QR KOD`, standard: 'spayd' };
  if (inv.currency === 'eur') return { text: payBySquarePayload(inv), standard: 'bysquare' };
  return { text: spaydPayload(inv), standard: 'spayd' };
}

// QR module matrix (true = dark) for drawing as vector squares.
export function qrMatrix(text: string): boolean[][] {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const rows: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c++) row.push(qr.modules.get(r, c) === 1);
    rows.push(row);
  }
  return rows;
}
