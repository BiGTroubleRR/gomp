'use client';

import { CSSProperties, ReactNode, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSite } from '@/contexts/SiteContext';
import TransitionLink from '@/components/TransitionLink';
import Reveal from '@/components/Reveal';
import SiteNav from '@/components/SiteNav';
import { navigateWithTransition } from '@/lib/gomp-nav';
import { useIsMobile } from '@/lib/use-media-query';

// ---- Palette (exact literal hex values from the original site) ----
const BG = '#F5F0E6';
const PANEL = '#FDFAF4';
const INK = '#1C1C1A';
const MUTED = '#7A7469';
const MAROON = '#6E1423';
const GOLD = '#C4A35A';

// ---- Translations ----
type Dict = Record<string, string>;

const TRANSLATIONS: Record<'en' | 'sk', Dict> = {
  en: {
    nav_home: 'Home', nav_shop: 'Shop', nav_build: 'Build', nav_about: 'About', nav_account: 'Account',
    nav_startbuilding: 'Start Building →',
    hero_eyebrow: 'Custom Gaming PCs · Prague',
    hero_title_line1: 'Build your', hero_title_em: 'Legend.',
    hero_desc: 'Configure your dream machine part by part. Every GOMP build is hand-assembled, benchmarked, and ships in seven days.',
    hero_cta_build: 'Start Building →', hero_cta_browse: 'Browse builds',
    stress_tested: 'STRESS TESTED',
    featured_build: 'Featured Build', apex_tagline: 'Ultimate 4K gaming & creation',
    spec_storage: 'Storage', spec_cooling: 'Cooling',
    configure_this: 'Configure this build →', configure_arrow: 'Configure →',
    stat1: 'Custom builds shipped', stat2: 'Average rating · 3,200+ reviews',
    stat3: 'Day average build & ship', stat4: 'Parts & labor warranty',
    ready_to_ship: 'Ready to Ship', featured_builds: 'Featured Builds', view_all: 'View all builds →',
    why_gomp: 'Why GOMP', gomp_standard: 'The GOMP Standard',
    yourbuild_line1: 'Your build.', yourbuild_line2: 'Your rules.',
    builder_desc: 'Use our 3D PC builder to see every component appear in real time as you configure your machine.',
    open_builder: 'Open the 3D Builder →',
    build_from: 'Build from', entry_scales: 'Entry-level excellence. Scales to flagship.',
    bullet1: '3-year parts & labor warranty', bullet2: 'Benchmark-tested before shipping', bullet3: 'Ships within 7 business days',
    footer_blurb: 'Hand-built gaming PCs configured to your exact specifications. Built by gamers, for gamers.',
    footer_products: 'Products', footer_prebuilt: 'Prebuilt PCs', footer_custom: 'Custom Builder', footer_accessories: 'Accessories',
    footer_company: 'Company', footer_aboutus: 'About Us', footer_careers: 'Careers',
    footer_support: 'Support', footer_warranty: 'Warranty', footer_contact: 'Contact',
    footer_rights: 'All rights reserved.', footer_madein: 'Hand-built in Prague, CZ',
    footer_disclaimer: 'Prices are shown for guidance only, converted at approximate market rates (1 € ≈ 24.30 Kč, reference Jul 2026). Final price confirmed at checkout.',
  },
  sk: {
    nav_home: 'Domov', nav_shop: 'Obchod', nav_build: 'Zostaviť', nav_about: 'O nás', nav_account: 'Účet',
    nav_startbuilding: 'Začať stavať →',
    hero_eyebrow: 'Herné počítače na mieru · Praha',
    hero_title_line1: 'Postav si svoju', hero_title_em: 'Legendu.',
    hero_desc: 'Vysnený, ručne stavaný, testovaný, tvoj.',
    hero_cta_build: 'Začať stavať →', hero_cta_browse: 'Prehliadať zostavy',
    stress_tested: 'ZÁŤAŽOVO TESTOVANÉ',
    featured_build: 'Odporúčaná zostava', apex_tagline: 'Špičkové 4K hranie a tvorba',
    spec_storage: 'Úložisko', spec_cooling: 'Chladenie',
    configure_this: 'Nakonfigurovať túto zostavu →', configure_arrow: 'Konfigurovať →',
    stat1: 'Expedovaných zostáv na mieru', stat2: 'Priemerné hodnotenie · 3200+ recenzií',
    stat3: 'Dní priemerná výroba a expedícia', stat4: 'Záruka na diely a prácu',
    ready_to_ship: 'Pripravené na expedíciu', featured_builds: 'Odporúčané zostavy', view_all: 'Zobraziť všetky zostavy →',
    why_gomp: 'Prečo GOMP', gomp_standard: 'Štandard GOMP',
    yourbuild_line1: 'Vaša zostava.', yourbuild_line2: 'Vaše pravidlá.',
    builder_desc: 'Použite náš 3D konfigurátor a sledujte, ako sa každý komponent objavuje v reálnom čase pri skladaní vášho počítača.',
    open_builder: 'Otvoriť 3D konfigurátor →',
    build_from: 'Ceny od', entry_scales: 'Špička v základnej triede. Rozšíriteľná až po vlajkovú loď.',
    bullet1: '3-ročná záruka na diely a prácu', bullet2: 'Pred expedíciou testované benchmarkmi', bullet3: 'Expedícia do 7 pracovných dní',
    footer_blurb: 'Ručne stavané herné počítače presne podľa vašich požiadaviek. Staviame ich hráči pre hráčov.',
    footer_products: 'Produkty', footer_prebuilt: 'Hotové zostavy', footer_custom: 'Vlastná konfigurácia', footer_accessories: 'Príslušenstvo',
    footer_company: 'Spoločnosť', footer_aboutus: 'O nás', footer_careers: 'Kariéra',
    footer_support: 'Podpora', footer_warranty: 'Záruka', footer_contact: 'Kontakt',
    footer_rights: 'Všetky práva vyhradené.', footer_madein: 'Ručne vyrábané v Prahe, ČR',
    footer_disclaimer: 'Ceny slúžia len na orientáciu, prepočítané približným trhovým kurzom (1 € ≈ 24,30 Kč, referenčný júl 2026). Konečná cena bude potvrdená pri objednávke.',
  },
};

// ---- Static content (translated fields resolved per-language at render time) ----
type BuildRaw = {
  tier_en: string; tier_sk: string; name: string;
  tagline_en: string; tagline_sk: string;
  gpu: string; cpu: string; ram: string; storage: string; priceEur: number;
};

const BUILDS_RAW: BuildRaw[] = [
  { tier_en: 'Flagship', tier_sk: 'Vlajková loď', name: 'The Apex Predator', tagline_en: 'Ultimate 4K gaming & creation', tagline_sk: 'Špičkové 4K hranie a tvorba', gpu: 'RTX 5090 FE', cpu: 'Ryzen 9 9950X', ram: '32GB DDR5 6400', storage: '2TB NVMe Gen5', priceEur: 3739 },
  { tier_en: 'Performance', tier_sk: 'Výkonnostná', name: 'The Marauder', tagline_en: 'Dominant 1440p performer', tagline_sk: 'Dominantný výkon v 1440p', gpu: 'RTX 4090', cpu: 'Core i9-14900K', ram: '32GB DDR5 5600', storage: '2TB NVMe Gen4', priceEur: 2609 },
  { tier_en: 'Value', tier_sk: 'Hodnotová', name: 'The Scout', tagline_en: 'Entry-level excellence', tagline_sk: 'Špička v základnej triede', gpu: 'RTX 4070 Ti Super', cpu: 'Core i5-14600K', ram: '16GB DDR4 3600', storage: '1TB NVMe Gen4', priceEur: 1129 },
];

type FeatureRaw = { num: string; title_en: string; title_sk: string; desc_en: string; desc_sk: string };

const FEATURES_RAW: FeatureRaw[] = [
  { num: '01', title_en: 'Hand-Assembled', title_sk: 'Ručná zostava', desc_en: 'Every build is crafted by expert technicians and stress-tested for 24 hours before it ships.', desc_sk: 'Každú zostavu vyrábajú skúsení technici a pred expedíciou ju 24 hodín záťažovo testujeme.' },
  { num: '02', title_en: '3-Year Warranty', title_sk: '3-ročná záruka', desc_en: 'Comprehensive coverage on all parts and labor. No questions, no runarounds, ever.', desc_sk: 'Kompletné krytie všetkých dielov a práce. Bez zbytočných otázok a prieťahov.' },
  { num: '03', title_en: 'Benchmark Tested', title_sk: 'Otestované benchmarkmi', desc_en: 'Every machine ships with a printed performance validation sheet from our testing rig.', desc_sk: 'Každý počítač expedujeme s tlačeným protokolom o výkonnostných testoch.' },
  { num: '04', title_en: 'Ships in 7 Days', title_sk: 'Expedícia do 7 dní', desc_en: 'From order confirmation to your door in under a week, guaranteed.', desc_sk: 'Od potvrdenia objednávky až k vašim dverám za menej než týždeň, garantovane.' },
];

// ---- Small presentational helpers ----
function SpecRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '11px 0',
        borderBottom: last ? 'none' : '0.5px solid rgba(28,28,26,0.08)',
      }}
    >
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: INK }}>{value}</span>
    </div>
  );
}

function BuildSpecRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 0',
        borderBottom: last ? 'none' : '0.5px solid rgba(28,28,26,0.07)',
      }}
    >
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: INK }}>{value}</span>
    </div>
  );
}

function CornerTicks({ color = GOLD, size = 18, inset = -1 }: { color?: string; size?: number; inset?: number }) {
  const corners: CSSProperties[] = [
    { top: inset, left: inset, borderTop: `1px solid ${color}`, borderLeft: `1px solid ${color}` },
    { top: inset, right: inset, borderTop: `1px solid ${color}`, borderRight: `1px solid ${color}` },
    { bottom: inset, left: inset, borderBottom: `1px solid ${color}`, borderLeft: `1px solid ${color}` },
    { bottom: inset, right: inset, borderBottom: `1px solid ${color}`, borderRight: `1px solid ${color}` },
  ];
  return (
    <>
      {corners.map((c, i) => (
        <div key={i} style={{ position: 'absolute', width: size, height: size, opacity: 0.5, pointerEvents: 'none', ...c }} />
      ))}
    </>
  );
}

function FooterLink({
  href,
  internal,
  children,
}: {
  href: string;
  internal?: boolean;
  children: ReactNode;
}) {
  const style: CSSProperties = {
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    color: 'rgba(245,240,230,0.5)',
    textDecoration: 'none',
    fontWeight: 300,
  };
  return internal ? (
    <TransitionLink href={href} style={style}>
      {children}
    </TransitionLink>
  ) : (
    <a href={href} style={style}>
      {children}
    </a>
  );
}

export default function Home() {
  const { lang, fmt } = useSite();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const [swiping, setSwiping] = useState(false);
  const swipingRef = useRef(false);

  const t = TRANSLATIONS[lang] ?? TRANSLATIONS.en;

  const builds = useMemo(
    () =>
      BUILDS_RAW.map((b) => ({
        tier: lang === 'sk' ? b.tier_sk : b.tier_en,
        name: b.name,
        tagline: lang === 'sk' ? b.tagline_sk : b.tagline_en,
        gpu: b.gpu,
        cpu: b.cpu,
        ram: b.ram,
        storage: b.storage,
        priceStr: fmt(b.priceEur),
      })),
    [lang, fmt],
  );

  const features = useMemo(
    () =>
      FEATURES_RAW.map((f) => ({
        num: f.num,
        title: lang === 'sk' ? f.title_sk : f.title_en,
        desc: lang === 'sk' ? f.desc_sk : f.desc_en,
      })),
    [lang],
  );

  const stats: [string, string][] = [
    ['12,400', t.stat1],
    ['4.9', t.stat2],
    ['7', t.stat3],
    ['3yr', t.stat4],
  ];

  function startBuilding() {
    if (swipingRef.current) return;
    swipingRef.current = true;
    setSwiping(true);
    setTimeout(() => {
      navigateWithTransition(pathname, '/build', () => router.push('/build'));
    }, 750);
  }

  return (
    <>
      <style>{`
        @keyframes gompRotateSlow { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes gompRotateSlowRev { from { transform:rotate(360deg); } to { transform:rotate(0deg); } }
        @keyframes gompFloatA { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-16px); } }
        @keyframes gompFloatB { 0%,100% { transform:translateY(0); } 50% { transform:translateY(14px); } }
        @keyframes gompPulseDot { 0%,100% { opacity:0.18; transform:scale(0.8); } 50% { opacity:0.6; transform:scale(1.2); } }
        @keyframes gompSwipeIn { from { transform:translateX(100%); } to { transform:translateX(0); } }
        @keyframes gompLetterSpin {
          0%   { transform:rotateY(70deg); opacity:0; }
          60%  { transform:rotateY(-8deg); opacity:1; }
          100% { transform:rotateY(0deg); opacity:1; }
        }
        @keyframes gompEmberRise {
          0%   { transform:translateY(0) scale(0.7); opacity:0; }
          25%  { opacity:1; }
          100% { transform:translateY(-46px) scale(1.15); opacity:0; }
        }
        @keyframes gompGlowPulse {
          0%,100% { opacity:0.55; transform:scale(0.94); }
          50%     { opacity:1; transform:scale(1.04); }
        }
        @keyframes gompFloatC { 0%,100% { transform:translate(0,0) rotate(0deg); } 50% { transform:translate(6px,-10px) rotate(6deg); } }
      `}</style>

      <div style={{ position: 'relative', zIndex: 2, background: BG, minHeight: '100vh' }}>
        {/* ---- Nav ---- */}
        <SiteNav
          cta={
            <button
              onClick={startBuilding}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 500,
                color: PANEL,
                background: MAROON,
                border: 'none',
                cursor: 'pointer',
                padding: '9px 22px',
                borderRadius: 2,
                letterSpacing: 0.2,
              }}
            >
              {t.nav_startbuilding}
            </button>
          }
        />

        {/* ---- Hero ---- */}
        <section style={{ minHeight: isMobile ? 'auto' : '100vh', padding: isMobile ? '100px 24px 64px' : '140px 60px 100px', display: 'flex', alignItems: 'center', position: 'relative' }}>
          <div
            style={{
              maxWidth: 1280,
              width: '100%',
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '55fr 45fr',
              gap: isMobile ? 56 : 80,
              alignItems: 'center',
              position: 'relative',
            }}
          >
            {/* Left: text */}
            <div style={{ animation: 'fadeUp 0.8s cubic-bezier(.16,1,.3,1) forwards', position: 'relative', zIndex: 2 }}>
              {/* floaties */}
              <div style={{ position: 'absolute', top: -64, left: -50, width: 250, height: 250, pointerEvents: 'none', zIndex: -1, display: isMobile ? 'none' : 'block' }}>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    border: '0.5px solid rgba(110,20,35,0.24)',
                    borderRadius: '50%',
                    animation: 'gompRotateSlow 110s linear infinite',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 32,
                    border: '0.5px solid rgba(110,20,35,0.14)',
                    borderRadius: '50%',
                    animation: 'gompRotateSlowRev 85s linear infinite',
                  }}
                />
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: 16,
                  left: 'calc(100% - 60px)',
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: MAROON,
                  pointerEvents: 'none',
                  zIndex: 1,
                  animation: 'gompPulseDot 5s ease-in-out infinite',
                  display: isMobile ? 'none' : 'block',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 190,
                  left: -30,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: GOLD,
                  filter: 'blur(0.5px)',
                  pointerEvents: 'none',
                  zIndex: 1,
                  animation: 'gompPulseDot 4.5s ease-in-out infinite 0.8s',
                  display: isMobile ? 'none' : 'block',
                }}
              />

              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: isMobile ? 10 : 11,
                  fontWeight: 500,
                  color: MUTED,
                  letterSpacing: 2.5,
                  textTransform: 'uppercase',
                  marginBottom: isMobile ? 20 : 32,
                }}
              >
                {t.hero_eyebrow}
              </div>
              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: isMobile ? 44 : 96,
                  fontWeight: 600,
                  lineHeight: 0.95,
                  letterSpacing: isMobile ? -1 : -2,
                  color: INK,
                  margin: isMobile ? '0 0 20px' : '0 0 36px',
                }}
              >
                {t.hero_title_line1}
                <br />
                <span style={{ fontStyle: 'italic', color: MAROON }}>{t.hero_title_em}</span>
              </h1>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: isMobile ? 15 : 17, lineHeight: 1.75, color: MUTED, margin: isMobile ? '0 0 32px' : '0 0 48px', maxWidth: 420, fontWeight: 300 }}>
                {t.hero_desc}
              </p>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={startBuilding}
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 14,
                    fontWeight: 500,
                    color: PANEL,
                    background: MAROON,
                    border: 'none',
                    cursor: 'pointer',
                    padding: '14px 28px',
                    borderRadius: 2,
                    letterSpacing: 0.2,
                  }}
                >
                  {t.hero_cta_build}
                </button>
                <TransitionLink
                  href="/shop"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 14,
                    color: INK,
                    border: '0.5px solid rgba(28,28,26,0.3)',
                    padding: '14px 28px',
                    borderRadius: 2,
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
                >
                  {t.hero_cta_browse}
                </TransitionLink>
              </div>
            </div>

            {/* Right: featured build card */}
            <div style={{ animation: 'fadeUp 1s 0.1s cubic-bezier(.16,1,.3,1) both', position: 'relative', zIndex: 2 }}>
              {/* floaties */}
              <div style={{ position: 'absolute', top: -56, right: -70, width: 260, height: 260, pointerEvents: 'none', zIndex: -1, display: isMobile ? 'none' : 'block' }}>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    border: '0.5px solid rgba(196,163,90,0.34)',
                    borderRadius: '50%',
                    animation: 'gompRotateSlow 100s linear infinite',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: -3,
                      left: '50%',
                      width: 5,
                      height: 5,
                      background: GOLD,
                      borderRadius: '50%',
                      transform: 'translateX(-50%)',
                    }}
                  />
                </div>
                <div
                  style={{
                    position: 'absolute',
                    inset: 36,
                    border: '0.5px solid rgba(196,163,90,0.2)',
                    borderRadius: '50%',
                    animation: 'gompRotateSlowRev 76s linear infinite',
                  }}
                />
              </div>
              <div style={{ position: 'absolute', bottom: -46, left: -56, width: 190, height: 190, pointerEvents: 'none', zIndex: -1, display: isMobile ? 'none' : 'block' }}>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    border: '0.5px solid rgba(110,20,35,0.22)',
                    borderRadius: '50%',
                    animation: 'gompRotateSlowRev 90s linear infinite',
                  }}
                />
              </div>
              <div
                style={{
                  position: 'absolute',
                  bottom: -18,
                  right: 24,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '10px 18px',
                  background: 'rgba(110,20,35,0.95)',
                  border: '0.5px solid rgba(255,255,255,0.18)',
                  borderRadius: 30,
                  boxShadow: '0 20px 40px -14px rgba(0,0,0,0.3)',
                  pointerEvents: 'none',
                  zIndex: 3,
                  animation: 'gompFloatA 7s ease-in-out infinite',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8A9B4', flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 0.5, color: BG, whiteSpace: 'nowrap' }}>
                  RTX 5090 · 32GB DDR5
                </span>
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: -18,
                  left: 24,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '10px 18px',
                  background: 'rgba(253,250,244,0.94)',
                  backdropFilter: 'blur(6px)',
                  border: '0.5px solid rgba(28,28,26,0.14)',
                  borderRadius: 30,
                  boxShadow: '0 20px 40px -16px rgba(28,28,26,0.16)',
                  pointerEvents: 'none',
                  zIndex: 3,
                  animation: 'gompFloatB 8.5s ease-in-out infinite',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 0.5, color: MAROON, whiteSpace: 'nowrap' }}>
                  {t.stress_tested}
                </span>
              </div>

              <div style={{ background: PANEL, border: '0.5px solid rgba(28,28,26,0.18)', borderRadius: 2, padding: isMobile ? 28 : 40, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: MAROON, borderRadius: '2px 2px 0 0' }} />
                <div
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 10,
                    fontWeight: 600,
                    color: MUTED,
                    letterSpacing: 2.5,
                    textTransform: 'uppercase',
                    marginBottom: 20,
                  }}
                >
                  {t.featured_build}
                </div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 600, color: INK, letterSpacing: -0.5, marginBottom: 4, lineHeight: 1.1 }}>
                  The Apex Predator
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: MUTED, marginBottom: 32 }}>{t.apex_tagline}</div>

                <div style={{ borderTop: '0.5px solid rgba(28,28,26,0.12)' }}>
                  <SpecRow label="GPU" value="RTX 5090 FE" />
                  <SpecRow label="CPU" value="Ryzen 9 9950X" />
                  <SpecRow label="RAM" value="32GB DDR5 6400" />
                  <SpecRow label={t.spec_storage} value="2TB NVMe Gen5" />
                  <SpecRow label={t.spec_cooling} value="360mm AIO" last />
                </div>

                <div style={{ borderTop: '0.5px solid rgba(28,28,26,0.18)', paddingTop: 24, marginTop: 8 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 40, fontWeight: 500, color: INK, letterSpacing: -1, marginBottom: 16, lineHeight: 1 }}>
                    {fmt(3739)}
                  </div>
                  <TransitionLink
                    href="/build"
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      background: MAROON,
                      color: PANEL,
                      padding: 13,
                      borderRadius: 2,
                      fontFamily: 'var(--font-sans)',
                      fontSize: 13,
                      fontWeight: 500,
                      textDecoration: 'none',
                      letterSpacing: 0.3,
                    }}
                  >
                    {t.configure_this}
                  </TransitionLink>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---- Stats strip ---- */}
        <div style={{ borderTop: '0.5px solid rgba(28,28,26,0.12)', borderBottom: '0.5px solid rgba(28,28,26,0.12)', position: 'relative' }}>
          {!isMobile && (
            <>
              <div
                style={{
                  position: 'absolute',
                  top: -46,
                  right: 100,
                  width: 130,
                  height: 130,
                  border: '0.5px solid rgba(196,163,90,0.3)',
                  borderRadius: '50%',
                  pointerEvents: 'none',
                  animation: 'gompRotateSlow 95s linear infinite',
                }}
              />
              <div
                style={{ position: 'absolute', top: -3, left: '25%', width: 6, height: 6, borderRadius: '50%', background: GOLD, pointerEvents: 'none', animation: 'gompPulseDot 4.2s ease-in-out infinite' }}
              />
              <div
                style={{ position: 'absolute', bottom: -3, left: '75%', width: 5, height: 5, borderRadius: '50%', background: MAROON, pointerEvents: 'none', animation: 'gompPulseDot 5.2s ease-in-out infinite 1.1s' }}
              />
            </>
          )}
          <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)' }}>
            {stats.map(([value, label], i) => (
              <Reveal
                key={label}
                revealKey={`stat-${i}`}
                delay={i * 90}
                style={{
                  padding: isMobile ? '28px 20px' : '44px 60px',
                  borderRight: isMobile ? (i % 2 === 1 ? 'none' : '0.5px solid rgba(28,28,26,0.12)') : i === stats.length - 1 ? 'none' : '0.5px solid rgba(28,28,26,0.12)',
                  borderBottom: isMobile ? (i < 2 ? '0.5px solid rgba(28,28,26,0.12)' : 'none') : 'none',
                }}
              >
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: isMobile ? 36 : 52, fontWeight: 600, color: INK, letterSpacing: -1.5, lineHeight: 1 }}>
                  {value}
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: isMobile ? 12 : 13, color: MUTED, marginTop: 6, fontWeight: 300 }}>{label}</div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* ---- Featured Builds ---- */}
        <section style={{ padding: isMobile ? '64px 24px' : '100px 60px', position: 'relative' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'flex-end', justifyContent: 'space-between', gap: isMobile ? 16 : 0, marginBottom: isMobile ? 32 : 56 }}>
              <div style={{ position: 'relative' }}>
                {!isMobile && (
                  <div style={{ position: 'absolute', top: -34, left: -46, width: 150, height: 150, pointerEvents: 'none', zIndex: -1 }}>
                    <div style={{ position: 'absolute', inset: 0, border: '0.5px solid rgba(110,20,35,0.2)', borderRadius: '50%', animation: 'gompRotateSlow 80s linear infinite' }} />
                    <div style={{ position: 'absolute', inset: 24, border: '0.5px solid rgba(110,20,35,0.12)', borderRadius: '50%', animation: 'gompRotateSlowRev 60s linear infinite' }} />
                  </div>
                )}
                <div
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 11,
                    fontWeight: 500,
                    color: MUTED,
                    letterSpacing: 2.5,
                    textTransform: 'uppercase',
                    marginBottom: 12,
                  }}
                >
                  {t.ready_to_ship}
                </div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: isMobile ? 34 : 52, fontWeight: 600, letterSpacing: -1.2, color: INK, margin: 0, lineHeight: 1 }}>
                  {t.featured_builds}
                </h2>
              </div>
              <TransitionLink
                href="/shop"
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  color: MAROON,
                  textDecoration: 'none',
                  borderBottom: '0.5px solid rgba(110,20,35,0.4)',
                  paddingBottom: 2,
                }}
              >
                {t.view_all}
              </TransitionLink>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)',
                gap: 0,
                border: '0.5px solid rgba(28,28,26,0.14)',
                borderRadius: 2,
                overflow: 'visible',
                position: 'relative',
              }}
            >
              {!isMobile && <CornerTicks color={GOLD} size={22} inset={-8} />}
              {builds.map((build, i) => (
                <Reveal
                  key={build.name}
                  revealKey={`featured-${i}`}
                  delay={i * 100}
                  style={{
                    padding: isMobile ? '28px 24px' : '36px 32px',
                    borderRight: isMobile || i === builds.length - 1 ? 'none' : '0.5px solid rgba(28,28,26,0.1)',
                    borderBottom: isMobile && i !== builds.length - 1 ? '0.5px solid rgba(28,28,26,0.1)' : 'none',
                    background: PANEL,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 10,
                      fontWeight: 600,
                      color: MUTED,
                      letterSpacing: 2,
                      textTransform: 'uppercase',
                      marginBottom: 16,
                    }}
                  >
                    {build.tier}
                  </div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 600, color: INK, letterSpacing: -0.4, marginBottom: 4, lineHeight: 1.1 }}>
                    {build.name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: MUTED, marginBottom: 28, fontWeight: 300 }}>{build.tagline}</div>

                  <div style={{ borderTop: '0.5px solid rgba(28,28,26,0.1)', flex: 1, marginBottom: 24 }}>
                    <BuildSpecRow label="GPU" value={build.gpu} />
                    <BuildSpecRow label="CPU" value={build.cpu} />
                    <BuildSpecRow label="RAM" value={build.ram} />
                    <BuildSpecRow label="SSD" value={build.storage} last />
                  </div>

                  <div
                    style={{
                      borderTop: '0.5px solid rgba(28,28,26,0.14)',
                      paddingTop: 20,
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      marginTop: 'auto',
                    }}
                  >
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 500, color: INK, letterSpacing: -0.5, lineHeight: 1 }}>
                      {build.priceStr}
                    </div>
                    <TransitionLink
                      href="/build"
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 12,
                        fontWeight: 500,
                        color: MAROON,
                        textDecoration: 'none',
                        borderBottom: '0.5px solid rgba(110,20,35,0.4)',
                        paddingBottom: 1,
                      }}
                    >
                      {t.configure_arrow}
                    </TransitionLink>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Why GOMP / GOMP Standard ---- */}
        <section style={{ borderTop: '0.5px solid rgba(28,28,26,0.12)', backgroundColor: PANEL, position: 'relative', overflow: 'hidden' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ padding: isMobile ? '56px 24px 32px' : '80px 60px 56px', position: 'relative' }}>
              {!isMobile && (
                <div style={{ position: 'absolute', top: -30, right: 40, width: 170, height: 170, pointerEvents: 'none', zIndex: 0 }}>
                  <div style={{ position: 'absolute', inset: 0, border: '0.5px solid rgba(196,163,90,0.28)', borderRadius: '50%', animation: 'gompRotateSlowRev 105s linear infinite' }} />
                  <div style={{ position: 'absolute', inset: 30, border: '0.5px solid rgba(196,163,90,0.16)', borderRadius: '50%', animation: 'gompRotateSlow 70s linear infinite' }} />
                </div>
              )}
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 11,
                  fontWeight: 500,
                  color: MUTED,
                  letterSpacing: 2.5,
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}
              >
                {t.why_gomp}
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: isMobile ? 34 : 52, fontWeight: 600, letterSpacing: -1.2, color: INK, margin: 0, lineHeight: 1 }}>
                {t.gomp_standard}
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4,1fr)', borderTop: '0.5px solid rgba(28,28,26,0.12)', position: 'relative' }}>
              {!isMobile && (
                <>
                  <div style={{ position: 'absolute', top: -3, left: '50%', width: 5, height: 5, borderRadius: '50%', background: MAROON, pointerEvents: 'none', animation: 'gompPulseDot 4.8s ease-in-out infinite 0.4s' }} />
                  <div style={{ position: 'absolute', bottom: -3, left: '25%', width: 4, height: 4, borderRadius: '50%', background: GOLD, pointerEvents: 'none', animation: 'gompPulseDot 5.6s ease-in-out infinite 0.9s' }} />
                </>
              )}
              {features.map((feat, i) => (
                <Reveal
                  key={feat.num}
                  revealKey={`standard-${i}`}
                  delay={i * 90}
                  style={{
                    padding: isMobile ? '32px 24px' : '48px 40px',
                    borderRight: isMobile || i === features.length - 1 ? 'none' : '0.5px solid rgba(28,28,26,0.1)',
                    borderBottom: isMobile && i !== features.length - 1 ? '0.5px solid rgba(28,28,26,0.1)' : 'none',
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: isMobile ? 48 : 64, fontWeight: 400, color: 'rgba(28,28,26,0.1)', letterSpacing: -2, lineHeight: 1, marginBottom: isMobile ? 16 : 24 }}>
                    {feat.num}
                  </div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600, color: INK, marginBottom: 12 }}>{feat.title}</div>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: MUTED, lineHeight: 1.75, margin: 0, fontWeight: 300 }}>{feat.desc}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---- CTA banner ---- */}
        <section style={{ padding: isMobile ? '64px 24px' : '120px 60px', borderTop: '0.5px solid rgba(28,28,26,0.12)', backgroundColor: BG, position: 'relative' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 40 : 80, alignItems: 'center', position: 'relative' }}>
            {!isMobile && (
              <>
                <div style={{ position: 'absolute', top: -50, left: '38%', width: 200, height: 200, pointerEvents: 'none', zIndex: 0 }}>
                  <div style={{ position: 'absolute', inset: 0, border: '0.5px solid rgba(110,20,35,0.2)', borderRadius: '50%', animation: 'gompRotateSlow 92s linear infinite' }} />
                </div>
                <div
                  style={{
                    position: 'absolute',
                    top: -20,
                    right: '46%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 16px',
                    background: 'rgba(253,250,244,0.94)',
                    backdropFilter: 'blur(6px)',
                    border: '0.5px solid rgba(28,28,26,0.14)',
                    borderRadius: 30,
                    boxShadow: '0 20px 40px -16px rgba(28,28,26,0.16)',
                    pointerEvents: 'none',
                    zIndex: 2,
                    animation: 'gompFloatC 9s ease-in-out infinite',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 0.5, color: MAROON, whiteSpace: 'nowrap' }}>★ 4.9 RATED</span>
                </div>
                <div style={{ position: 'absolute', bottom: 30, left: '30%', width: 6, height: 6, borderRadius: '50%', background: GOLD, pointerEvents: 'none', animation: 'gompPulseDot 5.4s ease-in-out infinite 0.6s' }} />
              </>
            )}
            <Reveal revealKey="cta-text">
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: isMobile ? 38 : 64, fontWeight: 600, letterSpacing: isMobile ? -1 : -2, color: INK, margin: '0 0 20px', lineHeight: 0.95 }}>
                {t.yourbuild_line1}
                <br />
                <span style={{ fontStyle: 'italic', color: MAROON }}>{t.yourbuild_line2}</span>
              </h2>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: MUTED, margin: '0 0 40px', lineHeight: 1.75, maxWidth: 400, fontWeight: 300 }}>
                {t.builder_desc}
              </p>
              <TransitionLink
                href="/build"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  fontWeight: 500,
                  color: PANEL,
                  background: MAROON,
                  padding: '14px 30px',
                  borderRadius: 2,
                  textDecoration: 'none',
                }}
              >
                {t.open_builder}
              </TransitionLink>
            </Reveal>

            <Reveal
              revealKey="cta-card"
              delay={120}
              style={{ border: '0.5px solid rgba(28,28,26,0.14)', borderRadius: 2, padding: isMobile ? 28 : 48, background: PANEL, position: 'relative' }}
            >
              {!isMobile && <CornerTicks color={MAROON} size={20} inset={-9} />}
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 11,
                  fontWeight: 500,
                  color: MUTED,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  marginBottom: 20,
                }}
              >
                {t.build_from}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: isMobile ? 40 : 56, fontWeight: 500, color: INK, letterSpacing: -2, lineHeight: 1, marginBottom: 8 }}>
                {fmt(1039)}
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: MUTED, marginBottom: 32, fontWeight: 300 }}>{t.entry_scales}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: MUTED }}>— {t.bullet1}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: MUTED }}>— {t.bullet2}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: MUTED }}>— {t.bullet3}</div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---- Footer ---- */}
        <footer style={{ background: INK, padding: isMobile ? '48px 24px' : 60, borderTop: '0.5px solid rgba(28,28,26,0.3)' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr 1fr', gap: isMobile ? 32 : 40, marginBottom: isMobile ? 32 : 48 }}>
              <div style={{ position: 'relative' }}>
                {!isMobile && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -20,
                      left: -20,
                      width: 90,
                      height: 90,
                      background: 'radial-gradient(circle, rgba(196,163,90,0.16) 0%, transparent 70%)',
                      pointerEvents: 'none',
                      animation: 'gompGlowPulse 5s ease-in-out infinite',
                    }}
                  />
                )}
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 600, fontStyle: 'italic', color: GOLD, letterSpacing: 1.5, marginBottom: 16, position: 'relative' }}>
                  GOMP
                </div>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: MUTED, lineHeight: 1.75, maxWidth: 260, margin: 0, fontWeight: 300 }}>
                  {t.footer_blurb}
                </p>
              </div>
              <div>
                <div
                  style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: MUTED, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 }}
                >
                  {t.footer_products}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <FooterLink href="/shop" internal>{t.footer_prebuilt}</FooterLink>
                  <FooterLink href="/build" internal>{t.footer_custom}</FooterLink>
                  <FooterLink href="#">{t.footer_accessories}</FooterLink>
                </div>
              </div>
              <div>
                <div
                  style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: MUTED, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 }}
                >
                  {t.footer_company}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <FooterLink href="/about" internal>{t.footer_aboutus}</FooterLink>
                  <FooterLink href="#">Blog</FooterLink>
                  <FooterLink href="#">{t.footer_careers}</FooterLink>
                </div>
              </div>
              <div>
                <div
                  style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: MUTED, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 }}
                >
                  {t.footer_support}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <FooterLink href="#">FAQ</FooterLink>
                  <FooterLink href="#">{t.footer_warranty}</FooterLink>
                  <FooterLink href="#">{t.footer_contact}</FooterLink>
                </div>
              </div>
            </div>

            <div
              style={{
                borderTop: '0.5px solid rgba(245,240,230,0.1)',
                paddingTop: 24,
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? 12 : 0,
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'center',
              }}
            >
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'rgba(245,240,230,0.3)', fontWeight: 300 }}>
                © 2026 GOMP. {t.footer_rights}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  color: 'rgba(245,240,230,0.3)',
                  fontWeight: 300,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                {t.footer_madein}
                <TransitionLink href="/admin" style={{ color: 'rgba(245,240,230,0.18)', textDecoration: 'none' }}>
                  ·
                </TransitionLink>
              </span>
            </div>

            <div style={{ borderTop: '0.5px solid rgba(245,240,230,0.08)', marginTop: 20, paddingTop: 20 }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'rgba(245,240,230,0.28)', fontWeight: 300, lineHeight: 1.6 }}>
                {t.footer_disclaimer}
              </span>
            </div>
          </div>
        </footer>

        {/* ---- Swipe overlay ---- */}
        {swiping && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'radial-gradient(circle at 50% 45%, #8E2A3A 0%, #6E1423 55%, #4A0E1A 100%)',
              pointerEvents: 'all',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              animation: 'gompSwipeIn 0.55s cubic-bezier(.16,1,.3,1) both',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: 640,
                  height: 640,
                  margin: '-320px 0 0 -320px',
                  border: '0.5px solid rgba(196,163,90,0.22)',
                  borderRadius: '50%',
                  animation: 'gompRotateSlow 8s linear infinite',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: 420,
                  height: 420,
                  margin: '-210px 0 0 -210px',
                  border: '0.5px solid rgba(196,163,90,0.32)',
                  borderRadius: '50%',
                  animation: 'gompRotateSlowRev 6s linear infinite',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: 960,
                  height: 960,
                  margin: '-480px 0 0 -480px',
                  background: 'radial-gradient(circle, rgba(196,163,90,0.16) 0%, transparent 60%)',
                  animation: 'gompGlowPulse 2.2s ease-in-out infinite',
                }}
              />
              <div style={{ position: 'absolute', top: '62%', left: '20%', width: 6, height: 6, borderRadius: '50%', background: GOLD, boxShadow: '0 0 10px 3px rgba(196,163,90,0.55)', animation: 'gompEmberRise 1.6s ease-out infinite' }} />
              <div style={{ position: 'absolute', top: '70%', left: '68%', width: 4, height: 4, borderRadius: '50%', background: '#E8A9B4', boxShadow: '0 0 8px 2px rgba(232,169,180,0.5)', animation: 'gompEmberRise 1.9s 0.2s ease-out infinite' }} />
              <div style={{ position: 'absolute', top: '55%', left: '80%', width: 5, height: 5, borderRadius: '50%', background: GOLD, boxShadow: '0 0 9px 2px rgba(196,163,90,0.5)', animation: 'gompEmberRise 1.4s 0.35s ease-out infinite' }} />
              <div style={{ position: 'absolute', top: '78%', left: '40%', width: 3, height: 3, borderRadius: '50%', background: '#E8A9B4', animation: 'gompEmberRise 2.1s 0.1s ease-out infinite' }} />
              <div style={{ position: 'absolute', top: '32%', left: '14%', width: 4, height: 4, borderRadius: '50%', background: GOLD, boxShadow: '0 0 8px 2px rgba(196,163,90,0.5)', animation: 'gompEmberRise 1.7s 0.5s ease-out infinite' }} />
              <div style={{ position: 'absolute', top: '28%', left: '86%', width: 5, height: 5, borderRadius: '50%', background: '#E8A9B4', animation: 'gompEmberRise 1.5s 0.25s ease-out infinite' }} />
            </div>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 38,
                fontWeight: 600,
                fontStyle: 'italic',
                letterSpacing: 2,
                color: GOLD,
                display: 'flex',
                perspective: 400,
                position: 'relative',
                zIndex: 1,
              }}
            >
              {['G', 'O', 'M', 'P'].map((ch, i) => (
                <span
                  key={ch}
                  style={{
                    display: 'inline-block',
                    animation: `gompLetterSpin 0.42s ${0.05 + i * 0.08}s cubic-bezier(0.34,1.56,0.64,1) both`,
                  }}
                >
                  {ch}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

