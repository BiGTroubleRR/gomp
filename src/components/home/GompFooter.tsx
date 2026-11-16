'use client';

import Link from 'next/link';
import { useSite } from '@/contexts/SiteContext';
import { pick } from '@/lib/i18n';
import { GompLogo, LOGO_HEIGHT } from '@/components/brand/GompLogo';
import type { L3 } from './home-shared';
import './gomp-home.css';

// Markup and class names are the zip's (styled by gomp-home.css); text is translated and the links point
// at the pages that now exist.
const COLS: { title: L3; links: ({ href: string } & L3)[] }[] = [
  {
    title: { en: 'PRODUCTS', sk: 'PRODUKTY', cz: 'PRODUKTY' },
    links: [
      { href: '/shop', en: 'Prebuilt PCs', sk: 'Hotové zostavy', cz: 'Hotové sestavy' },
      { href: '/build', en: 'Custom Builder', sk: 'Vlastná konfigurácia', cz: 'Vlastní konfigurace' },
      { href: '/accessories', en: 'Accessories', sk: 'Príslušenstvo', cz: 'Příslušenství' },
    ],
  },
  {
    title: { en: 'COMPANY', sk: 'SPOLOČNOSŤ', cz: 'SPOLEČNOST' },
    links: [
      { href: '/about', en: 'About Us', sk: 'O nás', cz: 'O nás' },
      { href: '/blog', en: 'Blog', sk: 'Blog', cz: 'Blog' },
      { href: '/careers', en: 'Careers', sk: 'Kariéra', cz: 'Kariéra' },
    ],
  },
  {
    title: { en: 'SUPPORT', sk: 'PODPORA', cz: 'PODPORA' },
    links: [
      { href: '/faq', en: 'FAQ', sk: 'FAQ', cz: 'FAQ' },
      { href: '/terms#complaints', en: 'Warranty', sk: 'Záruka', cz: 'Záruka' },
      { href: '/contact', en: 'Contact', sk: 'Kontakt', cz: 'Kontakt' },
    ],
  },
  {
    title: { en: 'LEGAL', sk: 'PRÁVNE', cz: 'PRÁVNÍ' },
    links: [
      { href: '/terms', en: 'Terms & Conditions', sk: 'Obchodné podmienky', cz: 'Obchodní podmínky' },
      { href: '/privacy', en: 'Privacy Policy', sk: 'Ochrana osobných údajov', cz: 'Ochrana osobních údajů' },
    ],
  },
];

const T = {
  blurb: {
    en: 'Gaming PCs built for you, to your exact specifications.',
    sk: 'Herné počítače stavané pre vás presne podľa vašich požiadaviek.',
    cz: 'Herní počítače stavěné pro vás přesně podle vašich požadavků.',
  },
  rights: { en: 'All rights reserved.', sk: 'Všetky práva vyhradené.', cz: 'Všechna práva vyhrazena.' },
  coop: { en: 'In cooperation with', sk: 'V spolupráci s', cz: 'Ve spolupráci s' },
} satisfies Record<string, L3>;

export default function GompFooter() {
  const { lang } = useSite();
  const s = (k: keyof typeof T) => pick(lang, T[k]);
  return (
    <footer>
      <div className="wrap">
        <div className="fgrid">
          <div>
            <GompLogo height={LOGO_HEIGHT.footer} />
            <p>{s('blurb')}</p>
          </div>
          {COLS.map((c) => (
            <div key={c.title.en}>
              <h4>{pick(lang, c.title)}</h4>
              <ul>{c.links.map((l) => <li key={l.href}><Link href={l.href}>{pick(lang, l)}</Link></li>)}</ul>
            </div>
          ))}
        </div>
        <div className="legal">
          <div><b>© 2026 GOMP. {s('rights')}</b></div>
          <div>
            {s('coop')}{' '}
            <a href="https://www.alexadam.sk" target="_blank" rel="noopener noreferrer">www.alexadam.sk</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
