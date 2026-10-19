'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useSite } from '@/contexts/SiteContext';
import TransitionLink from '@/components/TransitionLink';
import SiteNav from '@/components/SiteNav';
import { TIER_COLORS, type Tier } from '@/lib/passmark';
import { resolvePassmark, type PassmarkDisplay } from '@/lib/build-passmark';
import { useIsMobile } from '@/lib/use-media-query';
import { pick } from '@/lib/i18n';
import { fetchPrebuilts } from '@/lib/supabase/prebuilts';
import { fetchComponentDb, getCachedComponentDb } from '@/lib/supabase/components';
import { computeBuildTotalGross, computeBuildTier, defaultComponentDb, type Build, type ComponentDb } from '@/lib/component-db-seed';
import TierBadge from '@/components/TierBadge';

type FilterId = 'all' | 'flagship' | 'performance' | 'midrange' | 'entry';

type TierKey = 'tier_flagship' | 'tier_performance' | 'tier_midrange' | 'tier_entry';
const CAT_TIER_KEY: Record<Build['cat'], TierKey> = {
  flagship: 'tier_flagship',
  performance: 'tier_performance',
  midrange: 'tier_midrange',
  entry: 'tier_entry',
};

// Product data now lives in the `prebuilt_pcs` Supabase table (see src/lib/supabase/prebuilts.ts)
// so an Admin edit reaches this page, the homepage hero, and the /build carry-over live — see
// the `products`/`useEffect` below instead of a hardcoded array.

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
      'Prices are shown in CZK (Kč); the € figure is an approximate conversion (1 € ≈ 24.30 Kč, reference Jul 2026). Final price confirmed at checkout.',
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
    spec_storage: 'SSD',
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
    need_specific: 'Nie sú PREBUILT podľa Vašej chuti?',
    need_specific_desc:
      'Použite 3D konfigurátor a sledujte ako sa každý komponent objaví v reálnom čase.',
    open_3d: 'Otvoriť 3D konfigurátor →',
    footer_terms: 'Obchodné podmienky',
    footer_privacy: 'Ochrana osobných údajov',
    footer_disclaimer:
      'Ceny sú uvedené v Kč; suma v € je približný prepočet (1 € ≈ 24,30 Kč, referenčný júl 2026). Konečná cena bude potvrdená pri objednávke.',
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
    spec_storage: 'SSD',
    showing: (n: number) => `Zobrazených ${n} konfigurácií`,
  },
  cz: {
    nav_home: 'Domů',
    nav_shop: 'Obchod',
    nav_build: 'Sestavit',
    nav_about: 'O nás',
    nav_account: 'Účet',
    nav_startbuilding: 'Začít stavět →',
    eyebrow: 'Hotové sestavy',
    title: 'Vyberte si sestavu.',
    configure_arrow: 'Konfigurovat →',
    need_specific: 'Potřebujete něco konkrétního?',
    need_specific_desc:
      'Použijte 3D konfigurátor a nastavte každou komponentu přesně podle svých požadavků. Sledujte, jak se sestava skládá v reálném čase.',
    open_3d: 'Otevřít 3D konfigurátor →',
    footer_terms: 'Obchodní podmínky',
    footer_privacy: 'Ochrana osobních údajů',
    footer_disclaimer:
      'Ceny jsou uvedeny v Kč; částka v € je přibližný přepočet (1 € ≈ 24,30 Kč, referenční červenec 2026). Konečná cena bude potvrzena při objednávce.',
    filter_all: 'Všechny',
    filter_flagship: 'Vlajkové',
    filter_performance: 'Výkonné',
    filter_midrange: 'Střední třída',
    filter_entry: 'Základní',
    tier_flagship: 'Vlajková loď',
    tier_performance: 'Výkonnostní',
    tier_midrange: 'Střední třída',
    tier_entry: 'Základní',
    verify_passmark: 'Ověřit ↗',
    vat_included: 'Cena včetně DPH',
    spec_storage: 'SSD',
    showing: (n: number) => {
      const mod10 = n % 10;
      const mod100 = n % 100;
      if (mod10 === 1 && mod100 !== 11) return `Zobrazena ${n} konfigurace`;
      if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return `Zobrazeny ${n} konfigurace`;
      return `Zobrazeno ${n} konfigurací`;
    },
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

const ACTIVE_COLOR = '#3FAE74';
const INACTIVE_COLOR = '#98A39D';

function SpecRow({
  label,
  value,
  passmark,
  verifyLabel,
  last,
}: {
  label: string;
  value: string;
  passmark?: PassmarkDisplay | null;
  verifyLabel?: string;
  last?: boolean;
}) {
  const tierColor = passmark ? TIER_COLORS[passmark.tier].text : null;

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          padding: '10px 0',
          borderBottom: last ? 'none' : '0.5px solid rgba(235,230,218,0.07)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 10,
            color: '#3FAE74',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 1,
            flexShrink: 0,
          }}
        >
          {label}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#EBE6DA', textAlign: 'right', flex: 1, minWidth: 0 }}>{value}</span>
      </div>
      {passmark && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 0',
            borderBottom: '0.5px solid rgba(235,230,218,0.07)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: tierColor ?? undefined, fontWeight: 600 }}>
            PassMark {passmark.score.toLocaleString()}
          </span>
          {passmark.url && (
            <a
              href={passmark.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: '#3FAE74', textDecoration: 'none', fontWeight: 500 }}
            >
              {verifyLabel}
            </a>
          )}
        </div>
      )}
    </>
  );
}

// /shop's filters live in the URL (?cat= / ?tier= / ?q=) so the header's search box and KATEGÓRIE menu
// (and any shared link) can drive them; the chips below write back to the same params.
const CAT_IDS = ['flagship', 'performance', 'midrange', 'entry'] as const;

function ShopInner() {
  const { lang, currency, setLang, setCurrency, fmt, vatRatePct } = useSite();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlCat = searchParams.get('cat');
  const filter: FilterId = (CAT_IDS as readonly string[]).includes(urlCat ?? '') ? (urlCat as FilterId) : 'all';
  const q = (searchParams.get('q') || '').trim();
  const urlTier = searchParams.get('tier');
  const tierFilter: Tier | null = urlTier === 'S' || urlTier === 'A' || urlTier === 'B' ? urlTier : null;
  const isMobile = useIsMobile();

  function setParam(key: 'cat' | 'tier' | 'q', value: string | null) {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    const qs = p.toString();
    router.replace(qs ? `/shop?${qs}` : '/shop', { scroll: false });
  }

  // One-time fetch, backed by fetchPrebuilts' own short-TTL cache — no Realtime subscription on
  // this public page (see the same reasoning in src/app/page.tsx). Admin keeps its subscription.
  const [products, setProducts] = useState<Build[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchPrebuilts().then((data) => {
      if (!cancelled) setProducts(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Live component catalog, used to compute each listing's price from its actual parts instead
  // of trusting the prebuilt's own stored (and easily stale) price field — see computeBuildTotal.
  const [compDb, setCompDb] = useState<ComponentDb>(() => getCachedComponentDb() ?? defaultComponentDb());
  useEffect(() => {
    let cancelled = false;
    fetchComponentDb().then((db) => {
      if (!cancelled) setCompDb(db);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const t = TRANSLATIONS[lang];
  const live = products.filter((p) => p.isLive);
  const filtered = useMemo(() => {
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    return live.filter((p) => {
      if (filter !== 'all' && p.cat !== filter) return false;
      if (tierFilter && computeBuildTier(p, compDb) !== tierFilter) return false;
      if (tokens.length) {
        const hay = [p.name, p.taglineEn, p.taglineSk, p.taglineCz, p.gpu, p.cpu, p.ram, p.storage, p.cooler, p.mobo, p.psu, p.case].join(' ').toLowerCase();
        if (!tokens.every((tk) => hay.includes(tk))) return false;
      }
      return true;
    });
  }, [live, filter, q, tierFilter, compDb]);

  return (
    <div style={{ position: 'relative', zIndex: 2, background: '#0D0D0C', minHeight: '100vh' }}>
      {/* Nav */}
      <SiteNav />

      {/* Header + filter bar */}
      <div style={{ padding: isMobile ? '30px 24px 0' : '50px 60px 0', borderBottom: '0.5px solid rgba(235,230,218,0.12)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              fontWeight: 500,
              color: '#98A39D',
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
                color: '#EBE6DA',
                margin: 0,
                lineHeight: 0.95,
              }}
            >
              {t.title}
            </h1>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#98A39D', fontWeight: 300, marginBottom: isMobile ? 0 : 4 }}>
              {t.showing(filtered.length)}
            </div>
          </div>
          <div style={{ overflowX: isMobile ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch' as const }}>
            <div style={{ display: 'flex', gap: 0, borderTop: '0.5px solid rgba(235,230,218,0.12)' }}>
              {FILTER_DEFS.map((fd) => {
                const isActive = filter === fd.id;
                return (
                  <button
                    key={fd.id}
                    onClick={() => setParam('cat', fd.id === 'all' ? null : fd.id)}
                    style={{
                      background: isActive ? '#1F8A55' : 'transparent',
                      color: isActive ? '#FDFAF4' : '#98A39D',
                      border: 'none',
                      borderRight: '0.5px solid rgba(235,230,218,0.1)',
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
          {(q || tierFilter) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '18px 0' }}>
              {[
                q ? { key: 'q' as const, label: pick(lang, { en: `Search: “${q}”`, sk: `Hľadanie: „${q}“`, cz: `Hledání: „${q}“` }) } : null,
                tierFilter ? { key: 'tier' as const, label: pick(lang, { en: `Class ${tierFilter}`, sk: `Trieda ${tierFilter}`, cz: `Třída ${tierFilter}` }) } : null,
              ]
                .filter((c): c is { key: 'q' | 'tier'; label: string } => c !== null)
                .map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setParam(c.key, null)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(63,174,116,0.12)', color: '#3FAE74', border: '1px solid rgba(63,174,116,0.4)', borderRadius: 20, padding: '6px 14px', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {c.label} <span aria-hidden>✕</span>
                  </button>
                ))}
            </div>
          )}
          {filtered.length === 0 && (
            <div style={{ padding: '60px 0', textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: 15, color: '#98A39D' }}>
              {pick(lang, {
                en: 'No builds match your search.',
                sk: 'Vášmu hľadaniu nezodpovedá žiadna zostava.',
                cz: 'Vašemu hledání neodpovídá žádná sestava.',
              })}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', borderLeft: '0.5px solid rgba(235,230,218,0.12)' }}>
            <AnimatePresence initial={false}>
              {filtered.map((prod, i) => (
                <motion.div
                  key={prod.id}
                  layout
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.4, delay: Math.min(i, 5) * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    borderRight: '0.5px solid rgba(235,230,218,0.12)',
                    borderBottom: '0.5px solid rgba(235,230,218,0.12)',
                    padding: isMobile ? '28px 20px' : '36px 32px',
                    background: '#131A17',
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
                      color: '#98A39D',
                      letterSpacing: 2,
                      textTransform: 'uppercase',
                    }}
                  >
                    {t[CAT_TIER_KEY[prod.cat]]}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <TierBadge tier={computeBuildTier(prod, compDb)} small />
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#98A39D' }}>{prod.rating.toFixed(1)} / 5</div>
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 26,
                    fontWeight: 600,
                    color: '#EBE6DA',
                    letterSpacing: -0.4,
                    marginBottom: 4,
                    lineHeight: 1.1,
                  }}
                >
                  {prod.name}
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#98A39D', marginBottom: 28, fontWeight: 300 }}>
                  {pick(lang, { en: prod.taglineEn, sk: prod.taglineSk, cz: prod.taglineCz })}
                </div>
                <div style={{ borderTop: '0.5px solid rgba(235,230,218,0.1)', flex: 1, marginBottom: 24 }}>
                  <SpecRow label="GPU" value={prod.gpu} passmark={resolvePassmark(prod.gpu, true, compDb)} verifyLabel={t.verify_passmark} />
                  <SpecRow label="CPU" value={prod.cpu} passmark={resolvePassmark(prod.cpu, false, compDb)} verifyLabel={t.verify_passmark} />
                  <SpecRow label="RAM" value={prod.ram} />
                  <SpecRow label={t.spec_storage} value={prod.storage} last />
                </div>
                <div
                  style={{
                    borderTop: '0.5px solid rgba(235,230,218,0.14)',
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
                        fontFamily: 'var(--font-serif)',
                        fontSize: 26,
                        fontWeight: 500,
                        color: '#EBE6DA',
                        letterSpacing: -0.5,
                        lineHeight: 1,
                      }}
                    >
                      {fmt(computeBuildTotalGross(prod, compDb, vatRatePct))}
                    </div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#98A39D', marginTop: 3, fontWeight: 300 }}>
                      {t.vat_included}
                    </div>
                  </div>
                  <TransitionLink
                    href={`/build?prebuilt=${prod.id}`}
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 12,
                      fontWeight: 500,
                      color: '#FDFAF4',
                      background: '#1F8A55',
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
      <div style={{ borderTop: '0.5px solid rgba(235,230,218,0.12)', background: '#131A17', padding: isMobile ? '36px 24px' : '72px 60px' }}>
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
                color: '#EBE6DA',
                marginBottom: 12,
                lineHeight: 1.1,
              }}
            >
              {t.need_specific}
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: '#98A39D', fontWeight: 300, maxWidth: 500, lineHeight: 1.7 }}>
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
              background: '#1F8A55',
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
      <footer style={{ background: '#1A231F', padding: isMobile ? 24 : 60, borderTop: '0.5px solid rgba(235,230,218,0.3)' }}>
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
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 600, color: '#C4A35A', letterSpacing: 1.5 }}>
              GOMP
            </div>
            <div style={{ display: 'flex', gap: 28, flexWrap: isMobile ? 'wrap' : undefined }}>
              <TransitionLink
                href="/"
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'rgba(235,230,218,0.4)', textDecoration: 'none', fontWeight: 300 }}
              >
                {t.nav_home}
              </TransitionLink>
              <TransitionLink
                href="/build"
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'rgba(235,230,218,0.4)', textDecoration: 'none', fontWeight: 300 }}
              >
                {t.nav_build}
              </TransitionLink>
              <TransitionLink
                href="/about"
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'rgba(235,230,218,0.4)', textDecoration: 'none', fontWeight: 300 }}
              >
                {t.nav_about}
              </TransitionLink>
              <TransitionLink
                href="/terms"
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'rgba(235,230,218,0.4)', textDecoration: 'none', fontWeight: 300 }}
              >
                {t.footer_terms}
              </TransitionLink>
              <TransitionLink
                href="/privacy"
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'rgba(235,230,218,0.4)', textDecoration: 'none', fontWeight: 300 }}
              >
                {t.footer_privacy}
              </TransitionLink>
            </div>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'rgba(235,230,218,0.3)', fontWeight: 300 }}>
              © 2026 GOMP · Prague, CZ
            </span>
          </div>
          <div style={{ borderTop: '0.5px solid rgba(235,230,218,0.08)', marginTop: 24, paddingTop: 20 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'rgba(235,230,218,0.28)', fontWeight: 300, lineHeight: 1.6 }}>
              {t.footer_disclaimer}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// useSearchParams() needs a Suspense boundary for the page to prerender statically.
export default function Shop() {
  return (
    <Suspense fallback={null}>
      <ShopInner />
    </Suspense>
  );
}
