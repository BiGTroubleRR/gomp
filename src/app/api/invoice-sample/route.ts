// Development-only preview of the invoice PDF with made-up data (404 in production).
// Open /api/invoice-sample?lang=sk|cz|en to see the template.
import { NextResponse } from 'next/server';
import { SELLER } from '@/lib/invoice/company';
import { buildInvoiceFromOrder } from '@/lib/invoice/invoice';
import { renderInvoicePdf } from '@/lib/invoice/pdf';
import { normalizeLang, type OrderTicketData } from '@/lib/order-ticket';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') return new NextResponse('Not found', { status: 404 });
  const lang = normalizeLang(new URL(request.url).searchParams.get('lang') ?? 'sk');
  const currency = lang === 'cz' ? 'czk' : 'eur';
  const order: OrderTicketData = {
    referenceCode: 'GOMP-7K2Q-4821',
    createdAt: new Date().toISOString(),
    customerName: 'Ján Novák',
    email: 'jan.novak@example.com',
    addressLines: ['Hlavná 12', 'Košice, 040 01'],
    lang,
    currency,
    paymentMethod: 'card',
    shippingMethod: 'standard',
    items: [
      { category: 'Procesor', name: 'AMD Ryzen 7 9800X3D', price: 12990 },
      { category: 'Grafická karta', name: 'NVIDIA GeForce RTX 5070 Ti 16GB', price: 24990 },
      { category: 'Základná doska', name: 'ASUS ROG STRIX B850-F GAMING WIFI', price: 6490 },
      { category: 'Pamäť', name: 'Kingston FURY Beast 32GB (2x16GB) DDR5 6000MHz CL30', price: 3290 },
      { category: 'Úložisko', name: 'Samsung 990 PRO 2TB NVMe', price: 5290 },
      { category: 'Zdroj', name: 'Corsair RM850e 850W 80+ Gold', price: 3190 },
      { category: 'Skriňa', name: 'NZXT H7 Flow', price: 3590 },
    ],
    partsTotal: 59830,
    assembly: 1500,
    shipping: 390,
    discount: 2990,
    promoCode: 'GOMP5',
    total: 58730,
  };
  // Made-up bank details (a documentation IBAN) so the template shows a working QR; the real ones come from company.ts.
  const seller = { ...SELLER, iban: 'SK31 1200 0000 1987 4263 7541', bic: 'TATRSKBX', bankName: 'Tatra banka, a.s.' };
  const inv = buildInvoiceFromOrder(order, { vatRatePct: lang === 'cz' ? 21 : 23, seller });
  const pdf = await renderInvoicePdf(inv);
  return new NextResponse(Buffer.from(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${inv.number}.pdf"` } });
}
