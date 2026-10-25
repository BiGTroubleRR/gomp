'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSite } from '@/contexts/SiteContext';
import { pick } from '@/lib/i18n';
import { useCartSummary } from '@/lib/use-cart-summary';
import type { L3 } from './home-shared';
import './gomp-home.css';

// Markup and class names are the zip's (styled by gomp-home.css); only the text, language/currency
// switches, cart widget and search are wired to the site.
const NAV: ({ href: string } & L3)[] = [
  { href: '/', en: 'Home', sk: 'Domov', cz: 'Domů' },
  { href: '/shop', en: 'Shop', sk: 'Obchod', cz: 'Obchod' },
  { href: '/build', en: 'Build', sk: 'Zostaviť', cz: 'Sestavit' },
  { href: '/customer-builds', en: 'Customer GOMPs', sk: 'Zákaznícke GOMPy', cz: 'Zákaznické GOMPy' },
  { href: '/undervolting', en: 'Why undervolt?', sk: 'Prečo undervolt?', cz: 'Proč undervolt?' },
  { href: '/about', en: 'About', sk: 'O nás', cz: 'O nás' },
];

const CATS: ({ href: string; tag: string } & L3)[] = [
  { href: '/shop?cat=flagship', tag: 'S', en: 'Flagship', sk: 'Vlajkové', cz: 'Vlajkové' },
  { href: '/shop?cat=performance', tag: 'A', en: 'Performance', sk: 'Výkonné', cz: 'Výkonné' },
  { href: '/shop?cat=midrange', tag: 'B', en: 'Mid-range', sk: 'Stredná trieda', cz: 'Střední třída' },
  { href: '/shop?cat=entry', tag: 'B–D', en: 'Entry', sk: 'Základné', cz: 'Základní' },
  { href: '/gbb', tag: '→', en: 'Budget Builds', sk: 'Budget Builds', cz: 'Budget Builds' },
  { href: '/build', tag: '3D', en: 'Custom configuration', sk: 'Vlastná konfigurácia', cz: 'Vlastní konfigurace' },
];

const CAT_OPTIONS: { value: string; label: L3 }[] = [
  { value: 'flagship', label: { en: 'Flagship', sk: 'Vlajkové', cz: 'Vlajkové' } },
  { value: 'performance', label: { en: 'Performance', sk: 'Výkonné', cz: 'Výkonné' } },
  { value: 'midrange', label: { en: 'Mid-range', sk: 'Stredná trieda', cz: 'Střední třída' } },
  { value: 'entry', label: { en: 'Entry', sk: 'Základné', cz: 'Základní' } },
];

const T = {
  tagline: { en: 'Hand-built gaming PCs · Prague, CZ', sk: 'Ručne stavané herné PC · Praha, ČR', cz: 'Ručně stavěná herní PC · Praha, ČR' },
  language: { en: 'Language', sk: 'Jazyk', cz: 'Jazyk' },
  currency: { en: 'Currency', sk: 'Mena', cz: 'Měna' },
  account: { en: 'Account', sk: 'Účet', cz: 'Účet' },
  personal: { en: 'Personal service', sk: 'Osobný prístup', cz: 'Osobní přístup' },
  support: { en: 'Contact & support', sk: 'Kontakt a podpora', cz: 'Kontakt a podpora' },
  placeholder: { en: 'Search builds… (e.g. RTX 5070)', sk: 'Hľadám zostavu… (napr. RTX 5070)', cz: 'Hledám sestavu… (např. RTX 5070)' },
  searchLabel: { en: 'Search builds', sk: 'Hľadať zostavu', cz: 'Hledat sestavu' },
  category: { en: 'Category', sk: 'Kategória', cz: 'Kategorie' },
  allClasses: { en: 'All classes', sk: 'Všetky triedy', cz: 'Všechny třídy' },
  search: { en: 'Search', sk: 'Hľadať', cz: 'Hledat' },
  categories: { en: 'Categories', sk: 'Kategórie', cz: 'Kategorie' },
  mainNav: { en: 'Main navigation', sk: 'Hlavná navigácia', cz: 'Hlavní navigace' },
} satisfies Record<string, L3>;

function itemsLabel(n: number, lang: 'en' | 'sk' | 'cz'): string {
  if (lang === 'en') return n === 1 ? 'item' : 'items';
  if (n === 1) return 'položka';
  if (n >= 2 && n <= 4) return 'položky';
  return lang === 'cz' ? 'položek' : 'položiek';
}

// The one shared storefront header (Admin keeps its own chrome). `variant="compact"` renders only the green
// bar (plus logo, language/currency and cart) — used by /build so the 3D configurator keeps its height.
// It publishes its measured heights as --gomp-header-h (whole header) and --gomp-bar-h (the sticky green
// bar) on <html>, which full-height page layouts and sticky side panels use for their offsets.
export default function GompHeader({ active = '/', variant = 'full' }: { active?: string; variant?: 'full' | 'compact' }) {
  const { lang, setLang, currency, setCurrency, fmt } = useSite();
  const { count, totalCzk } = useCartSummary();
  const router = useRouter();
  const [catsOpen, setCatsOpen] = useState(false);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const catsRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const s = (k: keyof typeof T) => pick(lang, T[k]);

  // Layout effect (not useEffect): the heights are published before the first paint of a freshly mounted
  // page, so anything sized from them never paints with a stale value.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const bar = navRef.current?.offsetHeight ?? 0;
      const rest = (topRef.current?.offsetHeight ?? 0) + (headRef.current?.offsetHeight ?? 0);
      root.style.setProperty('--gomp-header-h', `${rest + bar}px`);
      root.style.setProperty('--gomp-bar-h', `${bar}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    [topRef, headRef, navRef].forEach((r) => r.current && ro.observe(r.current));
    return () => ro.disconnect();
  }, [variant]);

  useEffect(() => {
    if (!catsOpen) return;
    const close = (e: MouseEvent) => { if (!catsRef.current?.contains(e.target as Node)) setCatsOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [catsOpen]);

  function onSearch(query: string, category: string) {
    const p = new URLSearchParams();
    if (query.trim()) p.set('q', query.trim());
    if (category) p.set('cat', category);
    const qs = p.toString();
    router.push(qs ? `/shop?${qs}` : '/shop');
  }

  const langSeg = (
    <div className="seg" role="group" aria-label={s('language')}>
      {(['sk', 'cz', 'en'] as const).map((l) => (
        <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
      ))}
    </div>
  );
  const currencySeg = (
    <div className="seg" role="group" aria-label={s('currency')}>
      <button type="button" aria-pressed={currency === 'czk'} onClick={() => setCurrency('czk')}>Kč</button>
      <button type="button" aria-pressed={currency === 'eur'} onClick={() => setCurrency('eur')}>€</button>
    </div>
  );
  const cartLink = (
    <Link className="cart" href={count > 0 ? '/checkout' : '/build'}>
      <span className="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 4h2l2.4 11h11l2-8H6.2" /><circle cx="9" cy="19.5" r="1.3" /><circle cx="17" cy="19.5" r="1.3" /></svg></span>
      <span><small>{count} {itemsLabel(count, lang)}</small><b className="num">{fmt(totalCzk)}</b></span>
    </Link>
  );
  const catsMenu = (
    <div className="cats" ref={catsRef}>
      <button type="button" aria-expanded={catsOpen} aria-controls="gomp-cats" onClick={() => setCatsOpen((v) => !v)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        <span className="t">{s('categories')}</span>
      </button>
      <ul id="gomp-cats" hidden={!catsOpen}>
        {CATS.map((c) => (
          <li key={c.href}><Link href={c.href}>{pick(lang, c)} <span>{c.tag}</span></Link></li>
        ))}
      </ul>
    </div>
  );
  const navLinks = (
    <div className="links">
      {NAV.map((n) => (
        <Link key={n.href} href={n.href} aria-current={active === n.href ? 'page' : undefined}>{pick(lang, n)}</Link>
      ))}
      <Link className="hl" href="/gbb">Budget Builds</Link>
    </div>
  );

  if (variant === 'compact') {
    return (
      <nav className="nav nav-compact" ref={navRef} aria-label={s('mainNav')}>
        <div className="wrap">
          <Link className="logo" href="/"><i />GOMP</Link>
          {catsMenu}
          {navLinks}
          <div className="right">
            {langSeg}
            {currencySeg}
            <Link href="/account">{s('account')}</Link>
            {cartLink}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <>
      <div className="topbar" ref={topRef}>
        <div className="wrap">
          <span className="left">{s('tagline')}</span>
          <div className="right">
            {langSeg}
            {currencySeg}
            <Link href="/account">{s('account')}</Link>
          </div>
        </div>
      </div>

      <header className="header" ref={headRef}>
        <div className="wrap">
          <Link className="logo" href="/"><i />GOMP</Link>
          <Link className="support" href="/contact">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="13" width="4" height="6" rx="1.5" /><rect x="17" y="13" width="4" height="6" rx="1.5" /><path d="M19 19c0 1.5-2 2.5-5 2.5" /></svg>
            <span><small>{s('personal')}</small><b>{s('support')}</b></span>
          </Link>
          <form className="search" role="search" onSubmit={(e) => { e.preventDefault(); onSearch(q, cat); }}>
            <input id="gomp-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={s('placeholder')} aria-label={s('searchLabel')} />
            <select id="gomp-qcat" value={cat} onChange={(e) => setCat(e.target.value)} aria-label={s('category')}>
              <option value="">{s('allClasses')}</option>
              {CAT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{pick(lang, o.label)}</option>)}
            </select>
            <button type="submit" aria-label={s('search')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
            </button>
          </form>
          {cartLink}
        </div>
      </header>

      <nav className="nav" ref={navRef} aria-label={s('mainNav')}>
        <div className="wrap">
          {catsMenu}
          {navLinks}
        </div>
      </nav>
    </>
  );
}
