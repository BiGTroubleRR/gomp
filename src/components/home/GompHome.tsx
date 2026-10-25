'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import TransitionLink from '@/components/TransitionLink';
import { useSite } from '@/contexts/SiteContext';
import { applyVat } from '@/lib/component-db-seed';
import { pick } from '@/lib/i18n';
import type { Pc3DSpec, Pc3DViewer } from '@/lib/pc3d';
import { guessPc3DSpec } from './home-data';
import { MIN_CONFIG_NET_CZK, useHomeBuilds, type HomeBuild, type L3 } from './home-shared';
import './gomp-home.css';

type Card = HomeBuild & { p3: Pc3DSpec };

const nf = (n: number) => Math.round(n).toLocaleString('sk-SK').replace(/\s/g, ' ');
const stars = (r: number) => '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));

// Headline text with one highlighted (<em>) word in the middle: [before, highlighted, after].
type L3Hl = { en: [string, string, string]; sk: [string, string, string]; cz: [string, string, string] };

const T = {
  heroEyebrow: { en: 'Custom gaming PCs', sk: 'Herné PC na mieru', cz: 'Herní PC na míru' },
  heroTitle: { en: ['Build your ', 'Legend.', ''], sk: ['Postav si svoju ', 'Legendu.', ''], cz: ['Postav si svou ', 'Legendu.', ''] } as L3Hl,
  heroSub: { en: 'Dreamed up, hand-built, tested, yours.', sk: 'Vysnený, ručne stavaný, testovaný, tvoj.', cz: 'Vysněný, ručně stavěný, testovaný, tvůj.' },
  pricesFrom: { en: 'Prices from', sk: 'Ceny od', cz: 'Ceny od' },
  cfg3d: { en: 'GOMP 3D Config', sk: 'GOMP 3D Config', cz: 'GOMP 3D Config' },
  prebuilt: { en: 'Prebuilt builds', sk: 'Prebuilt zostavy', cz: 'Prebuilt sestavy' },
  heroAlt: { en: 'Gaming PC with RGB fans', sk: 'Herné PC s RGB ventilátormi', cz: 'Herní PC s RGB ventilátory' },
  stress: { en: 'Stress-tested', sk: 'Záťažovo testované', cz: 'Zátěžově testované' },
  monster: { en: ['Gaming ', 'beast', ''], sk: ['Herné ', 'monštrum', ''], cz: ['Herní ', 'monstrum', ''] } as L3Hl,
  inclVat: { en: 'incl. VAT', sk: 'vrátane DPH', cz: 'včetně DPH' },
  configureThis: { en: 'Configure this build →', sk: 'Nakonfigurovať túto zostavu →', cz: 'Nakonfigurovat tuto sestavu →' },
  uvPill: { en: 'Every CPU & GPU undervolted', sk: 'Každý CPU & GPU undervolted', cz: 'Každý CPU & GPU undervolted' },
  uvTitle: { en: ['Cooler. ', 'Quieter.', ' Just as fast.'], sk: ['Chladnejší. ', 'Tichší.', ' Rovnako rýchly.'], cz: ['Chladnější. ', 'Tišší.', ' Stejně rychlý.'] } as L3Hl,
  uvText: {
    en: 'We undervolt every CPU and GPU wherever the platform allows it — lower temperatures, quieter fans, lower power draw, no loss of performance.',
    sk: 'Každý CPU a GPU podvoltujeme všade, kde to platforma umožňuje — nižšie teploty, tichšie ventilátory, nižšia spotreba, bez straty výkonu.',
    cz: 'Každý CPU a GPU podvoltujeme všude, kde to platforma umožňuje — nižší teploty, tišší ventilátory, nižší spotřeba, bez ztráty výkonu.',
  },
  whyUv: { en: 'Why undervolt? →', sk: 'Prečo undervolt? →', cz: 'Proč undervolt? →' },
  slide: { en: 'Slide', sk: 'Snímka', cz: 'Snímek' },
  customerBuilds: { en: 'Customer GOMPs', sk: 'Zákaznícke GOMPy', cz: 'Zákaznické GOMPy' },
  shipped: { en: ['Custom builds ', 'shipped', ''], sk: ['Expedovaných zostáv ', 'na mieru', ''], cz: ['Expedovaných sestav ', 'na míru', ''] } as L3Hl,
  seeOthers: { en: 'See what others built →', sk: 'Pozri, čo si postavili iní →', cz: 'Podívej se, co si postavili jiní →' },
  budgetTitle: { en: ['Top pick in the ', 'entry', ' class'], sk: ['Špička v ', 'základnej', ' triede'], cz: ['Špička v ', 'základní', ' třídě'] } as L3Hl,

  featuresLabel: { en: 'Benefits', sk: 'Výhody', cz: 'Výhody' },
  fWarranty: { en: '2-year warranty', sk: '2-ročná záruka', cz: '2letá záruka' },
  fWarrantySub: { en: 'On all parts and labour', sk: 'Na všetky diely a prácu', cz: 'Na všechny díly a práci' },
  fUv: { en: 'Undervolt as standard', sk: 'Undervolt ako štandard', cz: 'Undervolt jako standard' },
  fUvSub: { en: 'Lower temperatures and power draw', sk: 'Nižšie teploty a spotreba', cz: 'Nižší teploty a spotřeba' },
  fBench: { en: 'Benchmark-tested', sk: 'Otestované benchmarkmi', cz: 'Otestováno benchmarky' },
  fBenchSub: { en: 'With a printed report', sk: 'S tlačeným protokolom', cz: 'S tištěným protokolem' },
  fPersonal: { en: 'Personal service', sk: 'Osobný prístup', cz: 'Osobní přístup' },
  fPersonalSub: { en: 'The PC you actually need', sk: 'PC, ktoré naozaj potrebuješ', cz: 'PC, které opravdu potřebuješ' },
  fRated: { en: 'rating', sk: 'hodnotenie', cz: 'hodnocení' },
  fRatedSub: { en: '100% customer satisfaction', sk: '100% spokojnosť zákazníkov', cz: '100% spokojenost zákazníků' },

  spotEyebrow: { en: 'Configured for you', sk: 'Nakonfigurované pre vás', cz: 'Nakonfigurováno pro vás' },
  spotTitle: { en: 'Featured builds', sk: 'Odporúčané zostavy', cz: 'Doporučené sestavy' },
  allPrebuilt: { en: 'All prebuilt GOMPs →', sk: 'Všetky prebuilt GOMPy →', cz: 'Všechny prebuilt GOMPy →' },
  tier: { en: 'Class', sk: 'Trieda', cz: 'Třída' },
  tierLower: { en: 'class', sk: 'trieda', cz: 'třída' },
  rating: { en: 'Rating', sk: 'Hodnotenie', cz: 'Hodnocení' },
  priceIncl: { en: 'Price incl. VAT', sk: 'Cena vrátane DPH', cz: 'Cena včetně DPH' },
  cooling: { en: 'COOLING', sk: 'CHLADENIE', cz: 'CHLAZENÍ' },
  prev: { en: '‹ Previous', sk: '‹ Predošlá', cz: '‹ Předchozí' },
  next: { en: 'Next ›', sk: 'Ďalšia ›', cz: 'Další ›' },
  pickBuild: { en: 'Pick a build', sk: 'Vyber zostavu', cz: 'Vyber sestavu' },
  preview3d: { en: '3D preview of build', sk: '3D náhľad zostavy', cz: '3D náhled sestavy' },
  dragHint: { en: 'Drag to rotate', sk: 'Potiahni a otoč', cz: 'Přetáhni a otoč' },

  promoBullet1: { en: 'Top of its price class.', sk: 'Špička vo svojej cenovej kategórii.', cz: 'Špička ve své cenové kategorii.' },
  promoBullet2: { en: 'Upgradeable all the way to flagship.', sk: 'Rozšíriteľná až po vlajkovú loď.', cz: 'Rozšiřitelná až po vlajkovou loď.' },
  promoTitle: { en: ['Your build. ', 'Your rules.', ''], sk: ['Vaša zostava. ', 'Vaše pravidlá.', ''], cz: ['Vaše sestava. ', 'Vaše pravidla.', ''] } as L3Hl,
  promoText: {
    en: 'Put your legend together yourself in our 3D configurator and watch every component appear in real time.',
    sk: 'Poskladajte si svoju legendu sami v našom 3D konfigurátore a sledujte, ako sa každý komponent objaví v reálnom čase.',
    cz: 'Poskládejte si svou legendu sami v našem 3D konfigurátoru a sledujte, jak se každá komponenta objeví v reálném čase.',
  },
  promoBtn: { en: 'Open the 3D configurator →', sk: 'Otvoriť 3D konfigurátor →', cz: 'Otevřít 3D konfigurátor →' },

  listTop: { en: 'Top rated', sk: 'Najlepšie hodnotené', cz: 'Nejlépe hodnocené' },
  listGpu: { en: 'Most powerful GPUs', sk: 'Najvýkonnejšie GPU', cz: 'Nejvýkonnější GPU' },
  listCheap: { en: 'Most affordable', sk: 'Najdostupnejšie', cz: 'Nejdostupnější' },

  whyEyebrow: { en: 'Why GOMP', sk: 'Prečo GOMP', cz: 'Proč GOMP' },
  whyTitle: { en: 'GOMP values', sk: 'Hodnoty GOMP', cz: 'Hodnoty GOMP' },
  v1Text: {
    en: "Our aim is to sell every customer a GOMP they don't just want but actually need.",
    sk: 'Naším cieľom je predať každému zákazníkovi GOMP, ktorý nielen chce, ale aj potrebuje.',
    cz: 'Naším cílem je prodat každému zákazníkovi GOMP, který nejen chce, ale také potřebuje.',
  },
  v2Text: {
    en: 'Full coverage of all parts and labour. No needless questions or delays.',
    sk: 'Kompletné krytie všetkých dielov a práce. Bez zbytočných otázok a prieťahov.',
    cz: 'Kompletní krytí všech dílů a práce. Bez zbytečných otázek a průtahů.',
  },
  v3Text: {
    en: 'Every PC ships with a printed performance-test report.',
    sk: 'Každý počítač expedujeme s tlačeným protokolom o výkonnostných testoch.',
    cz: 'Každý počítač expedujeme s tištěným protokolem o výkonnostních testech.',
  },
  statBuilds: { en: 'Custom builds shipped', sk: 'Expedovaných zostáv na mieru', cz: 'Expedovaných sestav na míru' },
  statHappy: { en: 'Customer satisfaction', sk: 'Spokojnosť zákazníkov', cz: 'Spokojenost zákazníků' },
  statWarranty: { en: 'Warranty on parts and labour', sk: 'Záruka na diely a prácu', cz: 'Záruka na díly a práci' },
  brands: { en: 'Components in our builds', sk: 'Komponenty v našich zostavách', cz: 'Komponenty v našich sestavách' },
} satisfies Record<string, L3 | L3Hl>;

const em = (v: [string, string, string]): ReactNode => (
  <>
    {v[0]}
    <em>{v[1]}</em>
    {v[2]}
  </>
);

// Live, orbitable 3D model for the spotlight card. three.js is loaded on demand.
function Spot3D({ build, label, hint }: { build: Card; label: string; hint: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const viewer = useRef<Pc3DViewer | null>(null);
  const [failed, setFailed] = useState(false);
  const [touched, setTouched] = useState(false);
  // Stable identity per distinct spec: switching language/currency rebuilds the build objects, which must
  // not make the viewer re-show (and restart) the same model.
  const specKey = JSON.stringify(build.p3);
  const spec = useMemo(() => JSON.parse(specKey) as Pc3DSpec, [specKey]);

  useEffect(() => {
    let alive = true;
    import('@/lib/pc3d')
      .then(({ createPc3DViewer }) => {
        if (!alive || !ref.current) return;
        viewer.current = createPc3DViewer(ref.current);
        viewer.current.show(spec);
      })
      .catch(() => setFailed(true));
    return () => {
      alive = false;
      viewer.current?.dispose();
      viewer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    viewer.current?.show(spec);
  }, [spec]);

  if (failed) return <div className="v3d v3d-fallback" aria-hidden="true" />;
  return (
    <div className="v3d" ref={ref} role="img" aria-label={`${label} ${build.name}`} onPointerDown={() => setTouched(true)}>
      {!touched && <div className="hint">{hint}</div>}
    </div>
  );
}

// Static 3D thumbnails for cards and lists, rendered once in the browser. Keyed on the specs themselves,
// so switching language/currency (which rebuilds the build objects) doesn't re-render every thumbnail.
function useSnapshots(cards: Card[]) {
  const [snaps, setSnaps] = useState<Record<string, string>>({});
  const key = cards.map((c) => c.id + JSON.stringify(c.p3)).join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items = useMemo(() => cards.map((c) => ({ id: c.id, spec: c.p3 })), [key]);
  useEffect(() => {
    if (!items.length) return;
    let alive = true;
    const t = setTimeout(() => {
      import('@/lib/pc3d')
        .then(({ renderPcSnapshots }) => {
          if (alive) setSnaps(renderPcSnapshots(items));
        })
        .catch(() => {
          /* keep placeholders */
        });
    }, 80);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [items]);
  return snaps;
}

const Snap = ({ src }: { src?: string }) =>
  // eslint-disable-next-line @next/next/no-img-element
  src ? <img className="snap" src={src} alt="" aria-hidden="true" /> : <span className="snap snap-ph" aria-hidden="true" />;

type SlideKey = 'hero' | 'flagship' | 'undervolt';
const SLIDE_BG: Record<SlideKey, { bg: string; pos: string }> = {
  hero: { bg: '/images/home/rgb-case.jpg', pos: '62% center' },
  flagship: { bg: '/images/home/red-case.jpg', pos: 'right center' },
  undervolt: { bg: '/images/home/desk-chair.jpg', pos: '60% center' },
};

const bg = (url: string, pos?: string): CSSProperties => ({ backgroundImage: `url(${url})`, backgroundPosition: pos });

// The homepage body (the shared SiteNav / SiteFooter are rendered by the page). All build data is live:
// prebuilt_pcs + the component catalog, via useHomeBuilds. Sections that need builds appear once they load.
export default function GompHome({ onStartBuilding }: { onStartBuilding: () => void }) {
  const { lang, fmt, vatRatePct } = useSite();
  const { builds, avgRating } = useHomeBuilds();
  const s = (k: keyof typeof T) => pick(lang, T[k] as L3);
  const h = (k: keyof typeof T) => pick(lang, T[k] as L3Hl);

  const cards = useMemo<Card[]>(
    () => builds.map((b) => ({ ...b, p3: guessPc3DSpec({ gpu: b.gpu, cooler: b.cooler, ram: b.ram, case: b.caseName }) })),
    [builds],
  );
  const snaps = useSnapshots(cards);
  const [sel, setSel] = useState(0);
  const [slide, setSlide] = useState(0);
  const spotRef = useRef<HTMLDivElement>(null);

  const ready = cards.length > 0;
  const b = cards[sel] ?? cards[0];
  const byPrice = useMemo(() => [...cards].sort((x, y) => x.priceCzk - y.priceCzk), [cards]);
  const budget = byPrice[0];
  const flagship = cards.find((x) => x.cat === 'flagship') ?? byPrice[byPrice.length - 1];
  const perf = cards.find((x) => x.cat === 'performance') ?? cards[1] ?? cards[0];
  const maxG = Math.max(...cards.map((x) => x.gpuPm?.score ?? 0), 1);
  const maxC = Math.max(...cards.map((x) => x.cpuPm?.score ?? 0), 1);
  // The configurator's cheapest configuration — the same "Ceny od" figure the rest of the site quotes.
  const fromPrice = applyVat(MIN_CONFIG_NET_CZK, vatRatePct);
  const vat = `${s('inclVat')} (${vatRatePct}%)`;
  const rated = avgRating.toFixed(1);

  const slides = useMemo<SlideKey[]>(() => (flagship ? ['hero', 'flagship', 'undervolt'] : ['hero', 'undervolt']), [flagship]);
  const cur = slide % slides.length;
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => setSlide((x) => x + 1), 6000);
    return () => clearInterval(timer);
  }, [slide]);
  const on = (k: SlideKey) => (slides[cur] === k ? ' on' : '');

  const lists = useMemo(() => {
    const top = (fn: (a: Card, c: Card) => number) => [...cards].sort(fn).slice(0, 3);
    return [
      { title: s('listTop'), items: top((a, c) => c.rating - a.rating), extra: (x: Card) => pick(lang, x.catLabel) },
      { title: s('listGpu'), items: top((a, c) => (c.gpuPm?.score ?? 0) - (a.gpuPm?.score ?? 0)), extra: (x: Card) => (x.gpuPm ? `GPU ${nf(x.gpuPm.score)}` : pick(lang, x.catLabel)) },
      { title: s('listCheap'), items: top((a, c) => a.priceCzk - c.priceCzk), extra: (x: Card) => pick(lang, x.catLabel) },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, lang]);

  const buildBtn = (label: string, extra = '') => (
    <button type="button" className={`btn${extra}`} onClick={onStartBuilding}>
      {label}
    </button>
  );

  const specs: [string, string][] = b
    ? [['GPU', b.gpu], ['CPU', b.cpu], ['RAM', b.ram], ['SSD', b.storage], ...(b.cooler ? ([[s('cooling'), b.cooler]] as [string, string][]) : [])]
    : [];

  return (
    <div className="gomp-home">
      <div className="wrap">
        {/* HERO */}
        <section className="hero">
          <div className="slider">
            <div className={`slide photo${on('hero')}`} style={bg(SLIDE_BG.hero.bg, SLIDE_BG.hero.pos)} role="img" aria-label={s('heroAlt')}>
              <div>
                <span className="eyebrow">{s('heroEyebrow')}</span>
                <h1>{em(h('heroTitle'))}</h1>
                <p>{s('heroSub')}</p>
                <div className="price">
                  {s('pricesFrom')} <b className="num">{fmt(fromPrice)}</b>
                </div>
                <div className="btns">
                  {buildBtn(s('cfg3d'))}
                  <TransitionLink className="btn ghost" href="/shop">
                    {s('prebuilt')}
                  </TransitionLink>
                </div>
              </div>
            </div>
            {flagship && (
              <div className={`slide photo${on('flagship')}`} style={bg(SLIDE_BG.flagship.bg, SLIDE_BG.flagship.pos)}>
                <div>
                  <span className="pill">{s('stress')}</span>
                  <h1>{em(h('monster'))}</h1>
                  <p>
                    <span className="mono">{flagship.name}</span> · {flagship.tagline}.
                  </p>
                  <div className="price">
                    <b className="num">{fmt(flagship.priceCzk)}</b> <span className="vat">{vat}</span>
                  </div>
                  <div className="btns">
                    <TransitionLink className="btn" href={flagship.href}>
                      {s('configureThis')}
                    </TransitionLink>
                  </div>
                </div>
              </div>
            )}
            <div className={`slide photo${on('undervolt')}`} style={bg(SLIDE_BG.undervolt.bg, SLIDE_BG.undervolt.pos)}>
              <div>
                <span className="pill">{s('uvPill')}</span>
                <h1>{em(h('uvTitle'))}</h1>
                <p>{s('uvText')}</p>
                <div className="btns" style={{ marginTop: 26 }}>
                  <TransitionLink className="btn" href="/undervolting">
                    {s('whyUv')}
                  </TransitionLink>
                </div>
              </div>
            </div>
            <div className="dots">
              {slides.map((k, i) => (
                <button key={k} type="button" aria-label={`${s('slide')} ${i + 1}`} aria-current={cur === i} onClick={() => setSlide(i)} />
              ))}
            </div>
          </div>

          <div className="side">
            {perf && (
              <TransitionLink className="banner photo" href={perf.href} style={bg('/images/home/banner-green.jpg')}>
                <div>
                  <small>
                    {pick(lang, perf.catLabel)} · {perf.tier ?? '—'}
                  </small>
                  <h3>{perf.tagline}</h3>
                  <span className="sub num">
                    {perf.name} · {fmt(perf.priceCzk)}
                  </span>
                </div>
              </TransitionLink>
            )}
            {budget && (
              <TransitionLink className="banner photo" href="/gbb" style={bg('/images/home/banner-purple.jpg')}>
                <div>
                  <small>Budget Builds</small>
                  <h3>{em(h('budgetTitle'))}</h3>
                  <span className="sub num">
                    {budget.name} · {fmt(budget.priceCzk)}
                  </span>
                </div>
              </TransitionLink>
            )}
            <TransitionLink className="banner photo" href="/customer-builds" style={bg('/images/home/desk-rgb.jpg')}>
              <div>
                <small>{s('customerBuilds')}</small>
                <h3>{em(h('shipped'))}</h3>
                <span className="sub">{s('seeOthers')}</span>
              </div>
              <div className="big">20+</div>
            </TransitionLink>
          </div>
        </section>

        {/* FEATURES */}
        <section className="features" aria-label={s('featuresLabel')}>
          <div className="feature">
            <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M20 4 7 9v10c0 8 5.6 14 13 17 7.4-3 13-9 13-17V9Z" /><path d="m14 20 4 4 8-9" /></svg>
            <b>{s('fWarranty')}</b>
            <span>{s('fWarrantySub')}</span>
          </div>
          <div className="feature">
            <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M22 4 9 22h10l-2 14 14-19H21Z" /></svg>
            <b>{s('fUv')}</b>
            <span>{s('fUvSub')}</span>
          </div>
          <div className="feature">
            <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="9" y="5" width="22" height="30" rx="2" /><path d="M14 13h12M14 19h12M14 25h7" /></svg>
            <b>{s('fBench')}</b>
            <span>{s('fBenchSub')}</span>
          </div>
          <div className="feature">
            <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="20" cy="14" r="6" /><path d="M8 35c1-7 6-11 12-11s11 4 12 11" /></svg>
            <b>{s('fPersonal')}</b>
            <span>{s('fPersonalSub')}</span>
          </div>
          <div className="feature">
            <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m20 5 4.5 9.2 10 1.4-7.3 7.1 1.8 10L20 28l-9 4.7 1.8-10-7.3-7.1 10-1.4Z" /></svg>
            <b>
              ★ {rated} {s('fRated')}
            </b>
            <span>{s('fRatedSub')}</span>
          </div>
        </section>

        {/* SPOTLIGHT */}
        {ready && b && (
          <section>
            <div className="shead">
              <div>
                <div className="eyebrow">{s('spotEyebrow')}</div>
                <h2>{s('spotTitle')}</h2>
              </div>
              <TransitionLink className="more" href="/shop">
                {s('allPrebuilt')}
              </TransitionLink>
            </div>
            <div className="spot">
              <div className="spot-main" ref={spotRef}>
                <div className="scores">
                  <div className="score tier">
                    <b>{b.tier ?? '—'}</b>
                  </div>
                  <div className="score-l">{s('tier')}</div>
                  <div className="score">
                    <b className="num">{b.rating.toFixed(1)}</b>
                  </div>
                  <div className="score-l">{s('rating')}</div>
                </div>
                <div className="spot-img">
                  <Spot3D build={b} label={s('preview3d')} hint={s('dragHint')} />
                </div>
                <div className="spot-info">
                  <div className="eyebrow">
                    {pick(lang, b.catLabel)} · {s('tierLower')} {b.tier ?? '—'}
                  </div>
                  <h3 style={{ marginTop: 8 }}>{b.name}</h3>
                  <div className="tag">{b.tagline}</div>
                  <div className="stars">
                    {stars(b.rating)}
                    <span>{b.rating.toFixed(1)} / 5</span>
                  </div>
                  <div className="spot-price num">{fmt(b.priceCzk)}</div>
                  <div className="vat">
                    {s('priceIncl')} ({vatRatePct}%)
                  </div>
                  <ul className="specs">
                    {specs.map(([k, v]) => (
                      <li key={k}>
                        <span>{k}</span>
                        <span>{v}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="bench">
                    {b.gpuPm ? (
                      <div>
                        <div className="bench-row">
                          <span>GPU PassMark</span>
                          <b>{nf(b.gpuPm.score)}</b>
                        </div>
                        <div className="bar">
                          <i style={{ width: `${(b.gpuPm.score / maxG) * 100}%` }} />
                        </div>
                      </div>
                    ) : null}
                    {b.cpuPm ? (
                      <div>
                        <div className="bench-row">
                          <span>CPU PassMark</span>
                          <b>{nf(b.cpuPm.score)}</b>
                        </div>
                        <div className="bar cpu">
                          <i style={{ width: `${(b.cpuPm.score / maxC) * 100}%` }} />
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <TransitionLink className="btn" href={b.href}>
                    {s('configureThis')}
                  </TransitionLink>
                  <div className="pn">
                    <button type="button" onClick={() => setSel((sel + cards.length - 1) % cards.length)}>
                      {s('prev')}
                    </button>
                    <span style={{ color: 'var(--line)' }}>|</span>
                    <button type="button" onClick={() => setSel((sel + 1) % cards.length)}>
                      {s('next')}
                    </button>
                  </div>
                </div>
              </div>
              <div className="thumbs" aria-label={s('pickBuild')}>
                {cards.map((x, i) => (
                  <button key={x.id} type="button" className="thumb" aria-pressed={i === sel} onClick={() => setSel(i)}>
                    <Snap src={snaps[x.id]} />
                    <span>
                      <b>{x.name}</b>
                      <small className="num">{fmt(x.priceCzk)}</small>
                    </span>
                    <span className={`badge ${x.tier ?? 'B'}`}>{x.tier ?? '—'}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* PROMOS */}
        <section className="promos">
          <div className="promo light">
            <div>
              <div className="eyebrow">{s('pricesFrom')}</div>
              <div className="from num">{fmt(fromPrice)}</div>
              <div className="vat">{s('priceIncl')} ({vatRatePct}%)</div>
              <ul>
                <li>{s('promoBullet1')}</li>
                <li>{s('promoBullet2')}</li>
              </ul>
            </div>
          </div>
          <div className="promo dark photo" style={bg('/images/home/keyboard.jpg')}>
            <div className="eyebrow" style={{ color: 'var(--gold)' }}>
              {s('cfg3d')}
            </div>
            <h3 style={{ marginTop: 10 }}>{em(h('promoTitle'))}</h3>
            <p>{s('promoText')}</p>
            <div>{buildBtn(s('promoBtn'), ' btn-gold')}</div>
          </div>
        </section>

        {/* LISTS */}
        {ready && (
          <section className="lists">
            {lists.map((l) => (
              <div className="list" key={l.title}>
                <div className="shead">
                  <h2>{l.title}</h2>
                </div>
                {l.items.map((x) => (
                  <div className="item" key={x.id}>
                    <Snap src={snaps[x.id]} />
                    <div>
                      <TransitionLink href={x.href}>
                        <b>{x.name}</b>
                      </TransitionLink>
                      <div className="stars">
                        {stars(x.rating)}
                        <span>{x.rating.toFixed(1)}</span>
                      </div>
                      <div className="p num">
                        {fmt(x.priceCzk)}
                        <small>{l.extra(x)}</small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </section>
        )}
      </div>

      {/* VALUES */}
      <section className="values">
        <div className="wrap">
          <div className="shead">
            <div>
              <div className="eyebrow">{s('whyEyebrow')}</div>
              <h2>{s('whyTitle')}</h2>
            </div>
            <span className="rated">★ {rated} RATED</span>
          </div>
          <div className="vgrid">
            <div className="v"><div className="n">01</div><h3>{s('fPersonal')}</h3><p>{s('v1Text')}</p></div>
            <div className="v"><div className="n">02</div><h3>{s('fWarranty')}</h3><p>{s('v2Text')}</p></div>
            <div className="v"><div className="n">03</div><h3>{s('fBench')}</h3><p>{s('v3Text')}</p></div>
            <div className="v"><div className="n">04</div><h3>{s('fUv')}</h3><p>{s('uvText')}</p></div>
          </div>
          <div className="stats">
            <div className="stat"><b>20+</b><span>{s('statBuilds')}</span></div>
            <div className="stat"><b>100%</b><span>{s('statHappy')}</span></div>
            <div className="stat"><b>2yr</b><span>{s('statWarranty')}</span></div>
          </div>
        </div>
      </section>

      {/* BRANDS */}
      <section className="brands" aria-label={s('brands')}>
        <div className="wrap">
          <div className="eyebrow">{s('brands')}</div>
          {['NVIDIA', 'AMD', 'INTEL', 'ASUS', 'MSI', 'GIGABYTE', 'CORSAIR', 'SAMSUNG', 'G.SKILL', 'NZXT'].map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
      </section>
    </div>
  );
}
