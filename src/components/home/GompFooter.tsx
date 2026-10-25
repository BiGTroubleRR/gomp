'use client';

import Link from 'next/link';
import { useSite } from '@/contexts/SiteContext';
import { pick } from '@/lib/i18n';
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
    en: 'Hand-built gaming PCs configured to your exact specifications. Built by gamers, for gamers.',
    sk: 'Ručne stavané herné počítače presne podľa vašich požiadaviek. Staviame ich hráči pre hráčov.',
    cz: 'Ručně stavěné herní počítače přesně podle vašich požadavků. Stavíme je hráči pro hráče.',
  },
  rights: { en: 'All rights reserved.', sk: 'Všetky práva vyhradené.', cz: 'Všechna práva vyhrazena.' },
  madein: { en: 'Hand-built in Prague, CZ', sk: 'Ručne vyrábané v Prahe, ČR', cz: 'Ručně vyrobeno v Praze, ČR' },
  disclaimer: {
    en: 'Prices are shown in CZK (Kč); the € figure is an approximate conversion (1 € ≈ 24.30 Kč, reference Jul 2026). Final price confirmed at checkout.',
    sk: 'Ceny sú uvedené v Kč; suma v € je približný prepočet (1 € ≈ 24,30 Kč, referenčný júl 2026). Konečná cena bude potvrdená pri objednávke.',
    cz: 'Ceny jsou uvedeny v Kč; částka v € je přibližný přepočet (1 € ≈ 24,30 Kč, referenční červenec 2026). Konečná cena bude potvrzena při objednávce.',
  },
  tiers: {
    en: 'Every GOMP is rated on a tier scale from S (top) down to B (entry-level), calculated as the average tier of its individual components.',
    sk: 'Každý GOMP má hodnotenie na škále S (najvyššie) až B (základné), vypočítané ako priemer úrovní jeho jednotlivých komponentov.',
    cz: 'Každý GOMP má hodnocení na škále S (nejvyšší) až B (základní), vypočítané jako průměr úrovní jeho jednotlivých komponentů.',
  },
} satisfies Record<string, L3>;

const vatNote = (lang: 'en' | 'sk' | 'cz', pct: number) =>
  pick(lang, { en: `All prices include VAT (${pct}%).`, sk: `Všetky ceny obsahujú DPH (${pct}%).`, cz: `Všechny ceny zahrnují DPH (${pct}%).` });

export default function GompFooter() {
  const { lang, vatRatePct } = useSite();
  const s = (k: keyof typeof T) => pick(lang, T[k]);
  return (
    <footer>
      <div className="wrap">
        <div className="fgrid">
          <div>
            <div className="logo"><i />GOMP</div>
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
          <div><b>© 2026 GOMP. {s('rights')}</b> {s('madein')}</div>
          <div>{vatNote(lang, vatRatePct)} {s('disclaimer')}</div>
          <div>{s('tiers')}</div>
        </div>
      </div>
    </footer>
  );
}
