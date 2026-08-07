'use client';

import { CSSProperties, ReactNode } from 'react';
import TransitionLink from '@/components/TransitionLink';
import { useSite } from '@/contexts/SiteContext';
import { useIsMobile } from '@/lib/use-media-query';

const INK = '#1C1C1A';
const MUTED = '#7A7469';
const GOLD = '#C4A35A';

const serif: CSSProperties = { fontFamily: 'var(--font-serif)' };
const sans: CSSProperties = { fontFamily: 'var(--font-sans)' };
const linkStyle: CSSProperties = { ...sans, fontSize: 13, color: 'rgba(245,240,230,0.4)', textDecoration: 'none', fontWeight: 300 };

const T = {
  en: {
    blurb: 'Hand-built gaming PCs configured to your exact specifications. Built by gamers, for gamers.',
    products: 'Products',
    prebuilt: 'Prebuilt PCs',
    custom: 'Custom Builder',
    accessories: 'Accessories',
    company: 'Company',
    aboutus: 'About Us',
    careers: 'Careers',
    support: 'Support',
    faq: 'FAQ',
    warranty: 'Warranty',
    contact: 'Contact',
    legal: 'Legal',
    terms: 'Terms & Conditions',
    privacy: 'Privacy Policy',
    rights: 'All rights reserved.',
    madein: 'Hand-built in Prague, CZ',
    disclaimer:
      'Prices are shown for guidance only, converted at approximate market rates (1 € ≈ 24.30 Kč, reference Jul 2026). Final price confirmed at checkout.',
    data_attribution_pre: 'Component dimensions and specifications include information from ',
    data_attribution_name: 'BuildCores OpenDB',
    data_attribution_mid: ', made available under the ',
    data_attribution_license: 'ODC Attribution License',
    data_attribution_post: '.',
  },
  sk: {
    blurb: 'Ručne stavané herné počítače presne podľa vašich požiadaviek. Staviame ich hráči pre hráčov.',
    products: 'Produkty',
    prebuilt: 'Hotové zostavy',
    custom: 'Vlastná konfigurácia',
    accessories: 'Príslušenstvo',
    company: 'Spoločnosť',
    aboutus: 'O nás',
    careers: 'Kariéra',
    support: 'Podpora',
    faq: 'FAQ',
    warranty: 'Záruka',
    contact: 'Kontakt',
    legal: 'Právne',
    terms: 'Obchodné podmienky',
    privacy: 'Ochrana osobných údajov',
    rights: 'Všetky práva vyhradené.',
    madein: 'Ručne vyrábané v Prahe, ČR',
    disclaimer:
      'Ceny slúžia len na orientáciu, prepočítané približným trhovým kurzom (1 € ≈ 24,30 Kč, referenčný júl 2026). Konečná cena bude potvrdená pri objednávke.',
    data_attribution_pre: 'Rozmery a parametre komponentov obsahujú informácie z databázy ',
    data_attribution_name: 'BuildCores OpenDB',
    data_attribution_mid: ', dostupnej pod licenciou ',
    data_attribution_license: 'ODC Attribution License',
    data_attribution_post: '.',
  },
} as const;

function Col({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ ...sans, fontSize: 11, fontWeight: 500, color: MUTED, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </div>
  );
}

// The shared full footer used on content pages (Home, About, and the legal pages) — Shop
// deliberately keeps its own slimmer single-row footer rather than this 4-column one, so it
// isn't duplicated here.
export default function SiteFooter() {
  const { lang } = useSite();
  const t = T[lang];
  const isMobile = useIsMobile();

  return (
    <footer style={{ background: INK, padding: isMobile ? 24 : 60, borderTop: '0.5px solid rgba(28,28,26,0.3)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr 1fr 1fr',
            gap: isMobile ? 32 : 40,
            marginBottom: isMobile ? 32 : 48,
          }}
        >
          <div>
            <div style={{ ...serif, fontSize: 19, fontWeight: 600, fontStyle: 'italic', color: GOLD, letterSpacing: 1.5, marginBottom: 16 }}>
              GOMP
            </div>
            <p style={{ ...sans, fontSize: 13, color: MUTED, lineHeight: 1.75, maxWidth: 260, margin: 0, fontWeight: 300 }}>{t.blurb}</p>
          </div>
          <Col title={t.products}>
            <TransitionLink href="/shop" style={linkStyle}>{t.prebuilt}</TransitionLink>
            <TransitionLink href="/build" style={linkStyle}>{t.custom}</TransitionLink>
            <a href="#" style={linkStyle}>{t.accessories}</a>
          </Col>
          <Col title={t.company}>
            <TransitionLink href="/about" style={linkStyle}>{t.aboutus}</TransitionLink>
            <a href="#" style={linkStyle}>Blog</a>
            <a href="#" style={linkStyle}>{t.careers}</a>
          </Col>
          <Col title={t.support}>
            <a href="#" style={linkStyle}>{t.faq}</a>
            <a href="#" style={linkStyle}>{t.warranty}</a>
            <a href="#" style={linkStyle}>{t.contact}</a>
          </Col>
          <Col title={t.legal}>
            <TransitionLink href="/terms" style={linkStyle}>{t.terms}</TransitionLink>
            <TransitionLink href="/privacy" style={linkStyle}>{t.privacy}</TransitionLink>
          </Col>
        </div>
        <div
          style={{
            borderTop: '0.5px solid rgba(245,240,230,0.1)',
            paddingTop: 24,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 8 : 0,
            justifyContent: 'space-between',
          }}
        >
          <span style={{ ...sans, fontSize: 12, color: 'rgba(245,240,230,0.3)', fontWeight: 300 }}>© 2026 GOMP. {t.rights}</span>
          <span style={{ ...sans, fontSize: 12, color: 'rgba(245,240,230,0.3)', fontWeight: 300, display: 'flex', alignItems: 'center', gap: 10 }}>
            {t.madein}
            {/* Deliberately understated admin-panel entry point, not a typo — matches the original Home footer. */}
            <TransitionLink href="/admin" style={{ color: 'rgba(245,240,230,0.18)', textDecoration: 'none' }}>
              ·
            </TransitionLink>
          </span>
        </div>
        <div style={{ borderTop: '0.5px solid rgba(245,240,230,0.08)', marginTop: 20, paddingTop: 20 }}>
          <span style={{ ...sans, fontSize: 11, color: 'rgba(245,240,230,0.28)', fontWeight: 300, lineHeight: 1.6 }}>{t.disclaimer}</span>
          <br />
          <span style={{ ...sans, fontSize: 11, color: 'rgba(245,240,230,0.28)', fontWeight: 300, lineHeight: 1.6 }}>
            {t.data_attribution_pre}
            <a href="https://github.com/buildcores/buildcores-open-db" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(245,240,230,0.42)' }}>
              {t.data_attribution_name}
            </a>
            {t.data_attribution_mid}
            <a href="https://opendatacommons.org/licenses/by/1-0/" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(245,240,230,0.42)' }}>
              {t.data_attribution_license}
            </a>
            {t.data_attribution_post}
          </span>
        </div>
      </div>
    </footer>
  );
}
