'use client';

import Image from 'next/image';
import { ReactNode, useEffect, useState } from 'react';
import { useSite } from '@/contexts/SiteContext';
import { pick } from '@/lib/i18n';
import TransitionLink from '@/components/TransitionLink';
import { ACCENT_GRADIENT, GOLD, GOLD_LIGHT, INK, MUTED, ON_ACCENT, PAGE_BG, BORDER_STRONG } from '@/lib/design-tokens';
import { MIN_CONFIG_NET_CZK, PAD_X, TierCircle, type HomeBuild, type L3 } from './home-shared';

const SLIDE_MS = 6000;

const primaryBtn: React.CSSProperties = {
  background: ACCENT_GRADIENT,
  color: ON_ACCENT,
  border: 'none',
  cursor: 'pointer',
  padding: '13px 24px',
  borderRadius: 2,
  fontFamily: 'var(--font-sans)',
  fontSize: 12.5,
  fontWeight: 700,
  letterSpacing: 0.8,
  textTransform: 'uppercase',
  display: 'inline-block',
};
const ghostBtn: React.CSSProperties = {
  ...primaryBtn,
  background: 'rgba(13,13,12,0.35)',
  border: '1px solid rgba(235,230,218,0.55)',
  color: INK,
};

const T: Record<string, L3> = {
  eyebrow: { en: 'CUSTOM GAMING PCs', sk: 'HERNÉ PC NA MIERU', cz: 'HERNÍ PC NA MÍRU' },
  line1: { en: 'Build your', sk: 'Postav si', cz: 'Postav si' },
  line2pre: { en: '', sk: 'svoju ', cz: 'svou ' },
  em: { en: 'Legend.', sk: 'Legendu.', cz: 'Legendu.' },
  desc: { en: 'Dreamed up, hand-built, tested — yours.', sk: 'Vysnený, ručne stavaný, testovaný, tvoj.', cz: 'Vysněný, ručně stavěný, testovaný, tvůj.' },
  from: { en: 'From', sk: 'Ceny od', cz: 'Ceny od' },
  cfg: { en: '3D CONFIG', sk: 'GOMP 3D CONFIG', cz: 'GOMP 3D CONFIG' },
  prebuilt: { en: 'Prebuilt builds', sk: 'Prebuilt zostavy', cz: 'Prebuilt sestavy' },
  s2eyebrow: { en: 'GOMP 3D CONFIG', sk: 'GOMP 3D CONFIG', cz: 'GOMP 3D CONFIG' },
  s2a: { en: 'Your build.', sk: 'Vaša zostava.', cz: 'Vaše sestava.' },
  s2b: { en: 'Your rules.', sk: 'Vaše pravidlá.', cz: 'Vaše pravidla.' },
  s2desc: {
    en: 'Build your legend yourself in our 3D configurator and watch every component appear in real time.',
    sk: 'Poskladajte si svoju legendu sami v našom 3D konfigurátore a sledujte, ako sa každý komponent objaví v reálnom čase.',
    cz: 'Poskládejte si svou legendu sami v našem 3D konfigurátoru a sledujte, jak se každá součástka objeví v reálném čase.',
  },
  s2cta: { en: 'Open the 3D configurator', sk: 'Otvoriť 3D konfigurátor', cz: 'Otevřít 3D konfigurátor' },
  s3eyebrow: { en: 'UNDERVOLTED BY DEFAULT', sk: 'UNDERVOLT AKO ŠTANDARD', cz: 'UNDERVOLT JAKO STANDARD' },
  s3a: { en: 'Lower temps', sk: 'Nižšie teploty', cz: 'Nižší teploty' },
  s3b: { en: 'and power draw.', sk: 'a spotreba.', cz: 'a spotřeba.' },
  s3desc: {
    en: 'Every CPU and GPU is undervolted wherever the platform allows it — quieter fans, zero performance lost.',
    sk: 'Každý CPU a GPU podvoltujeme všade, kde to platforma umožňuje — tichšie ventilátory, bez straty výkonu.',
    cz: 'Každý CPU a GPU podvoltujeme všude, kde to platforma umožňuje — tišší ventilátory, bez ztráty výkonu.',
  },
  s3cta: { en: 'Why undervolt?', sk: 'Prečo undervolt?', cz: 'Proč undervolt?' },
  tileBudget: { en: 'BUDGET BUILDS', sk: 'BUDGET BUILDS', cz: 'BUDGET BUILDS' },
  tileCustomer: { en: 'CUSTOMER GOMPs', sk: 'ZÁKAZNÍCKE GOMPY', cz: 'ZÁKAZNICKÉ GOMPY' },
  tileCustomerTitle: { en: 'Custom builds shipped', sk: 'Expedovaných zostáv na mieru', cz: 'Expedovaných sestav na míru' },
  tileCustomerCta: { en: 'See what others have built →', sk: 'Pozri, čo si postavili iní →', cz: 'Podívej se, co si postavili jiní →' },
};

type Slide = {
  img: string;
  eyebrow: string;
  title: ReactNode;
  desc: string;
  extra?: ReactNode;
  ctas: ReactNode;
};

// Dark gradient scrim over a photo, anchored to the text side.
function Scrim({ dir = 'left' }: { dir?: 'left' | 'bottom' }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        background:
          dir === 'left'
            ? 'linear-gradient(90deg, rgba(13,13,12,0.9) 0%, rgba(13,13,12,0.6) 42%, rgba(13,13,12,0.08) 100%)'
            : 'linear-gradient(180deg, rgba(13,13,12,0.12) 0%, rgba(13,13,12,0.88) 100%)',
      }}
    />
  );
}

function Tile({
  href,
  img,
  eyebrow,
  eyebrowColor,
  title,
  sub,
  badge,
  big,
}: {
  href: string;
  img: string;
  eyebrow: ReactNode;
  eyebrowColor?: string;
  title: ReactNode;
  sub?: ReactNode;
  badge?: ReactNode;
  big?: ReactNode;
}) {
  return (
    <TransitionLink
      href={href}
      style={{ position: 'relative', display: 'block', overflow: 'hidden', minHeight: 120, border: `1px solid ${BORDER_STRONG}`, background: PAGE_BG, height: '100%' }}
    >
      <Image src={img} alt="" fill sizes="(max-width: 768px) 100vw, 420px" style={{ objectFit: 'cover' }} />
      <Scrim dir="bottom" />
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: 1.6, textTransform: 'uppercase', color: eyebrowColor ?? GOLD_LIGHT, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
            {eyebrow}
            {badge}
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, color: INK, lineHeight: 1.2 }}>{title}</div>
          {sub && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: MUTED, marginTop: 5 }}>{sub}</div>}
        </div>
        {big}
      </div>
    </TransitionLink>
  );
}

export default function HomeHero({ builds, isMobile, onStartBuilding }: { builds: HomeBuild[]; isMobile: boolean; onStartBuilding: () => void }) {
  const { lang, fmt, vatRatePct } = useSite();
  const t = (k: string) => pick(lang, T[k]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const slides: Slide[] = [
    {
      img: '/home/hero.jpg',
      eyebrow: t('eyebrow'),
      title: (
        <>
          {t('line1')}
          <br />
          {t('line2pre')}
          <span style={{ color: GOLD }}>{t('em')}</span>
        </>
      ),
      desc: t('desc'),
      extra: (
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: MUTED, marginTop: 14 }}>
          {t('from')} <strong style={{ color: GOLD_LIGHT, fontSize: 18, fontWeight: 700 }}>{fmt(Math.round(MIN_CONFIG_NET_CZK * (1 + vatRatePct / 100)))}</strong>
        </div>
      ),
      ctas: (
        <>
          <button onClick={onStartBuilding} style={primaryBtn}>
            {t('cfg')}
          </button>
          <TransitionLink href="/shop" style={ghostBtn}>
            {t('prebuilt')}
          </TransitionLink>
        </>
      ),
    },
    {
      img: '/home/banner-config.jpg',
      eyebrow: t('s2eyebrow'),
      title: (
        <>
          {t('s2a')}
          <br />
          <span style={{ color: GOLD }}>{t('s2b')}</span>
        </>
      ),
      desc: t('s2desc'),
      ctas: (
        <button onClick={onStartBuilding} style={primaryBtn}>
          {t('s2cta')} →
        </button>
      ),
    },
    {
      img: '/home/tile-budget.jpg',
      eyebrow: t('s3eyebrow'),
      title: (
        <>
          {t('s3a')}
          <br />
          <span style={{ color: GOLD }}>{t('s3b')}</span>
        </>
      ),
      desc: t('s3desc'),
      ctas: (
        <TransitionLink href="/undervolting" style={primaryBtn}>
          {t('s3cta')} →
        </TransitionLink>
      ),
    },
  ];

  useEffect(() => {
    if (paused) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setTimeout(() => setIdx((i) => (i + 1) % slides.length), SLIDE_MS);
    return () => clearTimeout(id);
    // slides.length is a constant 3; idx restarts the timer on every change (manual or automatic)
  }, [idx, paused, slides.length]);

  // Side tiles: best-rated performance build, cheapest build, customer showcase.
  const perf =
    [...builds].filter((b) => b.cat === 'performance').sort((a, b) => b.rating - a.rating)[0] ??
    [...builds].sort((a, b) => b.rating - a.rating)[1] ??
    builds[0];
  const cheapest = [...builds].sort((a, b) => a.priceCzk - b.priceCzk)[0];

  const padX = PAD_X(isMobile);

  return (
    <section style={{ padding: `22px ${padX}px 0` }}>
      <style>{`@keyframes gompHeroProgress { from { width: 0; } to { width: 100%; } }`}</style>
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 2.15fr) minmax(0, 1fr)',
          gap: 10,
          height: isMobile ? undefined : 410,
        }}
      >
        {/* ---- slider ---- */}
        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          style={{ position: 'relative', overflow: 'hidden', height: isMobile ? 400 : '100%', border: `1px solid ${BORDER_STRONG}`, background: PAGE_BG }}
        >
          {slides.map((s, i) => (
            <div
              key={s.eyebrow}
              aria-hidden={i !== idx}
              style={{ position: 'absolute', inset: 0, opacity: i === idx ? 1 : 0, transition: 'opacity 0.7s ease', pointerEvents: i === idx ? 'auto' : 'none' }}
            >
              <Image src={s.img} alt="" fill priority={i === 0} sizes="(max-width: 768px) 100vw, 880px" style={{ objectFit: 'cover' }} />
              <Scrim />
              <div style={{ position: 'absolute', left: isMobile ? 22 : 42, right: isMobile ? 22 : '38%', top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 2.2, color: GOLD_LIGHT, marginBottom: 14 }}>{s.eyebrow}</div>
                <h1
                  role={i === 0 ? undefined : 'heading'}
                  aria-level={i === 0 ? undefined : 2}
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: isMobile ? 36 : 54,
                    fontWeight: 600,
                    letterSpacing: -1,
                    lineHeight: 1,
                    color: INK,
                    margin: 0,
                  }}
                >
                  {s.title}
                </h1>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: isMobile ? 13.5 : 14.5, color: MUTED, fontWeight: 300, margin: '14px 0 0', maxWidth: 420, lineHeight: 1.6 }}>{s.desc}</p>
                {s.extra}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 24 }}>{s.ctas}</div>
              </div>
            </div>
          ))}
          <div style={{ position: 'absolute', left: isMobile ? 22 : 42, bottom: 16, display: 'flex', gap: 8, zIndex: 3 }}>
            {slides.map((s, i) => (
              <button
                key={s.eyebrow}
                aria-label={`${i + 1}`}
                onClick={() => setIdx(i)}
                style={{ position: 'relative', width: 40, height: 14, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
              >
                <span style={{ position: 'relative', display: 'block', width: '100%', height: 3, background: 'rgba(235,230,218,0.28)', overflow: 'hidden' }}>
                  {i === idx && (
                    <span
                      key={`${idx}-${paused}`}
                      style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: GOLD, animation: `gompHeroProgress ${SLIDE_MS}ms linear forwards`, animationPlayState: paused ? 'paused' : 'running' }}
                    />
                  )}
                  {i < idx && <span style={{ position: 'absolute', inset: 0, background: GOLD, opacity: 0.55 }} />}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ---- side tiles ---- */}
        <div style={{ display: 'grid', gridTemplateRows: isMobile ? 'repeat(3, 150px)' : '1.1fr 1.1fr 0.9fr', gap: 10, minHeight: 0 }}>
          {perf ? (
            <Tile
              href={perf.href}
              img="/home/tile-performance.jpg"
              eyebrow={`${pick(lang, perf.catLabel)} · ${perf.tier ?? ''}`}
              badge={perf.tier ? <TierCircle tier={perf.tier} size={16} /> : undefined}
              title={perf.tagline}
              sub={`${perf.name} · ${fmt(perf.priceCzk)}`}
            />
          ) : (
            <Tile href="/shop" img="/home/tile-performance.jpg" eyebrow={pick(lang, CAT_FALLBACK)} title={pick(lang, CAT_FALLBACK)} />
          )}
          {cheapest ? (
            <Tile href={cheapest.href} img="/home/tile-budget.jpg" eyebrow={t('tileBudget')} title={cheapest.tagline} sub={`${cheapest.name} · ${fmt(cheapest.priceCzk)}`} />
          ) : (
            <Tile href="/gbb" img="/home/tile-budget.jpg" eyebrow={t('tileBudget')} title="Budget Builds" />
          )}
          <Tile
            href="/customer-builds"
            img="/home/tile-customer.jpg"
            eyebrow={t('tileCustomer')}
            title={t('tileCustomerTitle')}
            sub={t('tileCustomerCta')}
            big={<span style={{ fontFamily: 'var(--font-serif)', fontSize: 40, fontWeight: 600, color: GOLD_LIGHT, lineHeight: 1 }}>20+</span>}
          />
        </div>
      </div>
    </section>
  );
}

const CAT_FALLBACK: L3 = { en: 'Prebuilt builds', sk: 'Hotové zostavy', cz: 'Hotové sestavy' };
