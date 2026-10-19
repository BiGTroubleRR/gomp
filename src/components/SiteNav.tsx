'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CSSProperties, FormEvent, ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import TransitionLink from '@/components/TransitionLink';
import { useSite } from '@/contexts/SiteContext';
import { useIsMobile, useMediaQuery } from '@/lib/use-media-query';
import DeviceViewToggle from '@/components/DeviceViewToggle';
import { useCartSummary } from '@/lib/use-cart-summary';
import { pick } from '@/lib/i18n';
import {
  INK,
  MUTED,
  ACCENT,
  ACCENT_GRADIENT,
  ACCENT_DEEP,
  ON_ACCENT,
  GOLD,
  GOLD_LIGHT,
  PAGE_BG,
  PANEL_BG,
  SURFACE_ALT,
  BORDER,
  BORDER_STRONG,
} from '@/lib/design-tokens';

type L3 = { en: string; sk: string; cz: string };

// Main nav links shown in the green bar (and the mobile menu). Budget Builds is gold-highlighted.
const LINKS: ({ href: string } & L3)[] = [
  { href: '/', en: 'Home', sk: 'Domov', cz: 'Domů' },
  { href: '/shop', en: 'Shop', sk: 'Obchod', cz: 'Obchod' },
  { href: '/build', en: 'Build', sk: 'Zostaviť', cz: 'Sestavit' },
  { href: '/customer-builds', en: 'Customer GOMPs', sk: 'Zákaznícke GOMPy', cz: 'Zákaznické GOMPy' },
  { href: '/undervolting', en: 'Why undervolt?', sk: 'Prečo undervolt?', cz: 'Proč undervolt?' },
  { href: '/about', en: 'About', sk: 'O nás', cz: 'O nás' },
  { href: '/gbb', en: 'Budget Builds', sk: 'Budget Builds', cz: 'Budget Builds' },
];

// "KATEGÓRIE" menu: the four prebuilt classes (driven by /shop's ?cat= param) plus the other
// destinations a shopper might expect to find under a catalogue menu.
const CATEGORY_LINKS: ({ href: string } & L3)[] = [
  { href: '/shop?cat=flagship', en: 'Flagship', sk: 'Vlajková loď', cz: 'Vlajková loď' },
  { href: '/shop?cat=performance', en: 'Performance', sk: 'Výkonnostná', cz: 'Výkonnostní' },
  { href: '/shop?cat=midrange', en: 'Mid-range', sk: 'Stredná trieda', cz: 'Střední třída' },
  { href: '/shop?cat=entry', en: 'Entry', sk: 'Základná', cz: 'Základní' },
];
const MORE_LINKS: ({ href: string } & L3)[] = [
  { href: '/build', en: 'Custom configuration (3D)', sk: 'Vlastná konfigurácia (3D)', cz: 'Vlastní konfigurace (3D)' },
  { href: '/customer-builds', en: 'Customer GOMPs', sk: 'Zákaznícke GOMPy', cz: 'Zákaznické GOMPy' },
  { href: '/gbb', en: 'Budget Builds', sk: 'Budget Builds', cz: 'Budget Builds' },
  { href: '/accessories', en: 'Accessories', sk: 'Príslušenstvo', cz: 'Příslušenství' },
  { href: '/blog', en: 'Blog', sk: 'Blog', cz: 'Blog' },
];

const TIER_OPTIONS: { value: string; label: L3 }[] = [
  { value: '', label: { en: 'All classes', sk: 'Všetky triedy', cz: 'Všechny třídy' } },
  { value: 'S', label: { en: 'Class S', sk: 'Trieda S', cz: 'Třída S' } },
  { value: 'A', label: { en: 'Class A', sk: 'Trieda A', cz: 'Třída A' } },
  { value: 'B', label: { en: 'Class B', sk: 'Trieda B', cz: 'Třída B' } },
];

const ACCOUNT_LABEL: L3 = { en: 'Account', sk: 'Účet', cz: 'Účet' };

// Viewport width at/below which the compact (/build) bar collapses to the mobile bar instead of overflowing.
// (Measured: the bar needs ~1325px of viewport — logo + categories + 7 links + language/account/cart cluster.)
const COMPACT_NAV_MIN_PX = 1340;

// Renders every translation in ONE grid cell and shows only the active one (the others stay in the
// layout as `visibility: hidden`), so the slot is always as wide as its longest translation. Switching
// SK / CZ / EN then changes the text only — nothing to its right ever moves.
function StableLabel({ text, align = 'start', style }: { text: L3; align?: 'start' | 'center' | 'end'; style?: CSSProperties }) {
  const { lang } = useSite();
  return (
    <span style={{ display: 'inline-grid', justifyItems: align, ...style }}>
      {(['sk', 'cz', 'en'] as const).map((l) => (
        <span key={l} aria-hidden={l !== lang} style={{ gridArea: '1 / 1', whiteSpace: 'nowrap', visibility: l === lang ? 'visible' : 'hidden' }}>
          {text[l]}
        </span>
      ))}
    </span>
  );
}

function itemsLabel(n: number, lang: 'en' | 'sk' | 'cz'): string {
  if (lang === 'en') return n === 1 ? 'item' : 'items';
  if (n === 1) return 'položka';
  if (n >= 2 && n <= 4) return 'položky';
  return lang === 'cz' ? 'položek' : 'položiek';
}

// Small hand-drawn zigzag bolts, reused (mirrored, restacked at different heights) — a one-off
// attention-to-detail flourish for the undervolt tab specifically (undervolting is literally about
// voltage), only mounted while that one tab is hovered. Width stays inside the wrapper's own padding
// so none of them get clipped by its overflow:hidden — only height grows for a "longer" bolt.
const BOLT_PATH = 'M8 0 L2 9 L6 9 L1 18 L10 8 L6 8 Z';
const BOLTS = [
  { cls: 'gomp-bolt-a', side: 'left', top: '28%', fill: '#FFC72C' },
  { cls: 'gomp-bolt-b', side: 'right', top: '28%', fill: ON_ACCENT },
  { cls: 'gomp-bolt-c', side: 'left', top: '72%', fill: ON_ACCENT },
  { cls: 'gomp-bolt-d', side: 'right', top: '72%', fill: '#FFC72C' },
] as const;
function UndervoltBolts() {
  return (
    <>
      {BOLTS.map((b) => (
        <svg
          key={b.cls}
          className={`gomp-bolt ${b.cls}`}
          viewBox="0 0 10 18"
          style={{
            position: 'absolute',
            [b.side]: 0,
            top: b.top,
            width: 7,
            height: 15,
            fill: b.fill,
            transform: b.side === 'right' ? 'scaleX(-1)' : undefined,
          }}
        >
          <path d={BOLT_PATH} />
        </svg>
      ))}
    </>
  );
}

// ---- Icons (inline, stroke follows currentColor) ----
function IconSearch({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}
function IconCart({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h2.2l1.6 10.2a1.6 1.6 0 0 0 1.6 1.3h8.1a1.6 1.6 0 0 0 1.6-1.2L19.7 8H6.1" />
      <circle cx="9.5" cy="19.5" r="1.4" />
      <circle cx="16.5" cy="19.5" r="1.4" />
    </svg>
  );
}
function IconHeadset({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="2.5" y="13.5" width="4" height="6" rx="1.5" />
      <rect x="17.5" y="13.5" width="4" height="6" rx="1.5" />
      <path d="M19.5 19.5c0 1.4-1.6 2-4 2h-2" />
    </svg>
  );
}
function IconMenu({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

// ---- Language + currency chips ----
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? INK : 'transparent',
        color: active ? PAGE_BG : MUTED,
        border: 'none',
        cursor: 'pointer',
        padding: '3px 9px',
        fontFamily: 'var(--font-mono)',
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: 0.6,
        lineHeight: 1.4,
      }}
    >
      {children}
    </button>
  );
}

function LangCurrencyChips() {
  const { lang, currency, setLang, setCurrency } = useSite();
  const group: React.CSSProperties = { display: 'flex', border: `1px solid ${BORDER_STRONG}`, borderRadius: 2, overflow: 'hidden' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={group}>
        {(['sk', 'cz', 'en'] as const).map((l) => (
          <Chip key={l} active={lang === l} onClick={() => setLang(l)}>
            {l.toUpperCase()}
          </Chip>
        ))}
      </div>
      <div style={group}>
        <Chip active={currency === 'czk'} onClick={() => setCurrency('czk')}>
          Kč
        </Chip>
        <Chip active={currency === 'eur'} onClick={() => setCurrency('eur')}>
          €
        </Chip>
      </div>
    </div>
  );
}

// Larger, text-style language/currency picker for the full-screen mobile menu.
function LangCurrencyRow() {
  const { lang, currency, setLang, setCurrency } = useSite();
  const btn = (active: boolean): React.CSSProperties => ({
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    fontFamily: 'var(--font-sans)',
    fontSize: 16,
    color: active ? ACCENT : MUTED,
    fontWeight: active ? 600 : 400,
  });
  const sep: React.CSSProperties = { color: BORDER_STRONG, fontSize: 16 };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {(['sk', 'cz', 'en'] as const).map((l, i) => (
        <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {i > 0 && <span style={sep}>/</span>}
          <button onClick={() => setLang(l)} style={btn(lang === l)}>
            {l.toUpperCase()}
          </button>
        </span>
      ))}
      <span style={sep}>|</span>
      <button onClick={() => setCurrency('eur')} style={btn(currency === 'eur')}>
        €
      </button>
      <span style={sep}>/</span>
      <button onClick={() => setCurrency('czk')} style={btn(currency === 'czk')}>
        Kč
      </button>
    </div>
  );
}

// Clerk-backed sign-in/sign-up/account controls — separate from the "Account" link (which still points
// at the Supabase-backed /account page) until the two auth paths are unified.
function ClerkAuthControls({ stacked }: { stacked?: boolean }) {
  const { lang } = useSite();
  const fontSize = stacked ? 16 : 11;
  const textBtn: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    fontFamily: stacked ? 'var(--font-sans)' : 'var(--font-mono)',
    fontSize,
    letterSpacing: stacked ? 0 : 0.8,
    textTransform: stacked ? 'none' : 'uppercase',
    color: MUTED,
  };
  return (
    <>
      <Show when="signed-out">
        <div style={{ display: 'flex', alignItems: 'center', gap: stacked ? 18 : 14 }}>
          <SignInButton mode="modal">
            <button style={textBtn}>{pick(lang, { en: 'Sign in', sk: 'Prihlásiť sa', cz: 'Přihlásit se' })}</button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button style={stacked ? { ...textBtn, background: ACCENT_GRADIENT, color: ON_ACCENT, padding: '10px 18px', borderRadius: 2, fontWeight: 600 } : { ...textBtn, color: ACCENT }}>
              {pick(lang, { en: 'Register', sk: 'Registrovať', cz: 'Registrovat' })}
            </button>
          </SignUpButton>
        </div>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </>
  );
}

// The gold diamond + wordmark, a plain link home.
function Logo({ onNavigate, size = 24 }: { onNavigate?: () => void; size?: number }) {
  return (
    <TransitionLink
      href="/"
      onClick={onNavigate}
      style={{
        fontFamily: 'var(--font-serif)',
        fontWeight: 600,
        letterSpacing: 1.5,
        fontSize: size,
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: GOLD,
        background: 'transparent',
      }}
    >
      <span style={{ fontSize: size * 0.6 }}>◆</span>
      GOMP
    </TransitionLink>
  );
}

// Header search: free text + a class (tier) filter, routed to /shop's ?q= / ?tier= params.
function SearchForm({ stacked, onDone }: { stacked?: boolean; onDone?: () => void }) {
  const { lang } = useSite();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState('');
  const [tier, setTier] = useState('');

  // Mirror the URL back into the box when already on /shop (read client-side — useSearchParams in a
  // header shared by statically rendered pages would force a Suspense boundary on every one).
  useEffect(() => {
    if (pathname !== '/shop') return;
    const p = new URLSearchParams(window.location.search);
    setQ(p.get('q') || '');
    setTier(p.get('tier') || '');
  }, [pathname]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (tier) p.set('tier', tier);
    const qs = p.toString();
    router.push(qs ? `/shop?${qs}` : '/shop');
    onDone?.();
  }

  const placeholder = pick(lang, {
    en: 'Search builds… (e.g. RTX 5070)',
    sk: 'Hľadám zostavu… (napr. RTX 5070)',
    cz: 'Hledám sestavu… (např. RTX 5070)',
  });

  return (
    <form
      role="search"
      onSubmit={submit}
      style={{
        display: 'flex',
        flexDirection: stacked ? 'column' : 'row',
        alignItems: 'stretch',
        flex: stacked ? '0 0 auto' : 1,
        minWidth: 0,
        border: `1px solid ${BORDER_STRONG}`,
        borderRadius: 3,
        background: SURFACE_ALT,
        overflow: 'hidden',
      }}
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        style={{
          flex: stacked ? 'none' : 1,
          minWidth: 0,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: INK,
          fontFamily: 'var(--font-sans)',
          fontSize: stacked ? 16 : 13,
          padding: stacked ? '13px 14px' : '0 16px',
          height: stacked ? undefined : 42,
        }}
      />
      <select
        value={tier}
        onChange={(e) => setTier(e.target.value)}
        aria-label={pick(lang, TIER_OPTIONS[0].label)}
        style={{
          background: 'transparent',
          color: MUTED,
          border: 'none',
          borderLeft: stacked ? 'none' : `1px solid ${BORDER}`,
          borderTop: stacked ? `1px solid ${BORDER}` : 'none',
          outline: 'none',
          fontFamily: 'var(--font-sans)',
          fontSize: stacked ? 15 : 12,
          padding: stacked ? '12px 14px' : '0 12px',
          cursor: 'pointer',
          // Fixed width on desktop: a <select> otherwise resizes to its longest option, which changes
          // with the language and would resize the search box beside it.
          width: stacked ? undefined : 138,
          flexShrink: 0,
        }}
      >
        {TIER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value} style={{ background: PANEL_BG, color: INK }}>
            {pick(lang, o.label)}
          </option>
        ))}
      </select>
      <button
        type="submit"
        aria-label={pick(lang, { en: 'Search', sk: 'Hľadať', cz: 'Hledat' })}
        style={{
          background: ACCENT_GRADIENT,
          color: ON_ACCENT,
          border: 'none',
          cursor: 'pointer',
          width: stacked ? undefined : 50,
          padding: stacked ? '13px 0' : 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <IconSearch />
      </button>
    </form>
  );
}

// Cart summary: reads the saved build (see useCartSummary). Opens /checkout when a build is saved,
// otherwise sends the visitor to the configurator to start one.
function CartWidget({ compact, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const { lang, fmt } = useSite();
  const { count, totalCzk } = useCartSummary();
  const href = count > 0 ? '/checkout' : '/build';
  return (
    <TransitionLink
      href={href}
      onClick={onNavigate}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
        background: 'transparent',
        color: INK,
      }}
    >
      <span
        style={{
          position: 'relative',
          width: compact ? 34 : 42,
          height: compact ? 34 : 42,
          border: `1px solid ${count > 0 ? ACCENT : BORDER_STRONG}`,
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: ACCENT,
        }}
      >
        <IconCart size={compact ? 17 : 20} />
        {count > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -7,
              right: -7,
              minWidth: 17,
              height: 17,
              padding: '0 4px',
              borderRadius: 9,
              background: GOLD,
              color: PAGE_BG,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {count}
          </span>
        )}
      </span>
      {!compact && (
        // minWidth fits a 6-digit total in either currency, so "0 Kč" -> "30 550 Kč" (or switching Kč/€)
        // never resizes the cart and, with it, the search box beside it.
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25, minWidth: 92 }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: MUTED }}>
            {count} {itemsLabel(count, lang)}
          </span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 700, color: INK, whiteSpace: 'nowrap' }}>{fmt(totalCzk)}</span>
        </span>
      )}
    </TransitionLink>
  );
}

// The one shared storefront header (Admin keeps its own admin chrome). Three tiers on desktop:
//   1. utility bar   — tagline, language/currency chips, account
//   2. main row      — logo, support link, search, cart            (both scroll away with the page)
//   3. green nav bar — KATEGÓRIE menu + page links                 (sticky)
// `variant="compact"` renders only the green bar (plus its own language/cart cluster) — used by /build
// so the 3D viewport keeps its height. Below the nav's own 1180px threshold (wider than the pages'
// 768px mobile breakpoint, since the desktop row needs that much room) it collapses to a sticky bar
// with a hamburger + full-screen menu. The header publishes its measured heights as
// --gomp-header-h / --gomp-bar-h on <html> so full-height page layouts never hard-code a pixel offset.
export default function SiteNav({ variant = 'full' }: { variant?: 'full' | 'compact'; cta?: ReactNode }) {
  const { lang } = useSite();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  // The compact bar (/build) carries the logo AND the language / account / cart cluster in one row, so
  // it needs more width than the full header's green bar before it must fall back to the mobile bar.
  const navTooNarrow = useMediaQuery(variant === 'compact' ? `(max-width: ${COMPACT_NAV_MIN_PX}px)` : '(max-width: 1180px)');
  const showMobileNav = isMobile || navTooNarrow;
  // Open state is remembered together with the route it was opened on, so navigating anywhere
  // closes both menus without an effect that resets them.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const [catOpenOn, setCatOpenOn] = useState<string | null>(null);
  const menuOpen = menuOpenOn === pathname;
  const catOpen = catOpenOn === pathname;
  const setMenuOpen = (next: boolean | ((v: boolean) => boolean)) => {
    const value = typeof next === 'function' ? next(menuOpen) : next;
    setMenuOpenOn(value ? pathname : null);
  };
  const setCatOpen = (next: boolean | ((v: boolean) => boolean)) => {
    const value = typeof next === 'function' ? next(catOpen) : next;
    setCatOpenOn(value ? pathname : null);
  };
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);
  const mobileCart = useCartSummary();

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!catOpen) return;
    const onDown = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCatOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [catOpen]);

  // Layout effect (not useEffect): the heights are published before the first paint of a freshly
  // mounted page, so anything sized from --gomp-header-h / --gomp-bar-h never paints with a stale value.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const top = topRef.current?.offsetHeight ?? 0;
      const bar = barRef.current?.offsetHeight ?? 0;
      root.style.setProperty('--gomp-header-h', `${top + bar}px`);
      root.style.setProperty('--gomp-bar-h', `${bar}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    if (topRef.current) ro.observe(topRef.current);
    if (barRef.current) ro.observe(barRef.current);
    return () => ro.disconnect();
  }, [showMobileNav, variant]);

  // ---------------------------------------------------------------- mobile / narrow
  if (showMobileNav) {
    return (
      <>
        <nav
          ref={barRef}
          className="gomp-nav-bar"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            height: 56,
            background: 'rgba(13,13,12,0.96)',
            backdropFilter: 'blur(12px)',
            borderBottom: `1px solid ${BORDER}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
          }}
        >
          <Logo onNavigate={closeMenu} size={21} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <TransitionLink
              href={mobileCart.count > 0 ? '/checkout' : '/build'}
              onClick={closeMenu}
              style={{ position: 'relative', color: ACCENT, display: 'flex', background: 'transparent' }}
            >
              <IconCart size={22} />
              {mobileCart.count > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -7,
                    right: -9,
                    minWidth: 16,
                    height: 16,
                    padding: '0 4px',
                    borderRadius: 8,
                    background: GOLD,
                    color: PAGE_BG,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {mobileCart.count}
                </span>
              )}
            </TransitionLink>
            <DeviceViewToggle />
            <button
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((v) => !v)}
              // minWidth/minHeight (rather than more padding, which would push the icon off-center) bring
              // the tap target up to the ~44px guideline; the icon keeps its visual size.
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 8,
                minWidth: 44,
                minHeight: 44,
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
                alignItems: 'flex-end',
                justifyContent: 'center',
              }}
            >
              <span style={{ display: 'block', width: 22, height: 2, background: INK, transition: 'transform 0.25s ease', transform: menuOpen ? 'translateY(7px) rotate(45deg)' : 'none' }} />
              <span style={{ display: 'block', width: 22, height: 2, background: INK, opacity: menuOpen ? 0 : 1, transition: 'opacity 0.2s ease' }} />
              <span style={{ display: 'block', width: menuOpen ? 22 : 14, height: 2, background: INK, transition: 'transform 0.25s ease, width 0.25s ease', transform: menuOpen ? 'translateY(-7px) rotate(-45deg)' : 'none' }} />
            </button>
          </div>
        </nav>
        {menuOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              top: 56,
              zIndex: 99,
              background: PAGE_BG,
              display: 'flex',
              flexDirection: 'column',
              padding: '24px 24px 40px',
              overflowY: 'auto',
              animation: 'fadeUp 0.3s cubic-bezier(.16,1,.3,1) both',
            }}
          >
            <SearchForm stacked onDone={closeMenu} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 28 }}>
              {LINKS.map((l) => {
                const active = l.href === pathname;
                const isGbb = l.href === '/gbb';
                return (
                  <TransitionLink
                    key={l.href}
                    href={l.href}
                    onClick={closeMenu}
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 26,
                      color: isGbb ? GOLD : active ? ACCENT : INK,
                      fontStyle: active ? 'italic' : 'normal',
                      background: 'transparent',
                    }}
                  >
                    {pick(lang, l)}
                  </TransitionLink>
                );
              })}
              <TransitionLink
                href="/account"
                onClick={closeMenu}
                style={{ fontFamily: 'var(--font-serif)', fontSize: 26, color: pathname === '/account' ? ACCENT : INK, fontStyle: pathname === '/account' ? 'italic' : 'normal', background: 'transparent' }}
              >
                {pick(lang, { en: 'Account', sk: 'Účet', cz: 'Účet' })}
              </TransitionLink>
            </div>
            <div style={{ marginTop: 26, paddingTop: 22, borderTop: `1px solid ${BORDER}` }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase', color: MUTED, marginBottom: 14 }}>
                {pick(lang, { en: 'Categories', sk: 'Kategórie', cz: 'Kategorie' })}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[...CATEGORY_LINKS, ...MORE_LINKS.filter((m) => m.href === '/accessories' || m.href === '/blog')].map((c) => (
                  <Link key={c.href} href={c.href} onClick={closeMenu} style={{ fontFamily: 'var(--font-sans)', fontSize: 17, color: INK }}>
                    {pick(lang, c)}
                  </Link>
                ))}
                <Link href="/contact" onClick={closeMenu} style={{ fontFamily: 'var(--font-sans)', fontSize: 17, color: ACCENT }}>
                  {pick(lang, { en: 'Contact & support', sk: 'Kontakt a podpora', cz: 'Kontakt a podpora' })}
                </Link>
              </div>
            </div>
            <div style={{ marginTop: 28, paddingTop: 22, borderTop: `1px solid ${BORDER}` }}>
              <ClerkAuthControls stacked />
            </div>
            <div style={{ marginTop: 26 }}>
              <LangCurrencyRow />
            </div>
          </div>
        )}
      </>
    );
  }

  // ---------------------------------------------------------------- desktop
  const barLink = (l: { href: string } & L3) => {
    const active = l.href === pathname;
    const isGbb = l.href === '/gbb';
    const isUndervolt = l.href === '/undervolting';
    const hovered = hoveredHref === l.href;
    return (
      <TransitionLink
        key={l.href}
        href={l.href}
        onMouseEnter={() => setHoveredHref(l.href)}
        onMouseLeave={() => setHoveredHref(null)}
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          padding: variant === 'compact' ? '0 10px' : '0 18px',
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 0.2,
          whiteSpace: 'nowrap',
          color: isGbb ? GOLD_LIGHT : ON_ACCENT,
          background: active ? 'rgba(0,0,0,0.24)' : hovered ? 'rgba(0,0,0,0.14)' : 'transparent',
          borderRight: '1px solid rgba(255,255,255,0.12)',
          boxShadow: active ? `inset 0 -3px 0 ${GOLD}` : 'none',
        }}
      >
        <span style={{ position: 'relative', display: 'inline-block', overflow: 'hidden', padding: '2px 8px', margin: '-2px -8px' }}>
          <StableLabel text={l} align="center" />
          {isUndervolt && hovered && <UndervoltBolts />}
        </span>
      </TransitionLink>
    );
  };

  return (
    <>
      {variant === 'full' && (
        // 1 — utility bar: the only part of the header that scrolls away with the page
        <div ref={topRef} className="gomp-header-top" style={{ background: SURFACE_ALT, borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 60px', height: 34, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase', color: MUTED }}>
              {pick(lang, {
                en: 'Hand-built gaming PCs · Prague, CZ',
                sk: 'Ručne stavané herné PC · Praha, ČR',
                cz: 'Ručně stavěná herní PC · Praha, ČR',
              })}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <LangCurrencyChips />
              {/* Fixed-width, right-aligned slot: Clerk renders nothing until it has loaded, and
                  "Sign in · Register" / the avatar differ in width — neither may move the chips. */}
              <div style={{ width: 196, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', minHeight: 28 }}>
                <ClerkAuthControls />
              </div>
              <TransitionLink
                href="/account"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  color: pathname === '/account' ? ACCENT : INK,
                  fontWeight: 600,
                  background: 'transparent',
                }}
              >
                <StableLabel text={ACCOUNT_LABEL} align="end" />
              </TransitionLink>
              <DeviceViewToggle />
            </div>
          </div>
        </div>
      )}
      {/* Sticky wrapper: the main row (logo, support, search, cart) and the green nav bar stay pinned together,
          so the logo is visible on every page and scroll position. */}
      <div ref={barRef} className="gomp-nav-bar" style={{ position: 'sticky', top: 0, zIndex: 100, background: PAGE_BG }}>
        {variant === 'full' && (
          <div style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 60px', display: 'flex', alignItems: 'center', gap: 32 }}>
              <Logo size={27} />
              <TransitionLink
                href="/contact"
                style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, color: ACCENT, background: 'transparent' }}
              >
                <IconHeadset />
                <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10.5, color: MUTED }}>
                    <StableLabel text={{ en: 'Personal service', sk: 'Osobný prístup', cz: 'Osobní přístup' }} />
                  </span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 700, color: INK }}>
                    <StableLabel text={{ en: 'Contact & support', sk: 'Kontakt a podpora', cz: 'Kontakt a podpora' }} />
                  </span>
                </span>
              </TransitionLink>
              <SearchForm />
              <CartWidget />
            </div>
          </div>
        )}
        <nav
          style={{
            background: ACCENT_DEEP,
            backgroundImage: 'linear-gradient(90deg, #0F5C3A 0%, #0D5233 100%)',
            boxShadow: '0 6px 18px -8px rgba(0,0,0,0.6)',
          }}
        >
          <div
            style={{
              // /build is a full-bleed app layout: its bar spans the width instead of the 1280px column.
              maxWidth: variant === 'compact' ? undefined : 1280,
              margin: '0 auto',
              padding: variant === 'compact' ? '0 20px' : '0 60px',
              height: 46,
              display: 'flex',
              alignItems: 'stretch',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              {/* /build has no main row, so the logo lives at the left of the green bar there. */}
              {variant === 'compact' && (
                <div style={{ display: 'flex', alignItems: 'center', paddingRight: 18 }}>
                  <Logo size={21} />
                </div>
              )}
              <div ref={catRef} style={{ position: 'relative', display: 'flex' }}>
                <button
                  onClick={() => setCatOpen((v) => !v)}
                  aria-expanded={catOpen}
                  aria-haspopup="true"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '0 22px',
                    background: catOpen ? 'rgba(0,0,0,0.38)' : 'rgba(0,0,0,0.28)',
                    border: 'none',
                    borderRight: '1px solid rgba(255,255,255,0.12)',
                    color: ON_ACCENT,
                    fontFamily: 'var(--font-sans)',
                    fontSize: 12.5,
                    fontWeight: 700,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  <IconMenu />
                  <StableLabel text={{ en: 'Categories', sk: 'Kategórie', cz: 'Kategorie' }} />
                </button>
                {catOpen && (
                  <div
                    role="menu"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      width: 290,
                      background: PANEL_BG,
                      border: `1px solid ${BORDER_STRONG}`,
                      borderTop: `2px solid ${ACCENT}`,
                      boxShadow: '0 24px 40px -12px rgba(0,0,0,0.7)',
                      padding: '10px 0',
                      animation: 'fadeUp 0.18s ease both',
                    }}
                  >
                    <div style={{ padding: '8px 20px 6px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: MUTED }}>
                      {pick(lang, { en: 'Ready-made builds', sk: 'Hotové zostavy', cz: 'Hotové sestavy' })}
                    </div>
                    {CATEGORY_LINKS.map((c) => (
                      <Link key={c.href} href={c.href} role="menuitem" onClick={() => setCatOpen(false)} className="gomp-menu-item">
                        {pick(lang, c)}
                      </Link>
                    ))}
                    <div style={{ height: 1, background: BORDER, margin: '8px 0' }} />
                    {MORE_LINKS.map((c) => (
                      <Link key={c.href} href={c.href} role="menuitem" onClick={() => setCatOpen(false)} className="gomp-menu-item">
                        {pick(lang, c)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              {LINKS.map(barLink)}
            </div>
            {variant === 'compact' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingLeft: 12 }}>
                <LangCurrencyChips />
                <TransitionLink
                  href="/account"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: ON_ACCENT, fontWeight: 600, background: 'transparent' }}
                >
                  <StableLabel text={ACCOUNT_LABEL} align="end" />
                </TransitionLink>
                <CartWidget compact />
                <DeviceViewToggle />
              </div>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}
