'use client';

import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import TransitionLink from '@/components/TransitionLink';
import { useSite } from '@/contexts/SiteContext';
import { useIsMobile, useMediaQuery } from '@/lib/use-media-query';
import DeviceViewToggle from '@/components/DeviceViewToggle';
import { GBB_GREEN } from '@/lib/gbb-theme';

const INK = '#1C1C1A';
const MUTED = '#7A7469';
const MAROON = '#6E1423';
const GOLD = '#C4A35A';
const BG = '#F5F0E6';

const LINKS: { href: string; en: string; sk: string }[] = [
  { href: '/', en: 'Home', sk: 'Domov' },
  { href: '/shop', en: 'Shop', sk: 'Obchod' },
  { href: '/build', en: 'Build', sk: 'Zostaviť' },
  { href: '/gbb', en: 'Budget Builds', sk: 'Rozpočtové zostavy' },
  { href: '/about', en: 'About', sk: 'O nás' },
];

function LangCurrencyRow({ stacked }: { stacked?: boolean }) {
  const { lang, currency, setLang, setCurrency } = useSite();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: stacked ? 'column' : 'row' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <button
          onClick={() => setLang('en')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)', fontSize: stacked ? 16 : 12, color: lang === 'en' ? MAROON : MUTED, fontWeight: lang === 'en' ? 600 : 400 }}
        >
          EN
        </button>
        <span style={{ color: 'rgba(28,28,26,0.25)', fontSize: stacked ? 16 : 12 }}>/</span>
        <button
          onClick={() => setLang('sk')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)', fontSize: stacked ? 16 : 12, color: lang === 'sk' ? MAROON : MUTED, fontWeight: lang === 'sk' ? 600 : 400 }}
        >
          SK
        </button>
      </div>
      <span style={{ color: 'rgba(28,28,26,0.2)', fontSize: stacked ? 16 : 12 }}>|</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <button
          onClick={() => setCurrency('eur')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)', fontSize: stacked ? 16 : 12, color: currency === 'eur' ? MAROON : MUTED, fontWeight: currency === 'eur' ? 600 : 400 }}
        >
          €
        </button>
        <span style={{ color: 'rgba(28,28,26,0.25)', fontSize: stacked ? 16 : 12 }}>/</span>
        <button
          onClick={() => setCurrency('czk')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)', fontSize: stacked ? 16 : 12, color: currency === 'czk' ? MAROON : MUTED, fontWeight: currency === 'czk' ? 600 : 400 }}
        >
          Kč
        </button>
      </div>
    </div>
  );
}

// Clerk-backed sign-in/sign-up/account controls — separate from the existing "Account" link
// (which still points at the Supabase-backed /account page) until the two auth paths are
// unified. Kept as its own component since both nav variants need the same signed-in/
// signed-out pair.
function ClerkAuthControls({ stacked }: { stacked?: boolean }) {
  const { lang } = useSite();
  const fontSize = stacked ? 16 : 13;
  return (
    <>
      <Show when="signed-out">
        <div style={{ display: 'flex', alignItems: 'center', gap: stacked ? 18 : 14 }}>
          <SignInButton mode="modal">
            <button
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                fontFamily: 'var(--font-sans)',
                fontSize,
                color: MUTED,
              }}
            >
              {lang === 'sk' ? 'Prihlásiť sa' : 'Sign In'}
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button
              style={{
                background: MAROON,
                color: '#FDFAF4',
                border: 'none',
                cursor: 'pointer',
                padding: stacked ? '10px 18px' : '7px 16px',
                borderRadius: 2,
                fontFamily: 'var(--font-sans)',
                fontSize,
                fontWeight: 500,
              }}
            >
              {lang === 'sk' ? 'Zaregistrovať sa' : 'Sign Up'}
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

// The brand mark doubles as a switcher between the main store and the Gomp Budget Builds
// (secondhand) section: it shows whichever section you're currently in, and hovering flips
// the OTHER one down from above into that exact same spot — like a departure-board flap —
// while the current label flips away below. Leaving reverses it back. Mobile has no hover,
// so its full-screen menu keeps a plain "Budget Builds" entry in LINKS as the real way in
// there; this is a desktop-only shortcut layered on top of that.
function LogoSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isGbb = pathname?.startsWith('/gbb') ?? false;

  const primaryLabel = isGbb ? 'GBB' : 'GOMP';
  const primaryHref = isGbb ? '/gbb' : '/';
  const primaryColor = isGbb ? GBB_GREEN : GOLD;

  const altLabel = isGbb ? 'GOMP' : 'GBB';
  const altHref = isGbb ? '/' : '/gbb';
  const altColor = isGbb ? GOLD : GBB_GREEN;

  const faceStyle = {
    fontFamily: 'var(--font-serif)',
    fontStyle: 'italic' as const,
    fontWeight: 600,
    letterSpacing: 1.5,
    fontSize: 17,
    whiteSpace: 'nowrap' as const,
  };

  return (
    <div className="gomp-logo-switch" style={{ position: 'relative', perspective: 320 }}>
      <TransitionLink
        href={primaryHref}
        onClick={onNavigate}
        className="gomp-logo-face gomp-logo-face-primary"
        style={{ ...faceStyle, display: 'block', color: primaryColor }}
      >
        {primaryLabel}
      </TransitionLink>
      <TransitionLink
        href={altHref}
        onClick={onNavigate}
        className="gomp-logo-face gomp-logo-face-alt"
        style={{ ...faceStyle, color: altColor }}
      >
        {altLabel}
      </TransitionLink>
    </div>
  );
}

// The one shared top nav used by every page except Admin (which is a deliberately distinct
// dark-chrome area). Collapses to a hamburger + full-screen menu below the 768px breakpoint —
// the desktop layout has no room for 4 links + account + lang/currency + a CTA on a phone.
//
// The desktop row itself needs ~900px to lay out without wrapping (longer Slovak labels like
// "O nás" and "Začať stavať →" are the tightest fit) — well above the 768px point where the
// rest of each page's grids/hero switch to their mobile layout. So the nav collapses to the
// hamburger earlier than the page body does, on its own wider threshold, rather than letting
// the row run out of room and wrap link/button text onto a second line mid-bar.
export default function SiteNav({ cta }: { cta?: ReactNode }) {
  const { lang } = useSite();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const navTooNarrow = useMediaQuery('(max-width: 960px)');
  const showMobileNav = isMobile || navTooNarrow;
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  if (showMobileNav) {
    return (
      <>
        <nav
          className="gomp-nav-bar"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 56,
            zIndex: 100,
            background: 'rgba(245,240,230,0.96)',
            backdropFilter: 'blur(12px)',
            borderBottom: '0.5px solid rgba(28,28,26,0.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
          }}
        >
          <LogoSwitcher onNavigate={closeMenu} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <DeviceViewToggle />
            <button
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((v) => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}
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
              background: BG,
              display: 'flex',
              flexDirection: 'column',
              padding: '32px 28px',
              overflowY: 'auto',
              animation: 'fadeUp 0.3s cubic-bezier(.16,1,.3,1) both',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              {LINKS.map((l) => {
                const active = l.href === pathname;
                return (
                  <TransitionLink
                    key={l.href}
                    href={l.href}
                    onClick={closeMenu}
                    style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: active ? MAROON : INK, fontStyle: active ? 'italic' : 'normal' }}
                  >
                    {lang === 'sk' ? l.sk : l.en}
                  </TransitionLink>
                );
              })}
              <TransitionLink
                href="/account"
                onClick={closeMenu}
                style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: pathname === '/account' ? MAROON : INK, fontStyle: pathname === '/account' ? 'italic' : 'normal' }}
              >
                {lang === 'sk' ? 'Účet' : 'Account'}
              </TransitionLink>
            </div>
            <div style={{ marginTop: 40, paddingTop: 28, borderTop: '0.5px solid rgba(28,28,26,0.14)' }}>
              <ClerkAuthControls stacked />
            </div>
            <div style={{ marginTop: 28 }}>
              <LangCurrencyRow />
            </div>
            {cta && (
              <div style={{ marginTop: 28 }} onClick={closeMenu}>
                {cta}
              </div>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <nav
      className="gomp-nav-bar"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 60,
        zIndex: 100,
        background: 'rgba(245,240,230,0.96)',
        backdropFilter: 'blur(12px)',
        borderBottom: '0.5px solid rgba(28,28,26,0.14)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 60px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 48 }}>
        <LogoSwitcher />
        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          {LINKS.map((l) => {
            const active = l.href === pathname;
            return (
              <TransitionLink
                key={l.href}
                href={l.href}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: active ? INK : MUTED, fontWeight: active ? 700 : 400 }}
              >
                {lang === 'sk' ? l.sk : l.en}
              </TransitionLink>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <TransitionLink
          href="/account"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: pathname === '/account' ? INK : MUTED,
            fontWeight: pathname === '/account' ? 700 : 400,
          }}
        >
          {lang === 'sk' ? 'Účet' : 'Account'}
        </TransitionLink>
        <ClerkAuthControls />
        <LangCurrencyRow />
        <DeviceViewToggle />
        {cta}
      </div>
    </nav>
  );
}
