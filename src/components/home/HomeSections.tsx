'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CSSProperties, ReactNode, useState } from 'react';
import { useSite } from '@/contexts/SiteContext';
import { pick } from '@/lib/i18n';
import TransitionLink from '@/components/TransitionLink';
import Reveal from '@/components/Reveal';
import {
  ACCENT,
  ACCENT_GRADIENT,
  BORDER,
  BORDER_STRONG,
  GOLD,
  GOLD_LIGHT,
  INK,
  MUTED,
  ON_ACCENT,
  PAGE_BG,
  PANEL_BG,
  SURFACE_ALT,
  SURFACE_RAISED,
} from '@/lib/design-tokens';
import { BuildCaseArt, MIN_CONFIG_NET_CZK, PAD_X, SectionHead, StarRow, TierCircle, type HomeBuild, type L3 } from './home-shared';

const T: Record<string, L3> = {
  readyToShip: { en: 'CONFIGURED FOR YOU', sk: 'NAKONFIGUROVANÉ PRE VÁS', cz: 'NAKONFIGUROVÁNO PRO VÁS' },
  featured: { en: 'Featured builds', sk: 'Odporúčané zostavy', cz: 'Doporučené sestavy' },
  viewAll: { en: 'All prebuilt GOMPs →', sk: 'Všetky prebuilt GOMPy →', cz: 'Všechny prebuilt GOMPy →' },
  loading: { en: 'Builds are being prepared.', sk: 'Zostavy sa pripravujú.', cz: 'Sestavy se připravují.' },
  tierWord: { en: 'CLASS', sk: 'TRIEDA', cz: 'TŘÍDA' },
  ratingWord: { en: 'RATING', sk: 'HODNOTENIE', cz: 'HODNOCENÍ' },
  vat: { en: 'Price incl. VAT', sk: 'Cena vrátane DPH', cz: 'Cena včetně DPH' },
  cooling: { en: 'COOLING', sk: 'CHLADENIE', cz: 'CHLAZENÍ' },
  configure: { en: 'CONFIGURE THIS BUILD →', sk: 'NAKONFIGUROVAŤ TÚTO ZOSTAVU →', cz: 'NAKONFIGUROVAT TUTO SESTAVU →' },
  prev: { en: 'Previous', sk: 'Predošlá', cz: 'Předchozí' },
  next: { en: 'Next', sk: 'Ďalšia', cz: 'Další' },
  priceFrom: { en: 'PRICES FROM', sk: 'CENY OD', cz: 'CENY OD' },
  priceBlurb: {
    en: 'Top of its price class. Upgradable all the way to flagship.',
    sk: 'Špička vo svojej cenovej kategórii. Rozšíriteľná až po vlajkovú loď.',
    cz: 'Špička ve své cenové kategorii. Rozšiřitelná až po vlajkovou loď.',
  },
  cfgEyebrow: { en: 'GOMP 3D CONFIG', sk: 'GOMP 3D CONFIG', cz: 'GOMP 3D CONFIG' },
  cfgA: { en: 'Your build.', sk: 'Vaša zostava.', cz: 'Vaše sestava.' },
  cfgB: { en: 'Your rules.', sk: 'Vaše pravidlá.', cz: 'Vaše pravidla.' },
  cfgDesc: {
    en: 'Build your legend yourself in our 3D configurator and watch every component appear in real time.',
    sk: 'Poskladajte si svoju legendu sami v našom 3D konfigurátore a sledujte, ako sa každý komponent objaví v reálnom čase.',
    cz: 'Poskládejte si svou legendu sami v našem 3D konfigurátoru a sledujte, jak se každá součástka objeví v reálném čase.',
  },
  cfgCta: { en: 'OPEN THE 3D CONFIGURATOR →', sk: 'OTVORIŤ 3D KONFIGURÁTOR →', cz: 'OTEVŘÍT 3D KONFIGURÁTOR →' },
  topRated: { en: 'Top rated', sk: 'Najlepšie hodnotené', cz: 'Nejlépe hodnocené' },
  topGpu: { en: 'Most powerful GPU', sk: 'Najvýkonnejšie GPU', cz: 'Nejvýkonnější GPU' },
  cheapest: { en: 'Most affordable', sk: 'Najdostupnejšie', cz: 'Nejdostupnější' },
  whyEyebrow: { en: 'WHY GOMP', sk: 'PREČO GOMP', cz: 'PROČ GOMP' },
  whyTitle: { en: 'GOMP values', sk: 'Hodnoty GOMP', cz: 'Hodnoty GOMP' },
  brands: { en: 'COMPONENTS IN OUR BUILDS', sk: 'KOMPONENTY V NAŠICH ZOSTAVÁCH', cz: 'KOMPONENTY V NAŠICH SESTAVÁCH' },
  stat1: { en: 'Custom builds shipped', sk: 'Expedovaných zostáv na mieru', cz: 'Expedovaných sestav na míru' },
  stat2: { en: 'Customer satisfaction', sk: 'Spokojnosť zákazníkov', cz: 'Spokojenost zákazníků' },
  stat3: { en: 'Warranty on parts & labor', sk: 'Záruka na diely a prácu', cz: 'Záruka na díly a práci' },
};

const panel: CSSProperties = { background: PANEL_BG, border: `1px solid ${BORDER}` };

function Section({ children, isMobile, top = 48 }: { children: ReactNode; isMobile: boolean; top?: number }) {
  return (
    <section style={{ padding: `${isMobile ? Math.round(top * 0.75) : top}px ${PAD_X(isMobile)}px 0` }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>{children}</div>
    </section>
  );
}

// ------------------------------------------------------------------ trust strip
const ICON_PROPS = { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: ACCENT, strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const TRUST: { href: string; icon: ReactNode; title: L3; sub: L3 }[] = [
  {
    href: '/terms#complaints',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M12 3l7.5 2.7v5.6c0 4.4-3 7.6-7.5 9.7-4.5-2.1-7.5-5.3-7.5-9.7V5.7L12 3z" />
        <path d="M8.8 12.2l2.3 2.3 4.2-4.6" />
      </svg>
    ),
    title: { en: '2-YEAR WARRANTY', sk: '2-ROČNÁ ZÁRUKA', cz: '2LETÁ ZÁRUKA' },
    sub: { en: 'On all parts and labor', sk: 'Na všetky diely a prácu', cz: 'Na všechny díly a práci' },
  },
  {
    href: '/undervolting',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M13 2.5L5 13.5h5.5L10 21.5l8-11h-5.5L13 2.5z" />
      </svg>
    ),
    title: { en: 'UNDERVOLT AS STANDARD', sk: 'UNDERVOLT AKO ŠTANDARD', cz: 'UNDERVOLT JAKO STANDARD' },
    sub: { en: 'Lower temps & power draw', sk: 'Nižšie teploty a spotreba', cz: 'Nižší teploty a spotřeba' },
  },
  {
    href: '/benchmarks',
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="5" y="3.5" width="14" height="17" rx="2" />
        <path d="M9 8h6M9 12h6M9 16h3.5" />
      </svg>
    ),
    title: { en: 'BENCHMARK TESTED', sk: 'OTESTOVANÉ BENCHMARKMI', cz: 'OTESTOVÁNO BENCHMARKY' },
    sub: { en: 'With a printed report', sk: 'S tlačeným protokolom', cz: 'S tištěným protokolem' },
  },
  {
    href: '/about',
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="8.2" r="3.6" />
        <path d="M4.8 20c.6-3.6 3.4-5.6 7.2-5.6s6.6 2 7.2 5.6" />
      </svg>
    ),
    title: { en: 'PERSONAL SERVICE', sk: 'OSOBNÝ PRÍSTUP', cz: 'OSOBNÍ PŘÍSTUP' },
    sub: { en: 'The PC you actually need', sk: 'PC, ktoré naozaj potrebuješ', cz: 'PC, které opravdu potřebuješ' },
  },
];

export function TrustStrip({ isMobile, avgRating }: { isMobile: boolean; avgRating: number }) {
  const { lang } = useSite();
  const items = [
    ...TRUST,
    {
      href: '/customer-builds',
      icon: (
        <svg {...ICON_PROPS}>
          <path d="M12 3.4l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8L12 3.4z" />
        </svg>
      ),
      title: { en: `★ ${avgRating.toFixed(1)} RATING`, sk: `★ ${avgRating.toFixed(1)} HODNOTENIE`, cz: `★ ${avgRating.toFixed(1)} HODNOCENÍ` },
      sub: { en: '100% customer satisfaction', sk: '100% spokojnosť zákazníkov', cz: '100% spokojených zákazníků' },
    },
  ];
  return (
    <Section isMobile={isMobile} top={30}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(5, minmax(0, 1fr))', gap: isMobile ? 20 : 12, paddingBottom: 28, borderBottom: `1px solid ${BORDER}` }}>
        {items.map((it) => (
          <TransitionLink
            key={it.href}
            href={it.href}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, background: 'transparent', color: INK }}
          >
            {it.icon}
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, letterSpacing: 0.9, color: INK }}>{pick(lang, it.title)}</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: MUTED, fontWeight: 300, marginTop: -4 }}>{pick(lang, it.sub)}</span>
          </TransitionLink>
        ))}
      </div>
    </Section>
  );
}

// ------------------------------------------------------------------ featured builds
function SpecLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, padding: '7px 0', borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 700, letterSpacing: 1, color: ACCENT, flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: INK, textAlign: 'right', flex: 1, minWidth: 0 }}>{value}</span>
    </div>
  );
}

function PassmarkBar({ label, score, max, gold }: { label: string; score: number; max: number; gold?: boolean }) {
  const pct = Math.max(4, Math.min(100, (score / max) * 100));
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-sans)', fontSize: 11, color: MUTED, marginBottom: 5 }}>
        <span>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', color: INK, fontWeight: 600 }}>{score.toLocaleString('cs-CZ')}</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'rgba(235,230,218,0.1)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 3,
            background: gold ? `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT})` : ACCENT_GRADIENT,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  );
}

export function FeaturedBuilds({ builds, isMobile }: { builds: HomeBuild[]; isMobile: boolean }) {
  const { lang, fmt, vatRatePct } = useSite();
  const t = (k: string) => pick(lang, T[k]);
  const top = builds.slice(0, 5);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Falls back to the first build until (or unless) the chosen one exists in the loaded list.
  const selectedIdx = Math.max(0, top.findIndex((b) => b.id === selectedId));
  const sel = top[selectedIdx];

  const go = (delta: number) => {
    if (!top.length) return;
    setSelectedId(top[(selectedIdx + delta + top.length) % top.length].id);
  };

  const head = (
    <SectionHead
      eyebrow={t('readyToShip')}
      title={t('featured')}
      right={
        <TransitionLink href="/shop" style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 700, color: ACCENT, whiteSpace: 'nowrap', background: 'transparent' }}>
          {t('viewAll')}
        </TransitionLink>
      }
    />
  );

  if (!sel) {
    return (
      <Section isMobile={isMobile}>
        {head}
        <div style={{ ...panel, padding: 40, textAlign: 'center', color: MUTED, fontFamily: 'var(--font-sans)', fontSize: 14 }}>{t('loading')}</div>
      </Section>
    );
  }

  const navBtn: CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px', fontFamily: 'var(--font-sans)', fontSize: 12, color: MUTED };

  return (
    <Section isMobile={isMobile}>
      <Reveal revealKey="home-featured">
        {head}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 1.9fr) minmax(0, 1fr)', gap: 14 }}>
          {/* detail panel */}
          <div style={{ ...panel, padding: isMobile ? 20 : 28, display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : '220px minmax(0, 1fr)', gap: isMobile ? 20 : 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, background: SURFACE_ALT, border: `1px solid ${BORDER}`, padding: '24px 12px', position: 'relative' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <TierCircle tier={sel.tier} size={44} />
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: 1.2, color: MUTED, marginTop: 6 }}>{t('tierWord')}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ width: 44, height: 44, borderRadius: '50%', border: `1.5px solid ${BORDER_STRONG}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: INK }}>
                    {sel.rating.toFixed(1)}
                  </span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: 1.2, color: MUTED, marginTop: 6 }}>{t('ratingWord')}</div>
                </div>
              </div>
              <BuildCaseArt width={isMobile ? 104 : 118} />
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: 1.8, textTransform: 'uppercase', color: GOLD_LIGHT }}>
                {pick(lang, sel.catLabel)} · {t('tierWord')} {sel.tier ?? '—'}
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: isMobile ? 26 : 32, fontWeight: 600, color: INK, margin: '6px 0 4px', letterSpacing: -0.5, lineHeight: 1.05, overflowWrap: 'anywhere' }}>{sel.name}</h2>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: MUTED, fontWeight: 300 }}>{sel.tagline}</div>
              <div style={{ margin: '10px 0 0' }}>
                <StarRow rating={sel.rating} size={12} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: MUTED }}> / 5</span>
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: isMobile ? 30 : 36, fontWeight: 700, color: ACCENT, margin: '12px 0 0', lineHeight: 1 }}>{fmt(sel.priceCzk)}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: MUTED, margin: '4px 0 14px' }}>
                {t('vat')} ({vatRatePct}%)
              </div>
              <div style={{ borderTop: `1px solid ${BORDER}` }}>
                <SpecLine label="GPU" value={sel.gpu} />
                <SpecLine label="CPU" value={sel.cpu} />
                <SpecLine label="RAM" value={sel.ram} />
                <SpecLine label="SSD" value={sel.storage} />
                <SpecLine label={t('cooling')} value={sel.cooler} />
              </div>
              {sel.gpuPm && <PassmarkBar label="GPU PassMark" score={sel.gpuPm.score} max={40000} />}
              {sel.cpuPm && <PassmarkBar label="CPU PassMark" score={sel.cpuPm.score} max={70000} gold />}
              <TransitionLink
                href={sel.href}
                style={{ display: 'block', textAlign: 'center', marginTop: 18, background: ACCENT_GRADIENT, color: ON_ACCENT, padding: '14px 16px', borderRadius: 2, fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 700, letterSpacing: 0.8 }}
              >
                {t('configure')}
              </TransitionLink>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <button onClick={() => go(-1)} style={navBtn}>
                  ‹ {t('prev')}
                </button>
                <button onClick={() => go(1)} style={navBtn}>
                  {t('next')} ›
                </button>
              </div>
            </div>
          </div>

          {/* selectable list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {top.map((b) => {
              const active = b.id === sel.id;
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedId(b.id)}
                  aria-pressed={active}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    textAlign: 'left',
                    cursor: 'pointer',
                    padding: '10px 14px',
                    background: active ? SURFACE_RAISED : PANEL_BG,
                    border: `1px solid ${active ? ACCENT : BORDER}`,
                    boxShadow: active ? `0 0 0 1px ${ACCENT} inset` : 'none',
                    flex: 1,
                    minHeight: 64,
                    transition: 'border-color 0.15s ease, background-color 0.15s ease',
                  }}
                >
                  <BuildCaseArt width={32} glow={false} accent={active ? ACCENT : '#2F7F58'} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
                    <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: MUTED, marginTop: 3 }}>{fmt(b.priceCzk)}</span>
                  </span>
                  <TierCircle tier={b.tier} size={30} />
                </button>
              );
            })}
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

// ------------------------------------------------------------------ price tile + 3D config banner
export function ConfigBanner({ isMobile, onStartBuilding }: { isMobile: boolean; onStartBuilding: () => void }) {
  const { lang, fmtGross } = useSite();
  const t = (k: string) => pick(lang, T[k]);
  return (
    <Section isMobile={isMobile}>
      <Reveal revealKey="home-config">
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) minmax(0, 2.5fr)', gap: 14 }}>
          <div style={{ ...panel, padding: isMobile ? 24 : 32, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: 2, color: MUTED }}>{t('priceFrom')}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: isMobile ? 34 : 40, fontWeight: 700, color: ACCENT, margin: '8px 0 4px', lineHeight: 1.05 }}>{fmtGross(MIN_CONFIG_NET_CZK)}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: MUTED, marginBottom: 14 }}>{t('vat')}</div>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: MUTED, fontWeight: 300, lineHeight: 1.65, margin: 0 }}>{t('priceBlurb')}</p>
          </div>
          <div style={{ position: 'relative', overflow: 'hidden', minHeight: isMobile ? 280 : 230, border: `1px solid ${BORDER_STRONG}`, background: PAGE_BG }}>
            <Image src="/home/banner-config.jpg" alt="" fill sizes="(max-width: 768px) 100vw, 880px" style={{ objectFit: 'cover' }} />
            <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(13,13,12,0.92) 0%, rgba(13,13,12,0.6) 55%, rgba(13,13,12,0.1) 100%)' }} />
            <div style={{ position: 'relative', padding: isMobile ? 24 : '34px 40px', maxWidth: 520, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: 2, color: GOLD_LIGHT, marginBottom: 10 }}>{t('cfgEyebrow')}</div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: isMobile ? 28 : 36, fontWeight: 600, letterSpacing: -0.6, lineHeight: 1.05, color: INK, margin: 0 }}>
                {t('cfgA')} <span style={{ color: GOLD }}>{t('cfgB')}</span>
              </h2>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: MUTED, fontWeight: 300, lineHeight: 1.65, margin: '12px 0 20px', maxWidth: 420 }}>{t('cfgDesc')}</p>
              <div>
                <button
                  onClick={onStartBuilding}
                  style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT})`, color: PAGE_BG, border: 'none', cursor: 'pointer', padding: '13px 24px', borderRadius: 2, fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 700, letterSpacing: 0.8 }}
                >
                  {t('cfgCta')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

// ------------------------------------------------------------------ three ranked lists
function RankedRow({ b, label }: { b: HomeBuild; label: string }) {
  const { fmt } = useSite();
  return (
    <TransitionLink
      href={b.href}
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: `1px solid ${BORDER}`, background: 'transparent' }}
    >
      <span style={{ ...panel, width: 56, height: 68, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <BuildCaseArt width={38} glow={false} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
        <span style={{ display: 'block', marginTop: 3 }}>
          <StarRow rating={b.rating} size={10} />
        </span>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700, color: INK }}>{fmt(b.priceCzk)}</span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10.5, color: MUTED }}>{label}</span>
        </span>
      </span>
    </TransitionLink>
  );
}

export function RankedLists({ builds, isMobile }: { builds: HomeBuild[]; isMobile: boolean }) {
  const { lang } = useSite();
  const t = (k: string) => pick(lang, T[k]);
  if (!builds.length) return null;
  const byRating = [...builds].sort((a, b) => b.rating - a.rating).slice(0, 3);
  const byGpu = [...builds].sort((a, b) => (b.gpuPm?.score ?? 0) - (a.gpuPm?.score ?? 0)).slice(0, 3);
  const byPrice = [...builds].sort((a, b) => a.priceCzk - b.priceCzk).slice(0, 3);
  const cols: { title: string; rows: HomeBuild[]; label: (b: HomeBuild) => string }[] = [
    { title: t('topRated'), rows: byRating, label: (b) => pick(lang, b.catLabel) },
    { title: t('topGpu'), rows: byGpu, label: (b) => (b.gpuPm ? `GPU ${b.gpuPm.score.toLocaleString('cs-CZ')}` : '') },
    { title: t('cheapest'), rows: byPrice, label: (b) => pick(lang, b.catLabel) },
  ];
  return (
    <Section isMobile={isMobile} top={56}>
      <Reveal revealKey="home-ranked">
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(3, minmax(0, 1fr))', gap: isMobile ? 28 : 36 }}>
          {cols.map((c) => (
            <div key={c.title}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 600, color: INK, margin: '0 0 6px', paddingBottom: 10, borderBottom: `2px solid ${ACCENT}`, display: 'inline-block' }}>{c.title}</h3>
              <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: -1 }}>
                {c.rows.map((b) => (
                  <RankedRow key={b.id} b={b} label={c.label(b)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}

// ------------------------------------------------------------------ values + stats
const VALUES: { num: string; href: string; title: L3; desc: L3 }[] = [
  {
    num: '01',
    href: '/about',
    title: { en: 'Personal service', sk: 'Osobný prístup', cz: 'Osobní přístup' },
    desc: {
      en: 'Our goal is to sell every customer a GOMP they don’t just want — but truly need.',
      sk: 'Naším cieľom je predať každému zákazníkovi GOMP, ktorý nielen chce, ale aj potrebuje.',
      cz: 'Naším cílem je prodat každému zákazníkovi GOMP, který nejen chce, ale i potřebuje.',
    },
  },
  {
    num: '02',
    href: '/terms#complaints',
    title: { en: '2-year warranty', sk: '2-ročná záruka', cz: '2letá záruka' },
    desc: {
      en: 'Comprehensive coverage on all parts and labor. No questions, no runarounds, ever.',
      sk: 'Kompletné krytie všetkých dielov a práce. Bez zbytočných otázok a prieťahov.',
      cz: 'Kompletní krytí všech dílů a práce. Bez zbytečných otázek a průtahů.',
    },
  },
  {
    num: '03',
    href: '/benchmarks',
    title: { en: 'Benchmark tested', sk: 'Otestované benchmarkmi', cz: 'Otestováno benchmarky' },
    desc: {
      en: 'Every machine ships with a printed performance validation sheet from our testing rig.',
      sk: 'Každý počítač expedujeme s tlačeným protokolom o výkonnostných testoch.',
      cz: 'Každý počítač expedujeme s tištěným protokolem o výkonnostních testech.',
    },
  },
  {
    num: '04',
    href: '/undervolting',
    title: { en: 'Undervolted by default', sk: 'Undervolt ako štandard', cz: 'Undervolt jako standard' },
    desc: {
      en: 'Every CPU and GPU is undervolted wherever the platform allows it — lower temperatures, quieter fans, less power draw, with zero performance lost.',
      sk: 'Každý CPU a GPU podvoltujeme všade, kde to platforma umožňuje — nižšie teploty, tichšie ventilátory, nižšia spotreba, bez straty výkonu.',
      cz: 'Každý CPU a GPU podvoltujeme všude, kde to platforma umožňuje — nižší teploty, tišší ventilátory, nižší spotřeba, bez ztráty výkonu.',
    },
  },
];

export function ValuesSection({ isMobile, avgRating }: { isMobile: boolean; avgRating: number }) {
  const { lang } = useSite();
  const t = (k: string) => pick(lang, T[k]);
  const stats: { value: string; label: string; href?: string }[] = [
    { value: '20+', label: t('stat1'), href: '/customer-builds' },
    { value: '100%', label: t('stat2') },
    { value: '2yr', label: t('stat3'), href: '/terms#complaints' },
  ];
  return (
    <Section isMobile={isMobile} top={64}>
      <Reveal revealKey="home-values">
        <SectionHead
          eyebrow={t('whyEyebrow')}
          title={t('whyTitle')}
          right={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: 1.2, color: GOLD, whiteSpace: 'nowrap' }}>★ {avgRating.toFixed(1)} RATED</span>}
        />
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
          {VALUES.map((v) => (
            <TransitionLink
              key={v.num}
              href={v.href}
              style={{ ...panel, display: 'block', padding: isMobile ? 22 : 26, background: PANEL_BG, color: INK }}
            >
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 600, color: GOLD, lineHeight: 1 }}>{v.num}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 700, color: INK, margin: '16px 0 8px' }}>{pick(lang, v.title)}</div>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: MUTED, fontWeight: 300, lineHeight: 1.7, margin: 0 }}>{pick(lang, v.desc)}</p>
            </TransitionLink>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: isMobile ? 12 : 24, marginTop: 36, paddingTop: 28, borderTop: `1px solid ${BORDER}` }}>
          {stats.map((s) => {
            const body = (
              <>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: isMobile ? 30 : 46, fontWeight: 600, color: INK, letterSpacing: -1, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: isMobile ? 11 : 12.5, color: MUTED, marginTop: 8, fontWeight: 300 }}>{s.label}</div>
              </>
            );
            return s.href ? (
              <TransitionLink key={s.value} href={s.href} style={{ display: 'block', background: 'transparent' }}>
                {body}
              </TransitionLink>
            ) : (
              <div key={s.value}>{body}</div>
            );
          })}
        </div>
      </Reveal>
    </Section>
  );
}

// ------------------------------------------------------------------ brand strip
const BRANDS = ['NVIDIA', 'AMD', 'INTEL', 'ASUS', 'MSI', 'GIGABYTE', 'CORSAIR', 'SAMSUNG', 'G.SKILL', 'NZXT'];

export function BrandStrip({ isMobile }: { isMobile: boolean }) {
  const { lang } = useSite();
  return (
    <Section isMobile={isMobile} top={64}>
      <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: isMobile ? '24px 0' : '30px 0', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2.2, color: MUTED, marginBottom: 18 }}>{pick(lang, T.brands)}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: isMobile ? '12px 22px' : '14px 38px' }}>
          {BRANDS.map((name) => (
            <Link
              key={name}
              href={`/shop?q=${encodeURIComponent(name)}`}
              style={{ fontFamily: 'var(--font-sans)', fontSize: isMobile ? 12 : 14, fontWeight: 700, letterSpacing: 1.8, color: MUTED }}
            >
              {name}
            </Link>
          ))}
        </div>
      </div>
    </Section>
  );
}
