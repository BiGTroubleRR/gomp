'use client';

import { useSite } from '@/contexts/SiteContext';
import { pick } from '@/lib/i18n';
import { useIsMobile } from '@/lib/use-media-query';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import TransitionLink from '@/components/TransitionLink';
import { ACCENT, ACCENT_GRADIENT, BORDER_STRONG, GOLD, INK, MUTED, ON_ACCENT, PAGE_BG, PANEL_BG } from '@/lib/design-tokens';

type L3 = { en: string; sk: string; cz: string };

// One shared, on-brand placeholder for footer/header destinations whose real content doesn't exist
// yet (Accessories, Blog, Careers, FAQ) — every link on the site lands somewhere, and the contact /
// shop buttons keep the visitor moving until the real page replaces this one.
export default function ComingSoon({ eyebrow, title, blurb }: { eyebrow: L3; title: L3; blurb: L3 }) {
  const { lang } = useSite();
  const isMobile = useIsMobile();

  return (
    <div style={{ background: PAGE_BG, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SiteNav />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '56px 24px' : '96px 60px', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', top: '50%', left: '50%', width: 520, height: 520, marginLeft: -260, marginTop: -260, border: `0.5px solid ${BORDER_STRONG}`, borderRadius: '50%', animation: 'gompRotateSlow 120s linear infinite', pointerEvents: 'none' }} />
        <div aria-hidden style={{ position: 'absolute', top: '50%', left: '50%', width: 340, height: 340, marginLeft: -170, marginTop: -170, border: `0.5px solid rgba(196,163,90,0.22)`, borderRadius: '50%', animation: 'gompRotateSlowRev 90s linear infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 560, textAlign: 'center', background: PANEL_BG, border: `1px solid ${BORDER_STRONG}`, padding: isMobile ? '36px 24px' : '52px 48px', borderRadius: 4 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase', color: GOLD, marginBottom: 18 }}>
            {pick(lang, eyebrow)} · {pick(lang, { en: 'Coming soon', sk: 'Čoskoro', cz: 'Již brzy' })}
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: isMobile ? 30 : 40, fontWeight: 400, color: INK, lineHeight: 1.05, letterSpacing: -0.5, margin: '0 0 18px' }}>
            {pick(lang, title)}
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: 1.75, color: MUTED, fontWeight: 300, margin: '0 0 30px' }}>{pick(lang, blurb)}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <TransitionLink
              href="/contact"
              style={{ background: ACCENT_GRADIENT, color: ON_ACCENT, padding: '13px 26px', borderRadius: 2, fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}
            >
              {pick(lang, { en: 'Contact us', sk: 'Napíšte nám', cz: 'Napište nám' })}
            </TransitionLink>
            <TransitionLink
              href="/shop"
              style={{ border: `1px solid ${ACCENT}`, color: ACCENT, background: 'transparent', padding: '12px 26px', borderRadius: 2, fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}
            >
              {pick(lang, { en: 'Browse builds', sk: 'Pozrieť zostavy', cz: 'Prohlédnout sestavy' })}
            </TransitionLink>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
