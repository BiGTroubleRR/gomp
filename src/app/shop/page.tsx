'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSite } from '@/contexts/SiteContext';
import TransitionLink from '@/components/TransitionLink';
import SiteNav from '@/components/SiteNav';
import { passmarkLookup, tierFromPassmark, TIER_COLORS } from '@/lib/passmark';
import { useIsMobile } from '@/lib/use-media-query';

type FilterId = 'all' | 'flagship' | 'performance' | 'midrange' | 'entry';

type TierKey = 'tier_flagship' | 'tier_performance' | 'tier_midrange' | 'tier_entry';

type Product = {
  id: number;
  name: string;
  cat: Exclude<FilterId, 'all'>;
  tagline_en: string;
  tagline_sk: string;
  gpu: string;
  cpu: string;
  ram: string;
  storage: string;
  priceEur: number;
  tier: TierKey;
  rating: string;
};

const PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'The Apex Predator',
    cat: 'flagship',
    tagline_en: 'Ultimate 4K gaming & creation',
    tagline_sk: 'Špičkové 4K hranie a tvorba',
    gpu: 'RTX 5090 FE',
    cpu: 'Ryzen 9 9950X',
    ram: '32GB DDR5 6400',
    storage: '2TB NVMe Gen5',
    priceEur: 3739,
    tier: 'tier_flagship',
    rating: '4.9 / 5',
  },
  {
    id: 2,
    name: 'The Marauder Pro',
    cat: 'performance',
    tagline_en: 'Unstoppable 4K all-rounder',
    tagline_sk: 'Neporaziteľný univerzál pre 4K',
    gpu: 'RTX 4090',
    cpu: 'Core i9-14900K',
    ram: '32GB DDR5 5600',
    storage: '2TB NVMe Gen4',
    priceEur: 2869,
    tier: 'tier_performance',
    rating: '4.8 / 5',
  },
  {
    id: 3,
    name: 'The Marauder',
    cat: 'performance',
    tagline_en: 'Dominant 1440p performer',
    tagline_sk: 'Dominantný výkon v 1440p',
    gpu: 'RTX 4080 Super',
    cpu: 'Core i9-14900KS',
    ram: '32GB DDR5 5200',
    storage: '1TB NVMe Gen4',
    priceEur: 2169,
    tier: 'tier_performance',
    rating: '4.7 / 5',
  },
  {
    id: 4,
    name: 'The Ranger',
    cat: 'midrange',
    tagline_en: 'Smooth 1440p at great value',
    tagline_sk: 'Plynulé 1440p za skvelú cenu',
    gpu: 'RTX 4070 Ti Super',
    cpu: 'Core i7-14700K',
    ram: '32GB DDR4 3600',
    storage: '1TB NVMe Gen4',
    priceEur: 1569,
    tier: 'tier_midrange',
    rating: '4.6 / 5',
  },
  {
    id: 5,
    name: 'The Scout Pro',
    cat: 'midrange',
    tagline_en: '1080p powerhouse, real value',
    tagline_sk: 'Silák na 1080p za rozumnú cenu',
    gpu: 'RTX 4070 Super',
    cpu: 'Core i5-14600K',
    ram: '16GB DDR5 5200',
    storage: '1TB NVMe Gen3',
    priceEur: 1299,
    tier: 'tier_midrange',
    rating: '4.7 / 5',
  },
  {
    id: 6,
    name: 'The Scout',
    cat: 'entry',
    tagline_en: 'Entry-level gaming excellence',
    tagline_sk: 'Špička v základnej triede',
    gpu: 'RTX 4070',
    cpu: 'Core i5-14600K',
    ram: '16GB DDR4 3600',
    storage: '1TB NVMe Gen3',
    priceEur: 1039,
    tier: 'tier_entry',
    rating: '4.5 / 5',
  },
];

const TRANSLATIONS = {
  en: {
    nav_home: 'Home',
    nav_shop: 'Shop',
    nav_build: 'Build',
    nav_about: 'About',
    nav_account: 'Account',
    nav_startbuilding: 'Start Building →',
    eyebrow: 'Prebuilt PCs',
    title: 'Pick your build.',
    configure_arrow: 'Configure →',
    need_specific: 'Need something specific?',
    need_specific_desc:
      'Use the 3D PC Builder to configure every component to your exact specification. Watch it come together in real time.',
    open_3d: 'Open 3D Builder →',
    footer_terms: 'Terms & Conditions',
    footer_privacy: 'Privacy Policy',
    footer_disclaimer:
      'Prices are shown for guidance only, converted at approximate market rates (1 € ≈ 24.30 Kč, reference Jul 2026). Final price confirmed at checkout.',
    filter_all: 'All',
    filter_flagship: 'Flagship',
    filter_performance: 'Performance',
    filter_midrange: 'Mid-Range',
    filter_entry: 'Entry',
    tier_flagship: 'Flagship',
    tier_performance: 'Performance',
    tier_midrange: 'Mid-Range',
    tier_entry: 'Entry',
    verify_passmark: 'Verify ↗',
    vat_included: 'Price includes VAT',
    showing: (n: number) => `Showing ${n} configurations`,
  },
  sk: {
    nav_home: 'Domov',
    nav_shop: 'Obchod',
    nav_build: 'Zostaviť',
    nav_about: 'O nás',
    nav_account: 'Účet',
    nav_startbuilding: 'Začať stavať →',
    eyebrow: 'Hotové zostavy',
    title: 'Vyberte si zostavu.',
    configure_arrow: 'Konfigurovať →',
    need_specific: 'Potrebujete niečo špecifické?',
    need_specific_desc:
      'Použite 3D konfigurátor a nastavte každý komponent presne podľa vašich požiadaviek. Sledujte, ako sa zostava skladá v reálnom čase.',
    open_3d: 'Otvoriť 3D konfigurátor →',
    footer_terms: 'Obchodné podmienky',
    footer_privacy: 'Ochrana osobných údajov',
    footer_disclaimer:
      'Ceny slúžia len na orientáciu, prepočítané približným trhovým kurzom (1 € ≈ 24,30 Kč, referenčný júl 2026). Konečná cena bude potvrdená pri objednávke.',
    filter_all: 'Všetky',
    filter_flagship: 'Vlajkové',
    filter_performance: 'Výkonné',
    filter_midrange: 'Stredná trieda',
    filter_entry: 'Základné',
    tier_flagship: 'Vlajková loď',
    tier_performance: 'Výkonnostná',
    tier_midrange: 'Stredná trieda',
    tier_entry: 'Základná',
    verify_passmark: 'Overiť ↗',
    vat_included: 'Cena vrátane DPH',
    showing: (n: number) => `Zobrazených ${n} konfigurácií`,
  },
} as const;

type StringKey = Exclude<keyof typeof TRANSLATIONS.en, 'showing'>;

const FILTER_DEFS: { id: FilterId; key: StringKey }[] = [
  { id: 'all', key: 'filter_all' },
  { id: 'flagship', key: 'filter_flagship' },
  { id: 'performance', key: 'filter_performance' },
  { id: 'midrange', key: 'filter_midrange' },
  { id: 'entry', key: 'filter_entry' },
];

const ACTIVE_COLOR = '#6E1423';
const INACTIVE_COLOR = '#7A7469';

function SpecRow({
  label,
  value,
  passmarkName,
  verifyLabel,
  last,
}: {
  label: string;
  value: string;
  passmarkName?: string;
  verifyLabel?: string;
  last?: boolean;
}) {
  const isGpu = label === 'GPU';
  const pm = passmarkName ? passmarkLookup(passmarkName) : null;
  const tierColor = pm ? TIER_COLORS[tierFromPassmark(isGpu, pm.score)].text : null;

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '10px 0',
          borderBottom: last ? 'none' : '0.5px solid rgba(28,28,26,0.07)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 10,
            color: '#7A7469',
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {label}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#1C1C1A' }}>{value}</span>
      </div>
      {pm && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 0',
            borderBottom: '0.5px solid rgba(28,28,26,0.07)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: tierColor ?? undefined, fontWeight: 600 }}>
            PassMark {pm.score.toLocaleString()}
          </span>
          <a
            href={pm.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: '#6E1423', textDecoration: 'none', fontWeight: 500 }}
          >
            {verifyLabel}
          </a>
        </div>
      )}
    </>
  );
}

export default function Shop() {
  const { lang, currency, setLang, setCurrency, fmt } = useSite();
  const [filter, setFilter] = useState<FilterId>('all');
  const isMobile = useIsMobile();

  const t = TRANSLATIONS[lang];
  const filtered = filter === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.cat === filter);

  return (
    <div style={{ position: 'relative', zIndex: 2, background: '#F5F0E6', minHeight: '100vh' }}>
      {/* Nav */}
      <SiteNav
        cta={
          <TransitionLink
            href="/build"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 500,
              color: '#FDFAF4',
              background: '#6E1423',
              textDecoration: 'none',
              padding: '9px 22px',
              borderRadius: 2,
            }}
          >
            {t.nav_startbuilding}
          </TransitionLink>
        }
      />

      {/* Header + filter bar */}
      <div style={{ padding: isMobile ? '70px 24px 0' : '110px 60px 0', borderBottom: '0.5px solid rgba(28,28,26,0.12)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              fontWeight: 500,
              color: '#7A7469',
              letterSpacing: 2.5,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            {t.eyebrow}
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'flex-end',
              justifyContent: 'space-between',
              gap: isMobile ? 8 : 0,
              marginBottom: 36,
            }}
          >
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: isMobile ? 38 : 64,
                fontWeight: 600,
                letterSpacing: -2,
                color: '#1C1C1A',
                margin: 0,
                lineHeight: 0.95,
              }}
            >
              {t.title}
            </h1>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#7A7469', fontWeight: 300, marginBottom: isMobile ? 0 : 4 }}>
              {t.showing(filtered.length)}
            </div>
          </div>
          <div style={{ overflowX: isMobile ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch' as const }}>
            <div style={{ display: 'flex', gap: 0, borderTop: '0.5px solid rgba(28,28,26,0.12)' }}>
              {FILTER_DEFS.map((fd) => {
                const isActive = filter === fd.id;
                return (
                  <button
                    key={fd.id}
                    onClick={() => setFilter(fd.id)}
                    style={{
                      background: isActive ? '#6E1423' : 'transparent',
                      color: isActive ? '#FDFAF4' : '#7A7469',
                      border: 'none',
                      borderRight: '0.5px solid rgba(28,28,26,0.1)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 12,
                      fontWeight: isActive ? 500 : 400,
                      padding: '14px 28px',
                      cursor: 'pointer',
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                      flexShrink: isMobile ? 0 : undefined,
                      whiteSpace: isMobile ? 'nowrap' : undefined,
                    }}
                  >
                    {t[fd.key]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Product grid */}
      <div style={{ padding: isMobile ? '0 24px 50px' : '0 60px 100px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', borderLeft: '0.5px solid rgba(28,28,26,0.12)' }}>
            <AnimatePresence initial={false}>
              {filtered.map((prod, i) => (
                <motion.div
                  key={prod.id}
                  layout
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '0px 0px -8% 0px' }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.4, delay: Math.min(i, 5) * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    borderRight: '0.5px solid rgba(28,28,26,0.12)',
                    borderBottom: '0.5px solid rgba(28,28,26,0.12)',
                    padding: isMobile ? '28px 20px' : '36px 32px',
                    background: '#FDFAF4',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#7A7469',
                      letterSpacing: 2,
                      textTransform: 'uppercase',
                    }}
                  >
                    {t[prod.tier]}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7A7469' }}>{prod.rating}</div>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 26,
                    fontWeight: 600,
                    color: '#1C1C1A',
                    letterSpacing: -0.4,
                    marginBottom: 4,
                    lineHeight: 1.1,
                  }}
                >
                  {prod.name}
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#7A7469', marginBottom: 28, fontWeight: 300 }}>
                  {lang === 'sk' ? prod.tagline_sk : prod.tagline_en}
                </div>
                <div style={{ borderTop: '0.5px solid rgba(28,28,26,0.1)', flex: 1, marginBottom: 24 }}>
                  <SpecRow label="GPU" value={prod.gpu} passmarkName={prod.gpu} verifyLabel={t.verify_passmark} />
                  <SpecRow label="CPU" value={prod.cpu} passmarkName={prod.cpu} verifyLabel={t.verify_passmark} />
                  <SpecRow label="RAM" value={prod.ram} />
                  <SpecRow label="SSD" value={prod.storage} last />
                </div>
                <div
                  style={{
                    borderTop: '0.5px solid rgba(28,28,26,0.14)',
                    paddingTop: 20,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    marginTop: 'auto',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 26,
                        fontWeight: 500,
                        color: '#1C1C1A',
                        letterSpacing: -0.5,
                        lineHeight: 1,
                      }}
                    >
                      {fmt(prod.priceEur)}
                    </div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#7A7469', marginTop: 3, fontWeight: 300 }}>
                      {t.vat_included}
                    </div>
                  </div>
                  <TransitionLink
                    href="/build"
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 12,
                      fontWeight: 500,
                      color: '#FDFAF4',
                      background: '#6E1423',
                      padding: '9px 16px',
                      borderRadius: 2,
                      textDecoration: 'none',
                    }}
                  >
                    {t.configure_arrow}
                  </TransitionLink>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Custom prompt CTA */}
      <div style={{ borderTop: '0.5px solid rgba(28,28,26,0.12)', background: '#FDFAF4', padding: isMobile ? '36px 24px' : '72px 60px' }}>
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: isMobile ? 24 : 60,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: isMobile ? 26 : 40,
                fontWeight: 600,
                letterSpacing: -0.8,
                color: '#1C1C1A',
                marginBottom: 12,
                lineHeight: 1.1,
              }}
            >
              {t.need_specific}
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: '#7A7469', fontWeight: 300, maxWidth: 500, lineHeight: 1.7 }}>
              {t.need_specific_desc}
            </div>
          </div>
          <TransitionLink
            href="/build"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 500,
              color: '#FDFAF4',
              background: '#6E1423',
              padding: '14px 28px',
              borderRadius: 2,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {t.open_3d}
          </TransitionLink>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: '#1C1C1A', padding: isMobile ? 24 : 60, borderTop: '0.5px solid rgba(28,28,26,0.3)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'center',
              justifyContent: 'space-between',
              gap: isMobile ? 20 : 0,
            }}
          >
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 600, fontStyle: 'italic', color: '#C4A35A', letterSpacing: 1.5 }}>
              GOMP
            </div>
            <div style={{ display: 'flex', gap: 28, flexWrap: isMobile ? 'wrap' : undefined }}>
              <TransitionLink
                href="/"
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'rgba(245,240,230,0.4)', textDecoration: 'none', fontWeight: 300 }}
              >
                {t.nav_home}
              </TransitionLink>
              <TransitionLink
                href="/build"
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'rgba(245,240,230,0.4)', textDecoration: 'none', fontWeight: 300 }}
              >
                {t.nav_build}
              </TransitionLink>
              <TransitionLink
                href="/about"
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'rgba(245,240,230,0.4)', textDecoration: 'none', fontWeight: 300 }}
              >
                {t.nav_about}
              </TransitionLink>
              <TransitionLink
                href="/terms"
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'rgba(245,240,230,0.4)', textDecoration: 'none', fontWeight: 300 }}
              >
                {t.footer_terms}
              </TransitionLink>
              <TransitionLink
                href="/privacy"
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'rgba(245,240,230,0.4)', textDecoration: 'none', fontWeight: 300 }}
              >
                {t.footer_privacy}
              </TransitionLink>
            </div>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'rgba(245,240,230,0.3)', fontWeight: 300 }}>
              © 2026 GOMP · Prague, CZ
            </span>
          </div>
          <div style={{ borderTop: '0.5px solid rgba(245,240,230,0.08)', marginTop: 24, paddingTop: 20 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'rgba(245,240,230,0.28)', fontWeight: 300, lineHeight: 1.6 }}>
              {t.footer_disclaimer}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
