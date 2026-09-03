'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import { useSite } from '@/contexts/SiteContext';
import { useAuth } from '@/contexts/AuthContext';
import TransitionLink from '@/components/TransitionLink';
import type { CompDb } from '@/components/Case3DViewer';
import SiteNav from '@/components/SiteNav';
import { readJSON, type Currency, type Lang } from '@/lib/gomp-storage';
import { useIsMobile } from '@/lib/use-media-query';
import { submitCheckoutIntent, type PaymentMethod } from '@/lib/supabase/checkout-intents';
import { pick } from '@/lib/i18n';

type ShippingId = 'standard' | 'express' | 'overnight';

type GompBuild = {
  selected: Record<string, boolean>;
  selections: Record<string, string>;
  compDb: CompDb;
  totalPrice: number;
};

type SavedAddress = {
  label: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  default: boolean;
};

// Deliberately no card fields. The payment step records which method the
// visitor *would* use; card details are never collected (see
// src/lib/supabase/checkout-intents.ts for the reasoning and the path to a
// real payment integration).
type CheckoutForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  promo: string;
};

const EMPTY_FORM: CheckoutForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  promo: '',
};

const SHIPPING_OPTIONS: { id: ShippingId; name_en: string; name_sk: string; name_cz: string; eta_en: string; eta_sk: string; eta_cz: string; priceEur: number }[] = [
  { id: 'standard', name_en: 'Standard Shipping', name_sk: 'Štandardná doprava', name_cz: 'Standardní doprava', eta_en: '8–12 business days', eta_sk: '8 – 12 pracovných dní', eta_cz: '8–12 pracovních dnů', priceEur: 0 },
  { id: 'express', name_en: 'Express Shipping', name_sk: 'Expresná doprava', name_cz: 'Expresní doprava', eta_en: '3–5 business days', eta_sk: '3 – 5 pracovných dní', eta_cz: '3–5 pracovních dnů', priceEur: 43 },
  { id: 'overnight', name_en: 'Overnight', name_sk: 'Cez noc', name_cz: 'Přes noc', eta_en: 'Next business day', eta_sk: 'Nasledujúci pracovný deň', eta_cz: 'Následující pracovní den', priceEur: 112 },
];

const ASSEMBLY_FEE_EUR = 130;

// Code-split out of checkout's main bundle — it pulls in three.js purely to re-render the
// build's case, and WebGL has nothing to do during SSR anyway, so `ssr: false` also skips a
// server render that would just throw on `document`/`WebGLRenderingContext`.
const Case3DViewer = dynamic(() => import('@/components/Case3DViewer'), { ssr: false });

const CAT: Record<string, string> = {
  mobo: 'Motherboard',
  cpu: 'CPU',
  cooler: 'CPU Cooler',
  ram: 'RAM',
  gpu: 'GPU',
  storage: 'Storage',
  psu: 'PSU',
  case: 'Case',
};

const FALLBACK_ITEMS: { category: string; name: string; priceEur: number }[] = [
  { category: 'Motherboard', name: 'ASUS ROG STRIX X870E-E', priceEur: 478 },
  { category: 'CPU', name: 'AMD Ryzen 9 9950X', priceEur: 608 },
  { category: 'GPU', name: 'NVIDIA RTX 5090 FE', priceEur: 1739 },
  { category: 'RAM', name: 'G.Skill Trident Z5 32GB', priceEur: 164 },
  { category: 'Storage', name: 'Samsung 990 Pro 2TB', priceEur: 156 },
  { category: 'PSU', name: 'Corsair HX1200i ATX 3.0', priceEur: 199 },
  { category: 'Case', name: 'NZXT H1 V2', priceEur: 217 },
];

const TRANSLATIONS = {
  en: {
    nav_home: 'Home',
    nav_shop: 'Shop',
    nav_build: 'Build',
    nav_about: 'About',
    nav_account: 'Account',
    order_summary: 'Order Summary',
    custom_pc_build: 'Custom PC Build',
    shipping: 'Shipping',
    assembly_testing: 'Assembly & testing',
    total: 'Total',
    estimated_delivery: 'Estimated Delivery',
    price_disclaimer:
      'Prices shown in EUR, converted to CZK at an approximate market rate (1 € ≈ 24.30 Kč, reference Jul 2026). Informative only — final price is confirmed at checkout.',
    shipping_details: 'Shipping Details',
    shipping_details_desc: 'Where should we deliver your build?',
    saved_addresses: 'Saved Addresses',
    first_name: 'First Name',
    last_name: 'Last Name',
    email_address: 'Email Address',
    street_address: 'Street Address',
    city: 'City',
    state_region: 'State / Region',
    zip_postal: 'ZIP / Postal',
    shipping_method: 'Shipping Method',
    phone_number: 'Phone',
    continue_payment: 'Continue to Payment →',
    payment: 'Payment',
    payment_desc: 'Choose your payment method.',
    // Sits as quiet fine print beside the submit button rather than a banner:
    // the visitor is told what will and won't happen at the moment they decide,
    // without the page shouting "this is a mockup" at them.
    submit_note:
      'Payment is not live yet, so nothing is charged now. The GOMP team will contact you to confirm availability and complete the order — the final price may vary.',
    method_card: 'Card',
    method_card_desc: 'Visa · Mastercard',
    method_google: 'Google Pay',
    method_google_desc: 'Pay with a saved Google account',
    method_apple: 'Apple Pay',
    method_apple_desc: 'Pay with Touch ID or Face ID',
    contact_details: 'Contact',
    promo_code: 'Promo Code',
    optional: 'optional',
    apply: 'Apply',
    promo_success: 'GOMP2026 — 5% discount applied',
    consent_label: 'You may email me about this order and when GOMP starts selling.',
    consent_required: 'Please confirm we may contact you.',
    email_required: 'Please enter an email address so we can reach you.',
    back: '← Back',
    processing: 'Submitting…',
    submit_request: 'Submit Order Request  ·  ',
    request_received: 'Order Request Received',
    thanks_line1: "We'll Take It",
    thanks_line2: 'From Here.',
    we_will_contact: 'The GOMP team will reach out at',
    outcome_note:
      'Card and wallet payments are not live on GOMP yet, so nothing has been charged. Your configuration is saved and the GOMP team will contact you to confirm availability and complete the order. The final price may vary from the estimate above, depending on component prices and availability at the time of assembly.',
    reference: 'Reference',
    your_build: 'Your build',
    delivering_to: 'For delivery to',
    estimated_arrival: 'Indicative build time',
    would_pay_with: 'Preferred payment',
    build_another: '← Build Another',
    go_home: 'Go to Home',
    itemCount: (n: number) => `${n} components · assembled & tested`,
  },
  sk: {
    nav_home: 'Domov',
    nav_shop: 'Obchod',
    nav_build: 'Zostaviť',
    nav_about: 'O nás',
    nav_account: 'Účet',
    order_summary: 'Súhrn objednávky',
    custom_pc_build: 'Vlastná zostava PC',
    shipping: 'Doprava',
    assembly_testing: 'Montáž a testovanie',
    total: 'Spolu',
    estimated_delivery: 'Predpokladané doručenie',
    price_disclaimer:
      'Ceny sú uvedené v EUR, prepočet na CZK približným trhovým kurzom (1 € ≈ 24,30 Kč, referenčný júl 2026). Slúži len na orientáciu — konečná cena je potvrdená pri pokladni.',
    shipping_details: 'Údaje o doručení',
    shipping_details_desc: 'Kam máme doručiť vašu zostavu?',
    saved_addresses: 'Uložené adresy',
    first_name: 'Meno',
    last_name: 'Priezvisko',
    email_address: 'E-mailová adresa',
    street_address: 'Ulica a číslo',
    city: 'Mesto',
    state_region: 'Kraj / Región',
    zip_postal: 'PSČ',
    shipping_method: 'Spôsob dopravy',
    phone_number: 'Telefón',
    continue_payment: 'Pokračovať na platbu →',
    payment: 'Platba',
    payment_desc: 'Vyberte spôsob platby.',
    submit_note:
      'Platba ešte nie je aktívna, takže sa teraz nič nestrhne. Tím GOMP vás bude kontaktovať, aby potvrdil dostupnosť a dokončil objednávku — konečná cena sa môže líšiť.',
    method_card: 'Karta',
    method_card_desc: 'Visa · Mastercard',
    method_google: 'Google Pay',
    method_google_desc: 'Platba uloženým účtom Google',
    method_apple: 'Apple Pay',
    method_apple_desc: 'Platba pomocou Touch ID alebo Face ID',
    contact_details: 'Kontakt',
    promo_code: 'Zľavový kód',
    optional: 'nepovinné',
    apply: 'Použiť',
    promo_success: 'GOMP2026 — uplatnená zľava 5 %',
    consent_label: 'Môžete mi napísať o tejto objednávke a keď GOMP začne predávať.',
    consent_required: 'Potvrďte, prosím, že vás môžeme kontaktovať.',
    email_required: 'Zadajte, prosím, e-mail, aby sme vás vedeli kontaktovať.',
    back: '← Späť',
    processing: 'Odosiela sa…',
    submit_request: 'Odoslať žiadosť  ·  ',
    request_received: 'Žiadosť prijatá',
    thanks_line1: 'Ďalej sa',
    thanks_line2: 'postaráme my.',
    we_will_contact: 'Tím GOMP sa ozve na',
    outcome_note:
      'Platby kartou a peňaženkou na GOMP ešte nie sú aktívne, takže sa nič nestrhlo. Vaša konfigurácia je uložená a tím GOMP vás bude kontaktovať, aby potvrdil dostupnosť a dokončil objednávku. Konečná cena sa môže líšiť od uvedeného odhadu podľa cien a dostupnosti komponentov v čase montáže.',
    reference: 'Referencia',
    your_build: 'Vaša zostava',
    delivering_to: 'Na doručenie na',
    estimated_arrival: 'Orientačný čas zostavenia',
    would_pay_with: 'Preferovaná platba',
    build_another: '← Zostaviť ďalšiu',
    go_home: 'Prejsť na domovskú stránku',
    itemCount: (n: number) => `${n} komponentov · zostavené a otestované`,
  },
  cz: {
    nav_home: 'Domů',
    nav_shop: 'Obchod',
    nav_build: 'Sestavit',
    nav_about: 'O nás',
    nav_account: 'Účet',
    order_summary: 'Souhrn objednávky',
    custom_pc_build: 'Vlastní sestava PC',
    shipping: 'Doprava',
    assembly_testing: 'Montáž a testování',
    total: 'Celkem',
    estimated_delivery: 'Předpokládané doručení',
    price_disclaimer:
      'Ceny jsou uvedeny v EUR, přepočet na CZK přibližným tržním kurzem (1 € ≈ 24,30 Kč, referenční červenec 2026). Slouží pouze pro orientaci — konečná cena je potvrzena při pokladně.',
    shipping_details: 'Údaje o doručení',
    shipping_details_desc: 'Kam máme doručit vaši sestavu?',
    saved_addresses: 'Uložené adresy',
    first_name: 'Jméno',
    last_name: 'Příjmení',
    email_address: 'E-mailová adresa',
    street_address: 'Ulice a číslo',
    city: 'Město',
    state_region: 'Kraj / Region',
    zip_postal: 'PSČ',
    shipping_method: 'Způsob dopravy',
    phone_number: 'Telefon',
    continue_payment: 'Pokračovat k platbě →',
    payment: 'Platba',
    payment_desc: 'Vyberte způsob platby.',
    submit_note:
      'Platba zatím není aktivní, takže se teď nic nestrhne. Tým GOMP vás bude kontaktovat, aby potvrdil dostupnost a dokončil objednávku — konečná cena se může lišit.',
    method_card: 'Karta',
    method_card_desc: 'Visa · Mastercard',
    method_google: 'Google Pay',
    method_google_desc: 'Platba uloženým účtem Google',
    method_apple: 'Apple Pay',
    method_apple_desc: 'Platba pomocí Touch ID nebo Face ID',
    contact_details: 'Kontakt',
    promo_code: 'Slevový kód',
    optional: 'nepovinné',
    apply: 'Použít',
    promo_success: 'GOMP2026 — uplatněna sleva 5 %',
    consent_label: 'Můžete mi napsat ohledně této objednávky a až GOMP začne prodávat.',
    consent_required: 'Potvrďte prosím, že vás můžeme kontaktovat.',
    email_required: 'Zadejte prosím e-mail, abychom vás mohli kontaktovat.',
    back: '← Zpět',
    processing: 'Odesílá se…',
    submit_request: 'Odeslat žádost  ·  ',
    request_received: 'Žádost přijata',
    thanks_line1: 'Dále se',
    thanks_line2: 'postaráme my.',
    we_will_contact: 'Tým GOMP se ozve na',
    outcome_note:
      'Platby kartou a peněženkou na GOMP zatím nejsou aktivní, takže nic nebylo strženo. Vaše konfigurace je uložena a tým GOMP vás bude kontaktovat, aby potvrdil dostupnost a dokončil objednávku. Konečná cena se může lišit od uvedeného odhadu podle cen a dostupnosti komponent v době montáže.',
    reference: 'Reference',
    your_build: 'Vaše sestava',
    delivering_to: 'Pro doručení na',
    estimated_arrival: 'Orientační doba sestavení',
    would_pay_with: 'Preferovaná platba',
    build_another: '← Sestavit další',
    go_home: 'Přejít na domovskou stránku',
    itemCount: (n: number) => {
      const word = n === 1 ? 'komponenta' : n >= 2 && n <= 4 ? 'komponenty' : 'komponent';
      return `${n} ${word} · sestaveno a otestováno`;
    },
  },
};

type T = typeof TRANSLATIONS.en;

const MAROON = '#6E1423';
const GOLD = '#C4A35A';
const INK = '#1C1C1A';
const MUTED = '#7A7469';
const PAGE_BG = '#F5F0E6';
const PANEL_BG = '#FDFAF4';

const serif: CSSProperties = { fontFamily: 'var(--font-serif)' };
const sans: CSSProperties = { fontFamily: 'var(--font-sans)' };
const mono: CSSProperties = { fontFamily: 'var(--font-mono)' };

const labelStyle: CSSProperties = {
  ...sans,
  fontSize: 10,
  fontWeight: 600,
  color: MUTED,
  letterSpacing: 2,
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: 8,
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '0.5px solid rgba(28,28,26,0.2)',
  borderRadius: 2,
  background: PANEL_BG,
  ...sans,
  fontSize: 14,
  color: INK,
};

const monoInputStyle: CSSProperties = {
  ...inputStyle,
  ...mono,
  fontSize: 15,
  letterSpacing: 2,
};

// Owns its own randomness so callers stay pure — the reference is cosmetic (a
// human-friendly handle for the thank-you screen and support emails), not an
// identifier anything looks up by.
function generateRefNum() {
  const seed = Math.floor(Math.random() * 1e9);
  return `GOMP-${seed.toString(36).toUpperCase().slice(0, 4)}-${String(seed).slice(-4)}`;
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  maxLength,
  monospace,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  maxLength?: number;
  monospace?: boolean;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
        maxLength={maxLength}
        style={monospace ? monoInputStyle : inputStyle}
      />
    </div>
  );
}


function EntryOverlay() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'radial-gradient(circle at 50% 45%, #8E2A3A 0%, #6E1423 55%, #4A0E1A 100%)',
        pointerEvents: 'none',
        overflow: 'hidden',
        animation: 'gompOverlayOut 0.45s 0.05s cubic-bezier(.16,1,.3,1) forwards',
      }}
    >
      <div style={{ position: 'absolute', top: '50%', left: '50%', width: 640, height: 640, margin: '-320px 0 0 -320px', border: '0.5px solid rgba(196,163,90,0.22)', borderRadius: '50%', animation: 'gompRotateSlow 8s linear infinite' }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', width: 420, height: 420, margin: '-210px 0 0 -210px', border: '0.5px solid rgba(196,163,90,0.32)', borderRadius: '50%', animation: 'gompRotateSlowRev 6s linear infinite' }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', width: 960, height: 960, margin: '-480px 0 0 -480px', background: 'radial-gradient(circle, rgba(196,163,90,0.16) 0%, transparent 60%)', animation: 'gompGlowPulse 2.2s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', top: '62%', left: '20%', width: 6, height: 6, borderRadius: '50%', background: GOLD, boxShadow: '0 0 10px 3px rgba(196,163,90,0.55)', animation: 'gompEmberRise 1.6s ease-out infinite' }} />
      <div style={{ position: 'absolute', top: '70%', left: '68%', width: 4, height: 4, borderRadius: '50%', background: '#E8A9B4', boxShadow: '0 0 8px 2px rgba(232,169,180,0.5)', animation: 'gompEmberRise 1.9s 0.2s ease-out infinite' }} />
      <div style={{ position: 'absolute', top: '55%', left: '80%', width: 5, height: 5, borderRadius: '50%', background: GOLD, boxShadow: '0 0 9px 2px rgba(196,163,90,0.5)', animation: 'gompEmberRise 1.4s 0.35s ease-out infinite' }} />
      <div style={{ position: 'absolute', top: '78%', left: '40%', width: 3, height: 3, borderRadius: '50%', background: '#E8A9B4', animation: 'gompEmberRise 2.1s 0.1s ease-out infinite' }} />
      <div style={{ position: 'absolute', top: '32%', left: '14%', width: 4, height: 4, borderRadius: '50%', background: GOLD, boxShadow: '0 0 8px 2px rgba(196,163,90,0.5)', animation: 'gompEmberRise 1.7s 0.5s ease-out infinite' }} />
      <div style={{ position: 'absolute', top: '28%', left: '86%', width: 5, height: 5, borderRadius: '50%', background: '#E8A9B4', animation: 'gompEmberRise 1.5s 0.25s ease-out infinite' }} />
    </div>
  );
}

export default function CheckoutPage() {
  const { lang, currency, setLang, setCurrency, fmt } = useSite();
  const t = TRANSLATIONS[lang];
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const [build, setBuild] = useState<GompBuild | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [shipping, setShipping] = useState<ShippingId>('standard');
  const [promoApplied, setPromoApplied] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [refNumber, setRefNumber] = useState('');
  const [orderError, setOrderError] = useState<string | null>(null);
  const [selectedSavedAddr, setSelectedSavedAddr] = useState<number | null>(null);
  const [form, setForm] = useState<CheckoutForm>(EMPTY_FORM);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [consent, setConsent] = useState(false);

  const placeOrderTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Adopt any persisted build/addresses on mount (client-only, avoids SSR/client markup mismatch).
  useEffect(() => {
    setBuild(readJSON<GompBuild | null>('gomp_build', null));
    setSavedAddresses(readJSON<SavedAddress[]>('gomp_addresses', []));
  }, []);

  useEffect(
    () => () => {
      if (placeOrderTimeout.current) clearTimeout(placeOrderTimeout.current);
    },
    [],
  );

  const buildItems = useMemo(() => {
    if (!build) return FALLBACK_ITEMS;
    const selected = build.selected || {};
    const selections = build.selections || {};
    const compDb = build.compDb || {};
    return Object.keys(selected)
      .filter((id) => selected[id])
      .map((id) => {
        const list = compDb[id as keyof CompDb] || [];
        const comp = list.find((c) => c.name === selections[id]) || list[0];
        return { category: CAT[id] || id, name: comp?.name || '', priceEur: comp?.price || 0 };
      });
  }, [build]);

  const partsTotal = build ? build.totalPrice : FALLBACK_ITEMS.reduce((sum, i) => sum + i.priceEur, 0);
  const shippingCostEur = SHIPPING_OPTIONS.find((o) => o.id === shipping)?.priceEur ?? 0;
  const discount = promoApplied ? Math.round(partsTotal * 0.05) : 0;
  const grandTotalEur = partsTotal - discount + shippingCostEur + ASSEMBLY_FEE_EUR;
  const showCaseViewport = !!(build?.selected?.case);

  const deliveryDate = useMemo(() => {
    const days = shipping === 'overnight' ? 1 : shipping === 'express' ? 5 : 12;
    const d = new Date();
    d.setDate(d.getDate() + days + 2);
    return d.toLocaleDateString(pick(lang, { en: 'en-US', sk: 'sk-SK', cz: 'cs-CZ' }), { month: 'long', day: 'numeric', year: 'numeric' });
  }, [shipping, lang]);

  const stepLabels = pick(lang, {
    en: ['Shipping', 'Payment', 'Confirm'],
    sk: ['Doprava', 'Platba', 'Potvrdenie'],
    cz: ['Doprava', 'Platba', 'Potvrzení'],
  });

  const PAYMENT_METHODS: { id: PaymentMethod; label: string; desc: string }[] = [
    { id: 'card', label: t.method_card, desc: t.method_card_desc },
    { id: 'google_pay', label: t.method_google, desc: t.method_google_desc },
    { id: 'apple_pay', label: t.method_apple, desc: t.method_apple_desc },
  ];
  const methodLabel = PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.label ?? '';

  function handleSelectSavedAddr(i: number) {
    setSelectedSavedAddr(i);
    const a = savedAddresses[i];
    setForm((f) => ({ ...f, address: a.street, city: a.city, zip: a.zip }));
  }

  function handleApplyPromo() {
    if (form.promo.trim().toLowerCase() === 'gomp2026') setPromoApplied(true);
  }

  // Records the visitor's interest — no payment is created or captured. Works
  // signed-in or anonymous on purpose: putting a signup wall in front of a
  // demand test would suppress the very signal we're trying to measure.
  async function handleRegisterInterest() {
    if (placing) return;
    if (!form.email.trim()) {
      setOrderError(t.email_required);
      return;
    }
    if (!consent) {
      setOrderError(t.consent_required);
      return;
    }
    setPlacing(true);
    setOrderError(null);

    const { error } = await submitCheckoutIntent({
      userId: user?.id ?? null,
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      address: form.address,
      city: form.city,
      region: form.state,
      zip: form.zip,
      paymentMethod,
      shippingMethod: shipping,
      partsTotalEur: partsTotal,
      shippingEur: shippingCostEur,
      assemblyEur: ASSEMBLY_FEE_EUR,
      discountEur: discount,
      totalEur: grandTotalEur,
      promoCode: promoApplied ? form.promo : '',
      buildItems,
      displayCurrency: currency,
      lang,
      contactConsent: consent,
    });

    if (error) {
      setOrderError(error);
      setPlacing(false);
      return;
    }

    const ref = generateRefNum();
    placeOrderTimeout.current = setTimeout(() => {
      setRefNumber(ref);
      setStep(3);
      setPlacing(false);
    }, 700);
  }

  return (
    <div style={{ position: 'relative', zIndex: 2, background: PAGE_BG, minHeight: '100vh' }}>
      <SiteNav />

      <div style={{ minHeight: '100vh', paddingTop: 60, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'stretch' }}>
        {/* Order Summary sidebar */}
        <div
          style={{
            width: isMobile ? '100%' : 420,
            flexShrink: 0,
            background: PANEL_BG,
            borderRight: isMobile ? 'none' : '0.5px solid rgba(28,28,26,0.12)',
            borderBottom: isMobile ? '0.5px solid rgba(28,28,26,0.12)' : 'none',
            padding: isMobile ? '28px 20px 32px' : '48px 36px 48px',
            position: isMobile ? 'static' : 'sticky',
            top: isMobile ? undefined : 60,
            height: isMobile ? 'auto' : 'calc(100vh - 60px)',
            overflowY: isMobile ? 'visible' : 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ ...sans, fontSize: 10, fontWeight: 600, color: MUTED, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 28 }}>
            {t.order_summary}
          </div>
          <div style={{ ...serif, fontSize: isMobile ? 22 : 28, fontWeight: 600, color: INK, lineHeight: 1.15, marginBottom: 6 }}>{t.custom_pc_build}</div>
          <div style={{ ...sans, fontSize: 12, color: MUTED, fontWeight: 300, marginBottom: 32 }}>{t.itemCount(buildItems.length)}</div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {buildItems.map((item, i) => (
              <div
                key={`${item.category}-${i}`}
                style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '0.5px solid rgba(28,28,26,0.08)' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...sans, fontSize: 10, color: MUTED, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>{item.category}</div>
                  <div style={{ ...sans, fontSize: 13, color: INK, fontWeight: 400, lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </div>
                </div>
                <div style={{ ...mono, fontSize: 13, color: INK, flexShrink: 0, paddingTop: 14 }}>{fmt(item.priceEur)}</div>
              </div>
            ))}
          </div>
          <div style={{ height: 0.5, background: 'rgba(28,28,26,0.15)', margin: '20px 0 16px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ ...sans, fontSize: 12, color: MUTED }}>{t.shipping}</span>
            <span style={{ ...mono, fontSize: 12, color: MUTED }}>
              {shippingCostEur === 0 ? pick(lang, { en: 'Free', sk: 'Zadarmo', cz: 'Zdarma' }) : fmt(shippingCostEur)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ ...sans, fontSize: 12, color: MUTED }}>{t.assembly_testing}</span>
            <span style={{ ...mono, fontSize: 12, color: MUTED }}>{fmt(ASSEMBLY_FEE_EUR)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
            <span style={{ ...sans, fontSize: 13, fontWeight: 500, color: INK }}>{t.total}</span>
            <span style={{ ...mono, fontSize: 26, fontWeight: 500, color: INK, letterSpacing: -0.5 }}>{fmt(grandTotalEur)}</span>
          </div>
          <div style={{ background: 'rgba(110,20,35,0.06)', border: '0.5px solid rgba(110,20,35,0.14)', borderRadius: 2, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ ...sans, fontSize: 10, fontWeight: 600, color: MAROON, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
              {t.estimated_delivery}
            </div>
            <div style={{ ...serif, fontSize: 18, fontWeight: 500, color: INK }}>{deliveryDate}</div>
          </div>
          <div style={{ ...sans, fontSize: 10, color: MUTED, fontWeight: 300, lineHeight: 1.6 }}>{t.price_disclaimer}</div>
        </div>

        {/* Main step content */}
        <div style={{ flex: 1, padding: isMobile ? '28px 20px' : '48px 64px', minWidth: 0, overflowY: 'auto', maxWidth: isMobile ? '100%' : 680 }}>
          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: isMobile ? 32 : 52 }}>
            {[1, 2, 3].map((n, i) => {
              const done = step > n;
              const active = step === n;
              return (
                <div key={n} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8 }}>
                    <div
                      style={{
                        width: isMobile ? 18 : 22,
                        height: isMobile ? 18 : 22,
                        borderRadius: '50%',
                        background: done || active ? MAROON : 'transparent',
                        border: `0.5px solid ${done || active ? MAROON : 'rgba(28,28,26,0.2)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'background 0.3s, border-color 0.3s',
                      }}
                    >
                      <span style={{ ...mono, fontSize: isMobile ? 8 : 9, fontWeight: 500, color: done || active ? PANEL_BG : MUTED }}>{n}</span>
                    </div>
                    <span style={{ ...sans, fontSize: isMobile ? 10 : 12, fontWeight: active ? 500 : 400, color: active ? INK : MUTED, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
                      {stepLabels[i]}
                    </span>
                  </div>
                  {n !== 3 && <div style={{ width: isMobile ? 14 : 40, height: 0.5, background: 'rgba(28,28,26,0.18)', margin: isMobile ? '0 6px' : '0 12px' }} />}
                </div>
              );
            })}
          </div>

          {/* Step 1: Shipping Details */}
          {step === 1 && (
            <div style={{ animation: 'gompFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both' }}>
              <div style={{ ...serif, fontSize: isMobile ? 24 : 32, fontWeight: 600, color: INK, marginBottom: 6 }}>{t.shipping_details}</div>
              <div style={{ ...sans, fontSize: 13, color: MUTED, fontWeight: 300, marginBottom: 28 }}>{t.shipping_details_desc}</div>

              {savedAddresses.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ ...sans, fontSize: 10, fontWeight: 600, color: MUTED, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
                    {t.saved_addresses}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {savedAddresses.map((a, i) => {
                      const selected = selectedSavedAddr === i;
                      return (
                        <div
                          key={`${a.label}-${i}`}
                          onClick={() => handleSelectSavedAddr(i)}
                          style={{
                            padding: '12px 16px',
                            border: `0.5px solid ${selected ? 'rgba(110,20,35,0.3)' : 'rgba(28,28,26,0.15)'}`,
                            borderRadius: 2,
                            background: selected ? 'rgba(110,20,35,0.05)' : 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 12,
                          }}
                        >
                          <div>
                            <div style={{ ...sans, fontSize: 10, fontWeight: 600, color: MUTED, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>
                              {a.label}
                            </div>
                            <div style={{ ...sans, fontSize: 13, color: INK }}>
                              {a.street} · {a.city}, {a.zip}
                            </div>
                          </div>
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              border: `0.5px solid ${selected ? MAROON : 'rgba(28,28,26,0.25)'}`,
                              background: selected ? MAROON : 'transparent',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {selected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: PANEL_BG }} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ height: 0.5, background: 'rgba(28,28,26,0.1)', margin: '20px 0 0' }} />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <Field label={t.first_name} value={form.firstName} onChange={(v) => setForm((f) => ({ ...f, firstName: v }))} />
                <Field label={t.last_name} value={form.lastName} onChange={(v) => setForm((f) => ({ ...f, lastName: v }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <Field label={t.email_address} value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} type="email" />
                <Field
                  label={`${t.phone_number} (${t.optional})`}
                  value={form.phone}
                  onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                  type="tel"
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <Field label={t.street_address} value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 16, marginBottom: 32 }}>
                <div style={{ gridColumn: isMobile ? '1 / -1' : 'auto' }}>
                  <Field label={t.city} value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: v }))} />
                </div>
                <Field label={t.state_region} value={form.state} onChange={(v) => setForm((f) => ({ ...f, state: v }))} />
                <Field label={t.zip_postal} value={form.zip} onChange={(v) => setForm((f) => ({ ...f, zip: v }))} />
              </div>

              <div style={{ ...sans, fontSize: 10, fontWeight: 600, color: MUTED, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
                {t.shipping_method}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 40 }}>
                {SHIPPING_OPTIONS.map((opt) => {
                  const selected = opt.id === shipping;
                  const name = pick(lang, { en: opt.name_en, sk: opt.name_sk, cz: opt.name_cz });
                  const eta = pick(lang, { en: opt.eta_en, sk: opt.eta_sk, cz: opt.eta_cz });
                  const priceStr = opt.priceEur === 0 ? pick(lang, { en: 'Free', sk: 'Zadarmo', cz: 'Zdarma' }) : fmt(opt.priceEur);
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setShipping(opt.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        border: `0.5px solid ${selected ? 'rgba(110,20,35,0.3)' : 'rgba(28,28,26,0.15)'}`,
                        borderRadius: 2,
                        background: selected ? 'rgba(110,20,35,0.05)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s, background 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            border: `0.5px solid ${selected ? MAROON : 'rgba(28,28,26,0.25)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {selected && <div style={{ width: 7, height: 7, borderRadius: '50%', background: MAROON }} />}
                        </div>
                        <div>
                          <div style={{ ...sans, fontSize: 13, fontWeight: 500, color: INK }}>{name}</div>
                          <div style={{ ...sans, fontSize: 11, color: MUTED, marginTop: 1 }}>{eta}</div>
                        </div>
                      </div>
                      <div style={{ ...mono, fontSize: 13, color: INK }}>{priceStr}</div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setStep(2)}
                style={{ width: '100%', padding: 15, background: MAROON, color: PANEL_BG, border: 'none', borderRadius: 2, ...sans, fontSize: 14, fontWeight: 500, cursor: 'pointer', letterSpacing: 0.3 }}
              >
                {t.continue_payment}
              </button>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <div style={{ animation: 'gompFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both' }}>
              <div style={{ ...serif, fontSize: isMobile ? 24 : 32, fontWeight: 600, color: INK, marginBottom: 6 }}>{t.payment}</div>
              <div style={{ ...sans, fontSize: 13, color: MUTED, fontWeight: 300, marginBottom: 36 }}>{t.payment_desc}</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
                {PAYMENT_METHODS.map((m) => {
                  const selected = m.id === paymentMethod;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id)}
                      role="radio"
                      aria-checked={selected}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setPaymentMethod(m.id);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 18px',
                        border: `0.5px solid ${selected ? 'rgba(110,20,35,0.3)' : 'rgba(28,28,26,0.15)'}`,
                        borderRadius: 2,
                        background: selected ? 'rgba(110,20,35,0.05)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s, background 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            border: `0.5px solid ${selected ? MAROON : 'rgba(28,28,26,0.25)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {selected && <div style={{ width: 7, height: 7, borderRadius: '50%', background: MAROON }} />}
                        </div>
                        <div>
                          <div style={{ ...sans, fontSize: 13, fontWeight: 500, color: INK }}>{m.label}</div>
                          <div style={{ ...sans, fontSize: 11, color: MUTED, marginTop: 1 }}>{m.desc}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginBottom: 32 }}>
                <label style={labelStyle}>
                  {t.promo_code} <span style={{ fontWeight: 300, textTransform: 'none', letterSpacing: 0 }}>({t.optional})</span>
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={form.promo}
                    onChange={(e) => setForm((f) => ({ ...f, promo: e.target.value }))}
                    placeholder="GOMP2026"
                    style={{ flex: 1, ...monoInputStyle, fontSize: 14, letterSpacing: 1 }}
                  />
                  <button
                    onClick={handleApplyPromo}
                    style={{ padding: '12px 20px', background: 'transparent', border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 2, ...sans, fontSize: 13, color: MUTED, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    {t.apply}
                  </button>
                </div>
                {promoApplied && (
                  <div style={{ ...sans, fontSize: 11, color: '#1B7A40', marginTop: 6, fontWeight: 500 }}>✓ {t.promo_success}</div>
                )}
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  marginBottom: 24,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    if (e.target.checked) setOrderError(null);
                  }}
                  style={{ marginTop: 2, accentColor: MAROON, width: 15, height: 15, flexShrink: 0, cursor: 'pointer' }}
                />
                <span style={{ ...sans, fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
                  {t.consent_label}{' '}
                  <TransitionLink href="/privacy" style={{ color: MAROON, textDecoration: 'underline', textUnderlineOffset: 2 }}>
                    {pick(lang, { en: 'Privacy Policy', sk: 'Zásady ochrany osobných údajov', cz: 'Zásady ochrany osobních údajů' })}
                  </TransitionLink>
                </span>
              </label>

              {orderError && (
                <div style={{ padding: '12px 16px', background: 'rgba(110,20,35,0.06)', border: '0.5px solid rgba(110,20,35,0.18)', borderRadius: 2, marginBottom: 16 }}>
                  <span style={{ ...sans, fontSize: 12, color: MAROON }}>{orderError}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setStep(1)}
                  style={{ padding: '15px 24px', background: 'transparent', color: MUTED, border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 2, ...sans, fontSize: 13, cursor: 'pointer' }}
                >
                  {t.back}
                </button>
                <button
                  onClick={handleRegisterInterest}
                  disabled={placing}
                  style={{
                    flex: 1,
                    padding: 15,
                    background: MAROON,
                    color: PANEL_BG,
                    border: 'none',
                    borderRadius: 2,
                    ...sans,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: placing ? 'default' : 'pointer',
                    letterSpacing: 0.3,
                    opacity: placing ? 0.6 : 1,
                  }}
                >
                  {placing ? t.processing : `${t.submit_request}${fmt(grandTotalEur)}`}
                </button>
              </div>

              <div style={{ ...sans, fontSize: 10.5, color: MUTED, fontWeight: 300, lineHeight: 1.65, marginTop: 14 }}>
                {t.submit_note}
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div style={{ animation: 'gompFadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both', textAlign: 'center', padding: isMobile ? '20px 0' : '40px 0' }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'rgba(110,20,35,0.08)',
                  border: '0.5px solid rgba(110,20,35,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 28px',
                  animation: 'gompPulse 1.8s ease-in-out 0.4s both',
                }}
              >
                <svg width={36} height={36} viewBox="0 0 36 36" fill="none">
                  <polyline
                    points="8,18 15,25 28,11"
                    stroke={MAROON}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={60}
                    strokeDashoffset={60}
                    style={{ animation: 'gompCheckDraw 0.6s 0.3s cubic-bezier(0.16,1,0.3,1) forwards' }}
                  />
                </svg>
              </div>
              <div style={{ ...sans, fontSize: 10, fontWeight: 600, color: MUTED, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>
                {t.request_received}
              </div>
              <div style={{ ...serif, fontSize: isMobile ? 28 : 42, fontWeight: 600, color: INK, lineHeight: 1.1, marginBottom: 10 }}>
                {t.thanks_line1}
                <br />
                {t.thanks_line2}
              </div>
              <div style={{ ...sans, fontSize: 13, color: MUTED, fontWeight: 300, marginBottom: 8 }}>
                {t.we_will_contact} {form.email}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 40 }}>
                <span style={{ ...sans, fontSize: 12, color: MUTED }}>{t.reference}</span>
                <span style={{ ...mono, fontSize: 13, color: INK, background: 'rgba(110,20,35,0.07)', padding: '4px 10px', borderRadius: 2 }}>{refNumber}</span>
              </div>
              <div
                style={{
                  background: PANEL_BG,
                  border: '0.5px solid rgba(28,28,26,0.12)',
                  borderRadius: 2,
                  padding: isMobile ? '20px 20px' : '24px 28px',
                  textAlign: 'left',
                  marginBottom: 36,
                  maxWidth: 420,
                  marginLeft: 'auto',
                  marginRight: 'auto',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ ...sans, fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: 1.5 }}>{t.delivering_to}</span>
                </div>
                <div style={{ ...sans, fontSize: 14, color: INK, lineHeight: 1.6 }}>
                  {form.firstName} {form.lastName}
                  <br />
                  {form.address}
                  <br />
                  {form.city}, {form.state} {form.zip}
                </div>
                <div style={{ height: 0.5, background: 'rgba(28,28,26,0.1)', margin: '16px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ ...sans, fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: 1.5 }}>{t.would_pay_with}</span>
                  <span style={{ ...sans, fontSize: 14, fontWeight: 500, color: INK }}>{methodLabel}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ ...sans, fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: 1.5 }}>{t.estimated_arrival}</span>
                  <span style={{ ...serif, fontSize: 16, fontWeight: 500, color: INK }}>{deliveryDate}</span>
                </div>
              </div>

              <div
                style={{
                  ...sans,
                  fontSize: 11.5,
                  color: MUTED,
                  fontWeight: 300,
                  lineHeight: 1.75,
                  maxWidth: 420,
                  margin: '0 auto 32px',
                  textAlign: 'left',
                }}
              >
                {t.outcome_note}
              </div>
              <TransitionLink
                href="/build"
                style={{ display: 'inline-block', padding: '13px 32px', background: 'transparent', color: MUTED, border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 2, ...sans, fontSize: 13, textDecoration: 'none', marginRight: 10 }}
              >
                {t.build_another}
              </TransitionLink>
              <TransitionLink
                href="/"
                style={{ display: 'inline-block', padding: '13px 32px', background: MAROON, color: PANEL_BG, border: 'none', borderRadius: 2, ...sans, fontSize: 13, textDecoration: 'none' }}
              >
                {t.go_home}
              </TransitionLink>
            </div>
          )}
        </div>

        {/* 3D case preview */}
        {showCaseViewport && build && (
          <div
            style={
              isMobile
                ? { width: '100%', height: 220, position: 'relative', pointerEvents: 'none', overflow: 'hidden' }
                : { flex: 1, minWidth: 120, position: 'relative', pointerEvents: 'none', overflow: 'hidden' }
            }
          >
            <Case3DViewer config={{ selected: build.selected, selections: build.selections, compDb: build.compDb }} />
          </div>
        )}
      </div>

      <EntryOverlay />
    </div>
  );
}
