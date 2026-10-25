'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Pc3DViewer } from '@/lib/pc3d';
import GompHeader, { type Currency } from './GompHeader';
import GompFooter from './GompFooter';
import { DEFAULT_HOME_BUILDS, EUR_RATE, type HomeBuild } from './home-data';
import './gomp-home.css';

const nf = (n: number) => Math.round(n).toLocaleString('sk-SK').replace(/\s/g, ' ');
const stars = (r: number) => '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));

function useCurrency() {
  const [cur, setCur] = useState<Currency>('czk');
  useEffect(() => {
    try { if (localStorage.getItem('gomp-cur') === 'eur') setCur('eur'); } catch { /* storage blocked */ }
  }, []);
  const set = (c: Currency) => { setCur(c); try { localStorage.setItem('gomp-cur', c); } catch { /* storage blocked */ } };
  const fmt = (czk: number) => (cur === 'czk' ? `${nf(czk)} Kč` : `≈ ${nf(czk / EUR_RATE)} €`);
  return { cur, set, fmt };
}

// Live, orbitable 3D model for the spotlight card. three.js is loaded on demand.
function Spot3D({ build }: { build: HomeBuild }) {
  const ref = useRef<HTMLDivElement>(null);
  const viewer = useRef<Pc3DViewer | null>(null);
  const [failed, setFailed] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    let alive = true;
    import('@/lib/pc3d')
      .then(({ createPc3DViewer }) => {
        if (!alive || !ref.current) return;
        viewer.current = createPc3DViewer(ref.current);
        viewer.current.show(build.p3);
      })
      .catch(() => setFailed(true));
    return () => { alive = false; viewer.current?.dispose(); viewer.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { viewer.current?.show(build.p3); }, [build]);

  if (failed) return <div className="v3d v3d-fallback" aria-hidden="true" />;
  return (
    <div className="v3d" ref={ref} role="img" aria-label={`3D náhľad zostavy ${build.id}`} onPointerDown={() => setTouched(true)}>
      {!touched && <div className="hint">Potiahni a otoč</div>}
    </div>
  );
}

// Static 3D thumbnails for cards and lists, rendered once in the browser.
function useSnapshots(builds: HomeBuild[]) {
  const [snaps, setSnaps] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      import('@/lib/pc3d')
        .then(({ renderPcSnapshots }) => {
          if (alive) setSnaps(renderPcSnapshots(builds.map((b) => ({ id: b.id, spec: b.p3 }))));
        })
        .catch(() => { /* keep placeholders */ });
    }, 80);
    return () => { alive = false; clearTimeout(t); };
  }, [builds]);
  return snaps;
}

const Snap = ({ src }: { src?: string }) =>
  // eslint-disable-next-line @next/next/no-img-element
  src ? <img className="snap" src={src} alt="" aria-hidden="true" /> : <span className="snap snap-ph" aria-hidden="true" />;

const SLIDES = [
  { bg: '/images/home/rgb-case.jpg', pos: '62% center' },
  { bg: '/images/home/red-case.jpg', pos: 'right center' },
  { bg: '/images/home/desk-chair.jpg', pos: '60% center' },
];

export default function GompHome({ builds = DEFAULT_HOME_BUILDS }: { builds?: HomeBuild[] }) {
  const { cur, set: setCur, fmt } = useCurrency();
  const [sel, setSel] = useState(0);
  const [slide, setSlide] = useState(0);
  const spotRef = useRef<HTMLDivElement>(null);
  const snaps = useSnapshots(builds);
  const b = builds[sel] ?? builds[0];

  const maxG = Math.max(...builds.map((x) => x.gpuPM ?? 0), 1);
  const maxC = Math.max(...builds.map((x) => x.cpuPM ?? 0), 1);
  const fromPrice = Math.min(...builds.map((x) => x.priceCzk));
  const flagship = builds.find((x) => x.tier === 'S') ?? builds[0];
  const budget = [...builds].sort((x, y) => x.priceCzk - y.priceCzk)[0];
  const perf = builds.find((x) => x.tier === 'A') ?? builds[1] ?? builds[0];

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, [slide]);

  const lists = useMemo(() => {
    const top = (fn: (a: HomeBuild, c: HomeBuild) => number) => [...builds].sort(fn).slice(0, 3);
    return [
      { title: 'Najlepšie hodnotené', items: top((a, c) => c.rating - a.rating), extra: (x: HomeBuild) => x.cls },
      { title: 'Najvýkonnejšie GPU', items: top((a, c) => (c.gpuPM ?? 0) - (a.gpuPM ?? 0)), extra: (x: HomeBuild) => (x.gpuPM ? `GPU ${nf(x.gpuPM)}` : x.cls) },
      { title: 'Najdostupnejšie', items: top((a, c) => a.priceCzk - c.priceCzk), extra: (x: HomeBuild) => x.cls },
    ];
  }, [builds]);

  function onSearch(q: string, cat: string) {
    const needle = q.trim().toLowerCase();
    const i = builds.findIndex((x) => (!cat || x.cat === cat) && (!needle || [x.id, x.gpu, x.cpu, x.tag, x.ram].join(' ').toLowerCase().includes(needle)));
    if (i > -1) { setSel(i); spotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }

  const specs: [string, string][] = [['GPU', b.gpu], ['CPU', b.cpu], ['RAM', b.ram], ['SSD', b.ssd], ...(b.cool ? ([['CHLADENIE', b.cool]] as [string, string][]) : [])];
  const bg = (url: string, pos?: string): CSSProperties => ({ backgroundImage: `url(${url})`, backgroundPosition: pos });

  return (
    <div className="gomp-home">
      <GompHeader currency={cur} onCurrency={setCur} active="/" onSearch={onSearch} cartTotal={fmt(0)} />

      <main className="wrap">
        {/* HERO */}
        <section className="hero">
          <div className="slider">
            <div className={`slide photo${slide === 0 ? ' on' : ''}`} style={bg(SLIDES[0].bg, SLIDES[0].pos)} role="img" aria-label="Herné PC s RGB ventilátormi">
              <div>
                <span className="eyebrow">Herné PC na mieru</span>
                <h1>Postav si svoju <em>Legendu.</em></h1>
                <p>Vysnený, ručne stavaný, testovaný, tvoj.</p>
                <div className="price">Ceny od <b className="num">{fmt(fromPrice)}</b></div>
                <div className="btns"><Link className="btn" href="/build">GOMP 3D Config</Link><Link className="btn ghost" href="/shop">Prebuilt zostavy</Link></div>
              </div>
            </div>
            <div className={`slide photo${slide === 1 ? ' on' : ''}`} style={bg(SLIDES[1].bg, SLIDES[1].pos)}>
              <div>
                <span className="pill">Záťažovo testované</span>
                <h1>Herné <em>monštrum</em></h1>
                <p><span className="mono">{flagship.id}</span> · {flagship.tag}.</p>
                <div className="price"><b className="num">{fmt(flagship.priceCzk)}</b> <span className="vat">vrátane DPH (21%)</span></div>
                <div className="btns"><Link className="btn" href={flagship.href}>Nakonfigurovať túto zostavu →</Link></div>
              </div>
            </div>
            <div className={`slide photo${slide === 2 ? ' on' : ''}`} style={bg(SLIDES[2].bg, SLIDES[2].pos)}>
              <div>
                <span className="pill">Každý CPU &amp; GPU undervolted</span>
                <h1>Chladnejší. <em>Tichší.</em> Rovnako rýchly.</h1>
                <p>Každý CPU a GPU podvoltujeme všade, kde to platforma umožňuje — nižšie teploty, tichšie ventilátory, nižšia spotreba, bez straty výkonu.</p>
                <div className="btns" style={{ marginTop: 26 }}><Link className="btn" href="/undervolting">Prečo undervolt? →</Link></div>
              </div>
            </div>
            <div className="dots">
              {SLIDES.map((_, i) => (
                <button key={i} type="button" aria-label={`Snímka ${i + 1}`} aria-current={slide === i} onClick={() => setSlide(i)} />
              ))}
            </div>
          </div>

          <div className="side">
            <Link className="banner photo" href={perf.href} style={bg('/images/home/banner-green.jpg')}>
              <div><small>{perf.cls} · {perf.tier}</small><h3>{perf.tag}</h3><span className="sub num">{perf.id} · {fmt(perf.priceCzk)}</span></div>
            </Link>
            <Link className="banner photo" href="/gbb" style={bg('/images/home/banner-purple.jpg')}>
              <div><small>Budget Builds</small><h3>Špička v <em>základnej</em> triede</h3><span className="sub num">{budget.id} · {fmt(budget.priceCzk)}</span></div>
            </Link>
            <Link className="banner photo" href="/customer-builds" style={bg('/images/home/desk-rgb.jpg')}>
              <div><small>Zákaznícke GOMPy</small><h3>Expedovaných zostáv <em>na mieru</em></h3><span className="sub">Pozri, čo si postavili iní →</span></div>
              <div className="big">20+</div>
            </Link>
          </div>
        </section>

        {/* FEATURES */}
        <section className="features" aria-label="Výhody">
          <div className="feature"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M20 4 7 9v10c0 8 5.6 14 13 17 7.4-3 13-9 13-17V9Z" /><path d="m14 20 4 4 8-9" /></svg><b>2-ročná záruka</b><span>Na všetky diely a prácu</span></div>
          <div className="feature"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M22 4 9 22h10l-2 14 14-19H21Z" /></svg><b>Undervolt ako štandard</b><span>Nižšie teploty a spotreba</span></div>
          <div className="feature"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="9" y="5" width="22" height="30" rx="2" /><path d="M14 13h12M14 19h12M14 25h7" /></svg><b>Otestované benchmarkmi</b><span>S tlačeným protokolom</span></div>
          <div className="feature"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="20" cy="14" r="6" /><path d="M8 35c1-7 6-11 12-11s11 4 12 11" /></svg><b>Osobný prístup</b><span>PC, ktoré naozaj potrebuješ</span></div>
          <div className="feature"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m20 5 4.5 9.2 10 1.4-7.3 7.1 1.8 10L20 28l-9 4.7 1.8-10-7.3-7.1 10-1.4Z" /></svg><b>★ 4.9 hodnotenie</b><span>100% spokojnosť zákazníkov</span></div>
        </section>

        {/* SPOTLIGHT */}
        <section>
          <div className="shead">
            <div><div className="eyebrow">Nakonfigurované pre vás</div><h2>Odporúčané zostavy</h2></div>
            <Link className="more" href="/shop">Všetky prebuilt GOMPy →</Link>
          </div>
          <div className="spot">
            <div className="spot-main" ref={spotRef}>
              <div className="scores">
                <div className="score tier"><b>{b.tier}</b></div><div className="score-l">Trieda</div>
                <div className="score"><b className="num">{b.rating}</b></div><div className="score-l">Hodnotenie</div>
              </div>
              <div className="spot-img"><Spot3D build={b} /></div>
              <div className="spot-info">
                <div className="eyebrow">{b.cls} · trieda {b.tier}</div>
                <h3 style={{ marginTop: 8 }}>{b.id}</h3>
                <div className="tag">{b.tag}</div>
                <div className="stars">{stars(b.rating)}<span>{b.rating} / 5</span></div>
                <div className="spot-price num">{fmt(b.priceCzk)}</div>
                <div className="vat">Cena vrátane DPH (21%)</div>
                <ul className="specs">{specs.map(([k, v]) => <li key={k}><span>{k}</span><span>{v}</span></li>)}</ul>
                <div className="bench">
                  {b.gpuPM ? <div><div className="bench-row"><span>GPU PassMark</span><b>{nf(b.gpuPM)}</b></div><div className="bar"><i style={{ width: `${(b.gpuPM / maxG) * 100}%` }} /></div></div> : null}
                  {b.cpuPM ? <div><div className="bench-row"><span>CPU PassMark</span><b>{nf(b.cpuPM)}</b></div><div className="bar cpu"><i style={{ width: `${(b.cpuPM / maxC) * 100}%` }} /></div></div> : null}
                </div>
                <Link className="btn" href={b.href}>Nakonfigurovať túto zostavu →</Link>
                <div className="pn">
                  <button type="button" onClick={() => setSel((sel + builds.length - 1) % builds.length)}>‹ Predošlá</button>
                  <span style={{ color: 'var(--line)' }}>|</span>
                  <button type="button" onClick={() => setSel((sel + 1) % builds.length)}>Ďalšia ›</button>
                </div>
              </div>
            </div>
            <div className="thumbs" aria-label="Vyber zostavu">
              {builds.map((x, i) => (
                <button key={x.id} type="button" className="thumb" aria-pressed={i === sel} onClick={() => setSel(i)}>
                  <Snap src={snaps[x.id]} />
                  <span><b>{x.id}</b><small className="num">{fmt(x.priceCzk)}</small></span>
                  <span className={`badge ${x.tier}`}>{x.tier}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* PROMOS */}
        <section className="promos">
          <div className="promo light">
            <div>
              <div className="eyebrow">Ceny od</div>
              <div className="from num">{fmt(fromPrice)}</div>
              <div className="vat">Cena vrátane DPH (21%)</div>
              <ul><li>Špička vo svojej cenovej kategórii.</li><li>Rozšíriteľná až po vlajkovú loď.</li></ul>
            </div>
          </div>
          <div className="promo dark photo" style={bg('/images/home/keyboard.jpg')}>
            <div className="eyebrow" style={{ color: 'var(--gold)' }}>GOMP 3D Config</div>
            <h3 style={{ marginTop: 10 }}>Vaša zostava. <em>Vaše pravidlá.</em></h3>
            <p>Poskladajte si svoju legendu sami v našom 3D konfigurátore a sledujte, ako sa každý komponent objaví v reálnom čase.</p>
            <div><Link className="btn btn-gold" href="/build">Otvoriť 3D konfigurátor →</Link></div>
          </div>
        </section>

        {/* LISTS */}
        <section className="lists">
          {lists.map((l) => (
            <div className="list" key={l.title}>
              <div className="shead"><h2>{l.title}</h2></div>
              {l.items.map((x) => (
                <div className="item" key={x.id}>
                  <Snap src={snaps[x.id]} />
                  <div>
                    <Link href={x.href}><b>{x.id}</b></Link>
                    <div className="stars">{stars(x.rating)}<span>{x.rating}</span></div>
                    <div className="p num">{fmt(x.priceCzk)}<small>{l.extra(x)}</small></div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>
      </main>

      {/* VALUES */}
      <section className="values">
        <div className="wrap">
          <div className="shead"><div><div className="eyebrow">Prečo GOMP</div><h2>Hodnoty GOMP</h2></div><span className="rated">★ 4.9 RATED</span></div>
          <div className="vgrid">
            <div className="v"><div className="n">01</div><h3>Osobný prístup</h3><p>Naším cieľom je predať každému zákazníkovi GOMP, ktorý nielen chce, ale aj potrebuje.</p></div>
            <div className="v"><div className="n">02</div><h3>2-ročná záruka</h3><p>Kompletné krytie všetkých dielov a práce. Bez zbytočných otázok a prieťahov.</p></div>
            <div className="v"><div className="n">03</div><h3>Otestované benchmarkmi</h3><p>Každý počítač expedujeme s tlačeným protokolom o výkonnostných testoch.</p></div>
            <div className="v"><div className="n">04</div><h3>Undervolt ako štandard</h3><p>Každý CPU a GPU podvoltujeme všade, kde to platforma umožňuje — nižšie teploty, tichšie ventilátory, nižšia spotreba, bez straty výkonu.</p></div>
          </div>
          <div className="stats">
            <div className="stat"><b>20+</b><span>Expedovaných zostáv na mieru</span></div>
            <div className="stat"><b>100%</b><span>Spokojnosť zákazníkov</span></div>
            <div className="stat"><b>2yr</b><span>Záruka na diely a prácu</span></div>
          </div>
        </div>
      </section>

      {/* BRANDS */}
      <section className="brands" aria-label="Komponenty v našich zostavách">
        <div className="wrap">
          <div className="eyebrow">Komponenty v našich zostavách</div>
          {['NVIDIA', 'AMD', 'INTEL', 'ASUS', 'MSI', 'GIGABYTE', 'CORSAIR', 'SAMSUNG', 'G.SKILL', 'NZXT'].map((n) => <span key={n}>{n}</span>)}
        </div>
      </section>

      <GompFooter />
    </div>
  );
}
