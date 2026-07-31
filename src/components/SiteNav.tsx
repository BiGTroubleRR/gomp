'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import TransitionLink from '@/components/TransitionLink';
import { useSite } from '@/contexts/SiteContext';

const INK = '#1C1C1A';
const MUTED = '#7A7469';
const MAROON = '#6E1423';
const GOLD = '#C4A35A';

const LINKS: { href: string; en: string; sk: string }[] = [
  { href: '/', en: 'Home', sk: 'Domov' },
  { href: '/shop', en: 'Shop', sk: 'Obchod' },
  { href: '/build', en: 'Build', sk: 'Zostaviť' },
  { href: '/about', en: 'About', sk: 'O nás' },
];

// The one shared top nav used by every page except Admin (which is a deliberately distinct
// dark-chrome area). Pulled out into a single component after the 7 hand-written copies drifted
// in height/padding/gaps/z-index, which made the page-to-page View Transition visibly snap the
// bar into a different position mid-animation.
export default function SiteNav({ cta }: { cta?: ReactNode }) {
  const { lang, currency, setLang, setCurrency } = useSite();
  const pathname = usePathname();

  return (
    <nav
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
        <TransitionLink
          href="/"
          style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 600, letterSpacing: 1.5, fontSize: 17, color: GOLD }}
        >
          GOMP
        </TransitionLink>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <button
              onClick={() => setLang('en')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)', fontSize: 12, color: lang === 'en' ? MAROON : MUTED, fontWeight: lang === 'en' ? 600 : 400 }}
            >
              EN
            </button>
            <span style={{ color: 'rgba(28,28,26,0.25)', fontSize: 12 }}>/</span>
            <button
              onClick={() => setLang('sk')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)', fontSize: 12, color: lang === 'sk' ? MAROON : MUTED, fontWeight: lang === 'sk' ? 600 : 400 }}
            >
              SK
            </button>
          </div>
          <span style={{ color: 'rgba(28,28,26,0.2)', fontSize: 12 }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <button
              onClick={() => setCurrency('eur')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)', fontSize: 12, color: currency === 'eur' ? MAROON : MUTED, fontWeight: currency === 'eur' ? 600 : 400 }}
            >
              €
            </button>
            <span style={{ color: 'rgba(28,28,26,0.25)', fontSize: 12 }}>/</span>
            <button
              onClick={() => setCurrency('czk')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans)', fontSize: 12, color: currency === 'czk' ? MAROON : MUTED, fontWeight: currency === 'czk' ? 600 : 400 }}
            >
              Kč
            </button>
          </div>
        </div>
        {cta}
      </div>
    </nav>
  );
}
