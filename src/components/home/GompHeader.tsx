'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export type Currency = 'czk' | 'eur';

const NAV = [
  { href: '/', label: 'Domov' },
  { href: '/shop', label: 'Obchod' },
  { href: '/build', label: 'Zostaviť' },
  { href: '/customer-builds', label: 'Zákaznícke GOMPy' },
  { href: '/undervolting', label: 'Prečo undervolt?' },
  { href: '/about', label: 'O nás' },
];

const CATS = [
  { href: '/shop', label: 'Vlajkové', tag: 'S' },
  { href: '/shop', label: 'Výkonné', tag: 'A' },
  { href: '/shop', label: 'Stredná trieda', tag: 'B' },
  { href: '/shop', label: 'Základné', tag: 'B–D' },
  { href: '/gbb', label: 'Budget Builds', tag: '→' },
  { href: '/build', label: 'Vlastná konfigurácia', tag: '3D' },
];

type Props = {
  currency: Currency;
  onCurrency: (c: Currency) => void;
  active?: string; // current path, for aria-current
  cartCount?: number;
  cartTotal?: string;
  onSearch?: (query: string, category: string) => void;
};

export default function GompHeader({ currency, onCurrency, active = '/', cartCount = 0, cartTotal = '0 Kč', onSearch }: Props) {
  const [catsOpen, setCatsOpen] = useState(false);
  const [lang, setLang] = useState('SK');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const catsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!catsOpen) return;
    const close = (e: MouseEvent) => { if (!catsRef.current?.contains(e.target as Node)) setCatsOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [catsOpen]);

  return (
    <>
      <div className="topbar">
        <div className="wrap">
          <span className="left">Ručne stavané herné PC · Praha, ČR</span>
          <div className="right">
            <div className="seg" role="group" aria-label="Jazyk">
              {['SK', 'CZ', 'EN'].map((l) => (
                <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>{l}</button>
              ))}
            </div>
            <div className="seg" role="group" aria-label="Mena">
              <button type="button" aria-pressed={currency === 'czk'} onClick={() => onCurrency('czk')}>Kč</button>
              <button type="button" aria-pressed={currency === 'eur'} onClick={() => onCurrency('eur')}>€</button>
            </div>
            <Link href="/account">Účet</Link>
          </div>
        </div>
      </div>

      <header className="header">
        <div className="wrap">
          <Link className="logo" href="/"><i />GOMP</Link>
          <Link className="support" href="/contact">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="13" width="4" height="6" rx="1.5" /><rect x="17" y="13" width="4" height="6" rx="1.5" /><path d="M19 19c0 1.5-2 2.5-5 2.5" /></svg>
            <span><small>Osobný prístup</small><b>Kontakt a podpora</b></span>
          </Link>
          <form className="search" role="search" onSubmit={(e) => { e.preventDefault(); onSearch?.(q, cat); }}>
            <input id="gomp-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hľadám zostavu… (napr. RTX 5070)" aria-label="Hľadať zostavu" />
            <select id="gomp-qcat" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Kategória">
              <option value="">Všetky triedy</option>
              <option>Vlajkové</option>
              <option>Výkonné</option>
              <option>Stredná trieda</option>
              <option>Základné</option>
            </select>
            <button type="submit" aria-label="Hľadať">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
            </button>
          </form>
          <Link className="cart" href="/checkout">
            <span className="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 4h2l2.4 11h11l2-8H6.2" /><circle cx="9" cy="19.5" r="1.3" /><circle cx="17" cy="19.5" r="1.3" /></svg></span>
            <span><small>{cartCount} položiek</small><b className="num">{cartTotal}</b></span>
          </Link>
        </div>
      </header>

      <nav className="nav" aria-label="Hlavná navigácia">
        <div className="wrap">
          <div className="cats" ref={catsRef}>
            <button type="button" aria-expanded={catsOpen} aria-controls="gomp-cats" onClick={() => setCatsOpen((v) => !v)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
              <span className="t">Kategórie</span>
            </button>
            <ul id="gomp-cats" hidden={!catsOpen}>
              {CATS.map((c) => (
                <li key={c.label}><Link href={c.href}>{c.label} <span>{c.tag}</span></Link></li>
              ))}
            </ul>
          </div>
          <div className="links">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={active === n.href ? 'page' : undefined}>{n.label}</Link>
            ))}
            <Link className="hl" href="/gbb">Budget Builds</Link>
          </div>
        </div>
      </nav>
    </>
  );
}
