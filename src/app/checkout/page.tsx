'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useSite } from '@/contexts/SiteContext';
import TransitionLink from '@/components/TransitionLink';
import Case3DViewer, { type CompDb } from '@/components/Case3DViewer';
import SiteNav from '@/components/SiteNav';
import { readJSON, type Currency, type Lang } from '@/lib/gomp-storage';
import { useIsMobile } from '@/lib/use-media-query';

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

type CheckoutForm = {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  cardNumber: string;
  cardName: string;
  expiry: string;
  cvv: string;
  promo: string;
};

const EMPTY_FORM: CheckoutForm = {
  firstName: '',
  lastName: '',
  email: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  cardNumber: '',
  cardName: '',
  expiry: '',
  cvv: '',
  promo: '',
};

const SHIPPING_OPTIONS: { id: ShippingId; name_en: string; name_sk: string; eta_en: string; eta_sk: string; priceEur: number }[] = [
  { id: 'standard', name_en: 'Standard Shipping', name_sk: 'Štandardná doprava', eta_en: '8–12 business days', eta_sk: '8 – 12 pracovných dní', priceEur: 0 },
  { id: 'express', name_en: 'Express Shipping', name_sk: 'Expresná doprava', eta_en: '3–5 business days', eta_sk: '3 – 5 pracovných dní', priceEur: 43 },
  { id: 'overnight', name_en: 'Overnight', name_sk: 'Cez noc', eta_en: 'Next business day', eta_sk: 'Nasledujúci pracovný deň', priceEur: 112 },
];

const ASSEMBLY_FEE_EUR = 130;

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
    continue_payment: 'Continue to Payment →',
    payment: 'Payment',
    payment_desc: 'Secure, encrypted payment processing.',
    card_holder: 'Card Holder',
    expires: 'Expires',
    card_number: 'Card Number',
    name_on_card: 'Name on Card',
    expiry_date: 'Expiry Date',
    promo_code: 'Promo Code',
    optional: 'optional',
    apply: 'Apply',
    promo_success: 'GOMP2026 — 5% discount applied',
    ssl_note: '256-bit SSL encryption · PCI DSS compliant',
    back: '← Back',
    processing: 'Processing…',
    place_order: 'Place Order  →  ',
    order_confirmed: 'Order Confirmed',
    build_on_way_line1: 'Your Build is',
    build_on_way_line2: 'On Its Way.',
    confirmation_sent: 'Confirmation sent to',
    order: 'Order',
    delivering_to: 'Delivering to',
    estimated_arrival: 'Estimated arrival',
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
    continue_payment: 'Pokračovať na platbu →',
    payment: 'Platba',
    payment_desc: 'Bezpečné, šifrované spracovanie platby.',
    card_holder: 'Držiteľ karty',
    expires: 'Platnosť do',
    card_number: 'Číslo karty',
    name_on_card: 'Meno na karte',
    expiry_date: 'Dátum platnosti',
    promo_code: 'Zľavový kód',
    optional: 'nepovinné',
    apply: 'Použiť',
    promo_success: 'GOMP2026 — uplatnená zľava 5 %',
    ssl_note: '256-bitové šifrovanie SSL · v súlade s PCI DSS',
    back: '← Späť',
    processing: 'Spracúva sa…',
    place_order: 'Odoslať objednávku  →  ',
    order_confirmed: 'Objednávka potvrdená',
    build_on_way_line1: 'Vaša zostava je',
    build_on_way_line2: 'na ceste.',
    confirmation_sent: 'Potvrdenie odoslané na',
    order: 'Objednávka',
    delivering_to: 'Doručuje sa na',
    estimated_arrival: 'Predpokladaný príchod',
    build_another: '← Zostaviť ďalšiu',
    go_home: 'Prejsť na domovskú stránku',
    itemCount: (n: number) => `${n} komponentov · zostavené a otestované`,
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

function formatCardNumber(raw: string) {
  return raw
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)} / ${digits.slice(2)}` : digits;
}

function generateOrderNum(seed: number) {
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
        animation: 'gompOverlayOut 0.9s 0.1s cubic-bezier(.16,1,.3,1) forwards',
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

  const [build, setBuild] = useState<GompBuild | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [shipping, setShipping] = useState<ShippingId>('standard');
  const [promoApplied, setPromoApplied] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [selectedSavedAddr, setSelectedSavedAddr] = useState<number | null>(null);
  const [form, setForm] = useState<CheckoutForm>(EMPTY_FORM);

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
    return d.toLocaleDateString(lang === 'sk' ? 'sk-SK' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }, [shipping, lang]);

  const stepLabels = lang === 'sk' ? ['Doprava', 'Platba', 'Potvrdenie'] : ['Shipping', 'Payment', 'Confirm'];

  const cardDigits = form.cardNumber.replace(/\D/g, '');
  const cardPreview = cardDigits
    .padEnd(16, '•')
    .replace(/(.{4})/g, '$1 ')
    .trim();
  const cardHolderPreview = form.cardName || '— — — —';
  const expiryPreview = form.expiry || 'MM / YY';

  function handleSelectSavedAddr(i: number) {
    setSelectedSavedAddr(i);
    const a = savedAddresses[i];
    setForm((f) => ({ ...f, address: a.street, city: a.city, zip: a.zip }));
  }

  function handleApplyPromo() {
    if (form.promo.trim().toLowerCase() === 'gomp2026') setPromoApplied(true);
  }

  function handlePlaceOrder() {
    if (placing) return;
    setPlacing(true);
    placeOrderTimeout.current = setTimeout(() => {
      setOrderNumber(generateOrderNum(Math.floor(Math.random() * 1e9)));
      setStep(3);
      setPlacing(false);
    }, 1800);
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
              {shippingCostEur === 0 ? (lang === 'sk' ? 'Zadarmo' : 'Free') : fmt(shippingCostEur)}
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
              <div style={{ marginBottom: 16 }}>
                <Field label={t.email_address} value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} type="email" />
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
                  const name = lang === 'sk' ? opt.name_sk : opt.name_en;
                  const eta = lang === 'sk' ? opt.eta_sk : opt.eta_en;
                  const priceStr = opt.priceEur === 0 ? (lang === 'sk' ? 'Zadarmo' : 'Free') : fmt(opt.priceEur);
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

              <div style={{ background: 'linear-gradient(135deg,#6E1423 0%,#8E2A3A 100%)', borderRadius: 4, padding: isMobile ? '20px 18px 16px' : '24px 24px 20px', marginBottom: 28, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ position: 'absolute', bottom: -30, right: 30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
                <div style={{ ...sans, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 20 }}>
                  GOMP SECURE
                </div>
                <div style={{ ...mono, fontSize: 18, color: 'rgba(255,255,255,0.9)', letterSpacing: 4, marginBottom: 20 }}>{cardPreview}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ ...sans, fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>
                      {t.card_holder}
                    </div>
                    <div style={{ ...sans, fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{cardHolderPreview}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ ...sans, fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>
                      {t.expires}
                    </div>
                    <div style={{ ...mono, fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{expiryPreview}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <Field
                  label={t.card_number}
                  value={form.cardNumber}
                  onChange={(v) => setForm((f) => ({ ...f, cardNumber: formatCardNumber(v) }))}
                  placeholder="0000  0000  0000  0000"
                  maxLength={19}
                  monospace
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <Field label={t.name_on_card} value={form.cardName} onChange={(v) => setForm((f) => ({ ...f, cardName: v }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
                <Field
                  label={t.expiry_date}
                  value={form.expiry}
                  onChange={(v) => setForm((f) => ({ ...f, expiry: formatExpiry(v) }))}
                  placeholder="MM / YY"
                  maxLength={7}
                  monospace
                />
                <Field
                  label="CVV"
                  value={form.cvv}
                  onChange={(v) => setForm((f) => ({ ...f, cvv: v.replace(/\D/g, '').slice(0, 4) }))}
                  placeholder="•••"
                  maxLength={4}
                  type="password"
                  monospace
                />
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

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
                <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                  <rect x={1} y={5} width={12} height={8} rx={1} stroke={MUTED} strokeWidth={0.8} />
                  <path d="M4 5V3.5a3 3 0 0 1 6 0V5" stroke={MUTED} strokeWidth={0.8} />
                </svg>
                <span style={{ ...sans, fontSize: 11, color: MUTED }}>{t.ssl_note}</span>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setStep(1)}
                  style={{ padding: '15px 24px', background: 'transparent', color: MUTED, border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 2, ...sans, fontSize: 13, cursor: 'pointer' }}
                >
                  {t.back}
                </button>
                <button
                  onClick={handlePlaceOrder}
                  style={{ flex: 1, padding: 15, background: MAROON, color: PANEL_BG, border: 'none', borderRadius: 2, ...sans, fontSize: 14, fontWeight: 500, cursor: 'pointer', letterSpacing: 0.3 }}
                >
                  {placing ? t.processing : `${t.place_order}${fmt(grandTotalEur)}`}
                </button>
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
                {t.order_confirmed}
              </div>
              <div style={{ ...serif, fontSize: isMobile ? 28 : 42, fontWeight: 600, color: INK, lineHeight: 1.1, marginBottom: 10 }}>
                {t.build_on_way_line1}
                <br />
                {t.build_on_way_line2}
              </div>
              <div style={{ ...sans, fontSize: 13, color: MUTED, fontWeight: 300, marginBottom: 8 }}>
                {t.confirmation_sent} {form.email}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 40 }}>
                <span style={{ ...sans, fontSize: 12, color: MUTED }}>{t.order}</span>
                <span style={{ ...mono, fontSize: 13, color: INK, background: 'rgba(110,20,35,0.07)', padding: '4px 10px', borderRadius: 2 }}>{orderNumber}</span>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ ...sans, fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: 1.5 }}>{t.estimated_arrival}</span>
                  <span style={{ ...serif, fontSize: 16, fontWeight: 500, color: INK }}>{deliveryDate}</span>
                </div>
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
