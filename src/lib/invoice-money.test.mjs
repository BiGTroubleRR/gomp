import './ts-resolve-hook.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { buildInvoiceFromOrder, invoiceTotals, toCurrency, provisionalInvoiceNumber } = await import('./invoice/invoice.ts');
const { fmtPrice, CZK_PER_EUR } = await import('./gomp-storage.ts');
const { paymentQrPayload, spaydPayload } = await import('./invoice/qr.ts');
const { TEST_SELLER } = await import('./invoice/company.ts');

const order = (over = {}) => ({
  referenceCode: 'GOMP-AB12-3456',
  createdAt: '2026-11-20T10:00:00.000Z',
  customerName: 'Test Customer',
  email: 'a@b.sk',
  addressLines: ['Street 1', 'City'],
  lang: 'sk',
  currency: 'eur',
  paymentMethod: 'card',
  shippingMethod: 'standard',
  items: [
    { category: 'cpu', name: 'CPU', price: 12000 },
    { category: 'gpu', name: 'GPU', price: 24300 },
  ],
  partsTotal: 36300,
  assembly: 2430,
  shipping: 0,
  discount: 0,
  promoCode: '',
  total: 38730,
  ...over,
});

test('the invoice uses the same EUR rate as the shop', () => {
  assert.equal(toCurrency(24300, 'eur'), 24300 / CZK_PER_EUR);
  assert.equal(fmtPrice(24300, 'eur').startsWith('1'), true);
});

test('invoice lines add up to the order total (gross), discount is negative', () => {
  const inv = buildInvoiceFromOrder(order({ discount: 2430, promoCode: 'X', total: 36300 }), { vatRatePct: 21, seller: TEST_SELLER });
  const { gross } = invoiceTotals(inv.lines, 21);
  assert.equal(gross, toCurrency(36300, 'eur')); // 12000 + 24300 + 2430 assembly + 0 shipping - 2430 discount
  assert.ok(inv.lines.some((l) => l.unitGross < 0));
});

test('net + VAT equals gross for a 21 % rate, to the cent', () => {
  const inv = buildInvoiceFromOrder(order(), { vatRatePct: 21, seller: TEST_SELLER });
  const t = invoiceTotals(inv.lines, 21);
  assert.equal(Math.round((t.net + t.vat) * 100), Math.round(t.gross * 100));
  assert.ok(Math.abs(t.net - t.gross / 1.21) < 0.01);
});

test('invoice number is numeric and the variable symbol fits a bank field', () => {
  const n = provisionalInvoiceNumber('GOMP-AB12-3456', '2026-11-20T10:00:00.000Z', 'proforma');
  assert.match(n, /^\d+$/);
  assert.ok(n.replace(/\D/g, '').slice(0, 10).length <= 10);
});

test('test invoices carry an unpayable QR; CZK invoices use SPAYD with amount and currency', () => {
  const test = buildInvoiceFromOrder(order(), { vatRatePct: 21, seller: TEST_SELLER, test: true });
  assert.match(paymentQrPayload(test).text, /NEPLATNY/);
  const czk = buildInvoiceFromOrder(order({ currency: 'czk', lang: 'cz' }), { vatRatePct: 21, seller: { ...TEST_SELLER, iban: 'CZ6508000000192000145399' } });
  const spayd = spaydPayload(czk);
  assert.match(spayd, /^SPD\*1\.0\*ACC:CZ6508000000192000145399/);
  assert.match(spayd, /\*CC:CZK\*/);
  assert.match(spayd, /\*AM:\d+\.\d{2}\*/);
});
