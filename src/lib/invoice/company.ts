// SERVER ONLY. The seller's (GOMP's) legal and bank details that go onto every invoice.
//
// Everything marked TODO below is a placeholder until the real company data is filled in. While any
// of the required fields is still a placeholder, `isSellerComplete()` is false and the checkout does
// NOT attach an invoice to the order email (so a customer can never receive a PDF with "DOPLNIŤ" in it).
// The admin preview and the sample route still render the template with the placeholders.
//
// Every value can also be set with an environment variable (INVOICE_SELLER_NAME, INVOICE_SELLER_ICO, ...)
// so the data can be changed on Vercel without touching the code.

export const PLACEHOLDER = 'DOPLNIŤ';

export type InvoiceSeller = {
  name: string; // legal name, e.g. "GOMP s.r.o."
  addressLines: string[]; // street, "PSČ City", country
  ico: string; // company ID (IČO)
  dic: string; // tax ID (DIČ)
  icDph: string; // VAT ID (IČ DPH / DIČ CZ); empty if not a VAT payer
  registration: string; // e.g. "Zapísaná v Obchodnom registri Okresného súdu ..., oddiel Sro, vložka č. ..."
  email: string;
  phone: string;
  web: string;
  iban: string;
  bic: string;
  bankName: string;
  // Czech domestic account number ("123456789/0800") — optional, shown next to the IBAN on CZK invoices.
  czAccount: string;
  vatPayer: boolean;
};

const env = (key: string, fallback: string) => (process.env[key] ?? '').trim() || fallback;

export const SELLER: InvoiceSeller = {
  name: env('INVOICE_SELLER_NAME', 'GOMP'), // TODO: legal name incl. legal form
  addressLines: env('INVOICE_SELLER_ADDRESS', `${PLACEHOLDER} (ulica a číslo)|${PLACEHOLDER} (PSČ a mesto)|Slovensko`).split('|'), // TODO
  ico: env('INVOICE_SELLER_ICO', PLACEHOLDER), // TODO
  dic: env('INVOICE_SELLER_DIC', PLACEHOLDER), // TODO
  icDph: env('INVOICE_SELLER_IC_DPH', PLACEHOLDER), // TODO (empty string if not a VAT payer)
  registration: env('INVOICE_SELLER_REGISTRATION', ''), // TODO: register entry text (optional)
  email: env('INVOICE_SELLER_EMAIL', 'objednavky@gomp.sk'),
  phone: env('INVOICE_SELLER_PHONE', ''),
  web: env('INVOICE_SELLER_WEB', 'gomp.sk'),
  iban: env('INVOICE_SELLER_IBAN', PLACEHOLDER), // TODO
  bic: env('INVOICE_SELLER_BIC', PLACEHOLDER), // TODO
  bankName: env('INVOICE_SELLER_BANK', PLACEHOLDER), // TODO
  czAccount: env('INVOICE_SELLER_CZ_ACCOUNT', ''),
  vatPayer: env('INVOICE_SELLER_VAT_PAYER', 'true') !== 'false',
};

// True only when the fields an invoice cannot legally go out without are really filled in.
export function isSellerComplete(s: InvoiceSeller = SELLER): boolean {
  const required = [s.name, s.ico, s.dic, s.iban, ...s.addressLines];
  if (s.vatPayer) required.push(s.icDph);
  return required.every((v) => v.trim().length > 0 && !v.includes(PLACEHOLDER));
}

// Master switch. Invoices are attached to order emails only when INVOICE_ENABLED=true is set on the server
// AND the seller details above are complete. It is off by default, so nothing can go out by accident.
export function isInvoicingEnabled(): boolean {
  return (process.env.INVOICE_ENABLED ?? '').trim().toLowerCase() === 'true' && isSellerComplete();
}
