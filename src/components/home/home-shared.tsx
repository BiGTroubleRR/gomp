'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useSite } from '@/contexts/SiteContext';
import { pick } from '@/lib/i18n';
import { fetchPrebuilts } from '@/lib/supabase/prebuilts';
import { fetchComponentDb, getCachedComponentDb } from '@/lib/supabase/components';
import { computeBuildTotalGross, computeBuildTier, defaultComponentDb, type Build, type ComponentDb } from '@/lib/component-db-seed';
import { resolvePassmark, type PassmarkDisplay } from '@/lib/build-passmark';
import { TIER_COLORS, type Tier } from '@/lib/passmark';
import { ACCENT, BORDER, GOLD, INK, MUTED, PAGE_BG, PANEL_BG } from '@/lib/design-tokens';

export type L3 = { en: string; sk: string; cz: string };

// The configurator's cheapest possible configuration, net CZK (x1.21 VAT = the "Ceny od 30 550 Kč"
// figure). A hand-maintained number, not derived — kept in one place so the hero and the price tile
// can never disagree.
export const MIN_CONFIG_NET_CZK = 25248;

export const CAT_LABEL: Record<Build['cat'], L3> = {
  flagship: { en: 'Flagship', sk: 'Vlajková loď', cz: 'Vlajková loď' },
  performance: { en: 'Performance', sk: 'Výkonnostná', cz: 'Výkonnostní' },
  midrange: { en: 'Mid-range', sk: 'Stredná trieda', cz: 'Střední třída' },
  entry: { en: 'Entry', sk: 'Základná', cz: 'Základní' },
};

// One live prebuilt with everything the homepage sections need already resolved.
export type HomeBuild = {
  id: string;
  name: string;
  cat: Build['cat'];
  catLabel: L3;
  tier: Tier | undefined;
  tagline: string;
  rating: number;
  priceCzk: number; // VAT-inclusive, override-aware
  gpu: string;
  cpu: string;
  ram: string;
  storage: string;
  cooler: string;
  caseName: string;
  gpuPm: PassmarkDisplay | null;
  cpuPm: PassmarkDisplay | null;
  href: string; // opens the configurator pre-loaded with this build
};

// Live prebuilts + component catalog, resolved into view-models. One-time fetches backed by the
// modules' own short-TTL caches — no Realtime subscription on this public page (Admin keeps its own).
export function useHomeBuilds(): { builds: HomeBuild[]; avgRating: number } {
  const { lang, vatRatePct } = useSite();
  const [prebuilts, setPrebuilts] = useState<Build[]>([]);
  const [compDb, setCompDb] = useState<ComponentDb>(() => getCachedComponentDb() ?? defaultComponentDb());

  useEffect(() => {
    let cancelled = false;
    fetchPrebuilts().then((d) => !cancelled && setPrebuilts(d));
    fetchComponentDb().then((d) => !cancelled && setCompDb(d));
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const builds: HomeBuild[] = prebuilts
      .filter((p) => p.isLive)
      .map((b) => ({
        id: b.id,
        name: b.name,
        cat: b.cat,
        catLabel: CAT_LABEL[b.cat],
        tier: computeBuildTier(b, compDb),
        tagline: pick(lang, { en: b.taglineEn, sk: b.taglineSk, cz: b.taglineCz }),
        rating: b.rating,
        priceCzk: computeBuildTotalGross(b, compDb, vatRatePct),
        gpu: b.gpu,
        cpu: b.cpu,
        ram: b.ram,
        storage: b.storage,
        cooler: b.cooler,
        caseName: b.case,
        gpuPm: resolvePassmark(b.gpu, true, compDb),
        cpuPm: resolvePassmark(b.cpu, false, compDb),
        href: `/build?prebuilt=${b.id}`,
      }));
    const avgRating = builds.length ? builds.reduce((s, b) => s + b.rating, 0) / builds.length : 4.9;
    return { builds, avgRating };
  }, [prebuilts, compDb, lang, vatRatePct]);
}

export const PAD_X = (isMobile: boolean) => (isMobile ? 20 : 60);

// ---- Section heading: eyebrow + title with a hairline under it, optional right-hand slot ----
export function SectionHead({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, paddingBottom: 12, borderBottom: `1px solid ${BORDER}`, marginBottom: 20 }}>
      <div>
        {eyebrow && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: 2, textTransform: 'uppercase', color: MUTED, marginBottom: 6 }}>{eyebrow}</div>
        )}
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 600, letterSpacing: -0.3, color: INK, margin: 0, lineHeight: 1.1 }}>{title}</h2>
      </div>
      {right}
    </div>
  );
}

// ---- Tier badge as a circle (S / A / B) ----
export function TierCircle({ tier, size = 30 }: { tier: Tier | undefined; size?: number }) {
  const c = TIER_COLORS[tier ?? 'B'];
  return (
    <span
      title={tier ? `Tier ${tier}` : undefined}
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: '50%',
        background: c.bg,
        border: `1.5px solid ${c.border}`,
        color: c.text,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-serif)',
        fontSize: size * 0.46,
        fontWeight: 600,
        lineHeight: 1,
      }}
    >
      {tier ?? '—'}
    </span>
  );
}

// ---- ★★★★★ 4.9 ----
export function StarRow({ rating, size = 11, showNumber = true }: { rating: number; size?: number; showNumber?: boolean }) {
  const filled = Math.round(rating);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ letterSpacing: 2, fontSize: size, color: GOLD }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} style={{ opacity: i < filled ? 1 : 0.28 }}>
            ★
          </span>
        ))}
      </span>
      {showNumber && <span style={{ fontFamily: 'var(--font-mono)', fontSize: size, color: MUTED }}>{rating.toFixed(1)}</span>}
    </span>
  );
}

// ---- Stylized dark PC case with green-lit fans and a GOMP plate (the concept's build thumbnail) ----
export function BuildCaseArt({ width = 120, accent = ACCENT, glow = true }: { width?: number; accent?: string; glow?: boolean }) {
  const h = (width * 176) / 120;
  return (
    <svg
      viewBox="0 0 120 176"
      width={width}
      height={h}
      role="img"
      aria-label="PC case"
      style={{ display: 'block', flexShrink: 0, filter: glow ? `drop-shadow(0 0 ${Math.max(4, width / 14)}px rgba(63,174,116,0.28))` : undefined }}
    >
      <rect x="14" y="4" width="92" height="160" rx="6" fill="#0E1512" stroke="#2A3A33" strokeWidth="1.5" />
      <rect x="20" y="10" width="80" height="148" rx="4" fill="#090D0B" stroke="#1D2A24" />
      {/* motherboard + cooler */}
      <rect x="26" y="17" width="44" height="66" rx="2" fill="#111B16" stroke="#22322B" />
      <circle cx="42" cy="36" r="10" fill="none" stroke={accent} strokeOpacity="0.85" strokeWidth="1.6" />
      <circle cx="42" cy="36" r="3.5" fill={accent} fillOpacity="0.55" />
      <rect x="56" y="24" width="9" height="26" rx="1.5" fill="#1A2822" stroke="#2A3A33" />
      {/* graphics card */}
      <rect x="26" y="90" width="48" height="12" rx="2" fill="#15211B" stroke={accent} strokeOpacity="0.55" />
      <rect x="30" y="93" width="14" height="6" rx="1" fill={accent} fillOpacity="0.35" />
      {/* GOMP plate */}
      <rect x="26" y="114" width="48" height="16" rx="2" fill="#0D1511" stroke={GOLD} strokeOpacity="0.7" />
      <text x="50" y="125.4" textAnchor="middle" fontSize="7" letterSpacing="1.6" fill={GOLD} fontFamily="var(--font-serif), serif">
        GOMP
      </text>
      {/* three side fans */}
      {[36, 76, 116].map((cy) => (
        <g key={cy}>
          <circle cx="88" cy={cy} r="14" fill="#0B120F" stroke={accent} strokeWidth="2.4" strokeOpacity="0.95" />
          <circle cx="88" cy={cy} r="8" fill="none" stroke={accent} strokeOpacity="0.4" />
          <circle cx="88" cy={cy} r="3" fill={accent} fillOpacity="0.7" />
        </g>
      ))}
      <rect x="24" y="164" width="14" height="5" rx="1.5" fill="#1A231F" />
      <rect x="82" y="164" width="14" height="5" rx="1.5" fill="#1A231F" />
    </svg>
  );
}

// Card shell shared by the dark panels.
export const panelStyle = { background: PANEL_BG, border: `1px solid ${BORDER}` } as const;
export const pageBg = PAGE_BG;
