'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSite } from '@/contexts/SiteContext';
import TransitionLink from '@/components/TransitionLink';
import SiteNav from '@/components/SiteNav';
import { navigateWithTransition } from '@/lib/gomp-nav';
import { readJSON, writeJSON } from '@/lib/gomp-storage';
import { passmarkLookup, tierFromPassmark, TIER_COLORS, type Tier } from '@/lib/passmark';
import { defaultComponentDb, type Category, type Component, type ComponentDb } from '@/lib/component-db-seed';
import { createBuildScene, SLOTS, CASE_SIZES, type BuildScene, type CompId } from '@/lib/build-scene';
import { useIsMobile } from '@/lib/use-media-query';

const T = {
  en: {
    nav_home: 'Home', nav_shop: 'Shop', nav_build: 'Build', nav_about: 'About', nav_account: 'Account',
    pc_builder: 'PC Builder', select_components: 'Select components to add', build_complete: 'Build Complete PC',
    clear_all: 'Clear All', drag_to_orbit: 'Drag to orbit  ·  Scroll to zoom', hide_panel: 'Hide Side Panel',
    show_panel: 'Show Side Panel', complete: 'Complete', your_build: 'Your Build', selected_part: 'Selected Part',
    build_total: 'Build Total', passmark_score: 'PassMark Score', verify_passmark: 'Verify on PassMark ↗',
    continue_benchmarks: 'Continue to Benchmarks →', save_build: 'Save Build', preparing_order: 'Booting up your legend...',
    no_components: '(no components — add in Admin)', none_add_admin: '(none — add in Admin)',
    cat_names: { mobo: 'Motherboard', cpu: 'CPU', cooler: 'CPU Cooler', ram: 'RAM', gpu: 'GPU', storage: 'Storage', psu: 'PSU', case: 'Case' },
    cat_desc: {
      mobo: 'The foundation of your build — defines CPU compatibility, expansion options, and overclocking potential.',
      cpu: 'The brain of your system, handling all compute tasks from gaming to content creation.',
      cooler: 'Keeps your CPU running cool and quiet under sustained load.',
      ram: 'High-speed memory for snappy multitasking and improved frame rates.',
      gpu: 'Drives your gaming visuals and accelerates creative workloads.',
      storage: 'Fast NVMe storage for quick boot times and near-instant load times.',
      psu: 'Stable, efficient power delivery for your entire system.',
      case: 'The enclosure that defines your form factor, airflow, and aesthetics — and scales the 3D preview live.',
    },
    case_cats: [
      { id: 'Full Tower', label: 'Full Tower  (55–75 cm)' },
      { id: 'Mid Tower', label: 'Mid Tower   (35–55 cm)' },
      { id: 'Mini Tower', label: 'Mini Tower  (30–45 cm)' },
      { id: 'SFF', label: 'SFF          (< 35 cm)' },
    ],
    installed: (n: number) => `${n} / 8 installed`,
    ofComponents: (n: number) => `${n} of 8 components`,
  },
  sk: {
    nav_home: 'Domov', nav_shop: 'Obchod', nav_build: 'Zostaviť', nav_about: 'O nás', nav_account: 'Účet',
    pc_builder: 'Konfigurátor PC', select_components: 'Vyberte komponenty na pridanie', build_complete: 'Zostaviť kompletné PC',
    clear_all: 'Vymazať všetko', drag_to_orbit: 'Ťahaním otáčať  ·  Kolieskom priblížiť', hide_panel: 'Skryť bočný panel',
    show_panel: 'Zobraziť bočný panel', complete: 'Dokončené', your_build: 'Vaša zostava', selected_part: 'Vybraný diel',
    build_total: 'Celková cena', passmark_score: 'Skóre PassMark', verify_passmark: 'Overiť na PassMark ↗',
    continue_benchmarks: 'Pokračovať na benchmarky →', save_build: 'Uložiť zostavu', preparing_order: 'Spúšťame vašu legendu...',
    no_components: '(žiadne komponenty — pridajte v Admine)', none_add_admin: '(žiadne — pridajte v Admine)',
    cat_names: { mobo: 'Základná doska', cpu: 'CPU', cooler: 'Chladič CPU', ram: 'RAM', gpu: 'GPU', storage: 'Úložisko', psu: 'Zdroj', case: 'Skriňa' },
    cat_desc: {
      mobo: 'Základ vašej zostavy — určuje kompatibilitu s CPU, možnosti rozšírenia a potenciál na pretaktovanie.',
      cpu: 'Mozog vášho systému, ktorý zvláda všetky výpočtové úlohy od hrania po tvorbu obsahu.',
      cooler: 'Udržiava váš CPU chladný a tichý aj pri dlhodobej záťaži.',
      ram: 'Vysokorýchlostná pamäť pre plynulý multitasking a lepšie snímkové frekvencie.',
      gpu: 'Poháňa herné vizuály a urýchľuje kreatívne úlohy.',
      storage: 'Rýchle NVMe úložisko pre okamžité spustenie a takmer bezprostredné načítanie.',
      psu: 'Stabilné a efektívne napájanie pre celý váš systém.',
      case: 'Skriňa určuje formát, prúdenie vzduchu a estetiku — a naživo mení mierku 3D náhľadu.',
    },
    case_cats: [
      { id: 'Full Tower', label: 'Veľká skriňa  (55–75 cm)' },
      { id: 'Mid Tower', label: 'Stredná skriňa (35–55 cm)' },
      { id: 'Mini Tower', label: 'Malá skriňa  (30–45 cm)' },
      { id: 'SFF', label: 'Mini skriňa    (< 35 cm)' },
    ],
    installed: (n: number) => `${n} / 8 nainštalovaných`,
    ofComponents: (n: number) => `${n} z 8 komponentov`,
  },
} as const;

const BG = '#F5F0E6';
const PANEL = '#FDFAF4';
const INK = '#1C1C1A';
const MUTED = '#7A7469';
const MAROON = '#6E1423';
const GOLD = '#C4A35A';

function TierBadge({ tier, small }: { tier?: Tier; small?: boolean }) {
  if (!tier) return null;
  const c = TIER_COLORS[tier];
  const sz = small ? 18 : 22;
  return (
    <div
      style={{
        width: sz, height: sz, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: c.bg, color: c.text, border: `1.5px solid ${c.border}`, borderRadius: 3,
        fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: small ? 10 : 12,
      }}
    >
      {tier}
    </div>
  );
}

export default function BuildPage() {
  const { lang, fmt } = useSite();
  const router = useRouter();
  const pathname = usePathname();
  const t = T[lang];
  const isMobile = useIsMobile();

  const [compDb, setCompDb] = useState<ComponentDb>(defaultComponentDb());
  const [selected, setSelected] = useState<Record<CompId, boolean>>({} as Record<CompId, boolean>);
  const [selections, setSelections] = useState<Record<CompId, string>>({} as Record<CompId, string>);
  const [caseCat, setCaseCat] = useState('Mid Tower');
  const [activeId, setActiveId] = useState<CompId | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [glassHidden, setGlassHidden] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [completionRunning, setCompletionRunning] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BuildScene | null>(null);

  // Load the shared component catalog (managed by /admin) on mount.
  useEffect(() => {
    const db = readJSON<ComponentDb>('gomp_components_db', defaultComponentDb());
    setCompDb(db);
    const initSelections = {} as Record<CompId, string>;
    SLOTS.forEach((id) => {
      const list = db[id] || [];
      // The case model must match the default caseCat filter, or the dropdown (which only
      // renders 'Mid Tower' options initially) would show a different item than what's
      // actually stored in state/passed to the 3D scene.
      const pick = id === 'case' ? list.find((c) => c.category === 'Mid Tower') || list[0] : list[0];
      if (pick) initSelections[id] = pick.name;
    });
    setSelections(initSelections);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const scene = createBuildScene(containerRef.current, {
      onCompletionStart: () => {
        setCompletionRunning(true);
        setTimeout(() => setShowComplete(true), 680);
        setTimeout(() => setShowComplete(false), 680 + 4200);
      },
      onCompletionEnd: () => setCompletionRunning(false),
    });
    sceneRef.current = scene;
    const size = CASE_SIZES[caseCat] || CASE_SIZES['Mid Tower'];
    scene.updateCase(size.w, size.h, size.d);
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fires the completion camera sequence once, exactly once, when every slot becomes filled.
  // The `armed` ref (rather than firing inline inside toggleComponent's setSelected updater)
  // is what makes this safe under React Strict Mode's dev-only double-invocation of updater
  // functions — a setTimeout side effect living inside that updater would fire twice.
  const completionArmedRef = useRef(false);
  useEffect(() => {
    const allSelected = SLOTS.every((id) => selected[id]);
    if (!allSelected) {
      completionArmedRef.current = false;
      return;
    }
    if (completionArmedRef.current) return;
    completionArmedRef.current = true;
    const timer = setTimeout(() => sceneRef.current?.triggerCompletion(), 1400);
    return () => clearTimeout(timer);
  }, [selected]);

  const totalPrice = useMemo(() => {
    let sum = 0;
    SLOTS.forEach((id) => {
      if (!selected[id]) return;
      const list = compDb[id] || [];
      const comp = list.find((c) => c.name === selections[id]) || list[0];
      if (comp) sum += comp.price;
    });
    return sum;
  }, [selected, selections, compDb]);

  const installedCount = SLOTS.filter((id) => selected[id]).length;

  function findComp(id: CompId): Component | undefined {
    const list = compDb[id] || [];
    return list.find((c) => c.name === selections[id]) || list[0];
  }

  const toggleComponent = useCallback(
    (id: CompId) => {
      const next = !selected[id];
      setSelected((s) => ({ ...s, [id]: next }));
      setActiveId(id);
      sceneRef.current?.toggleComponent(id, next);
    },
    [selected],
  );

  function changeSelection(id: CompId, name: string) {
    setSelections((s) => ({ ...s, [id]: name }));
    if (id === 'case') {
      const comp = (compDb.case || []).find((c) => c.name === name);
      const size = comp?.category ? CASE_SIZES[comp.category] || CASE_SIZES['Mid Tower'] : CASE_SIZES['Mid Tower'];
      sceneRef.current?.updateCase(size.w, size.h, size.d);
    }
  }

  function changeCaseCat(cat: string) {
    setCaseCat(cat);
    const list = (compDb.case || []).filter((c) => c.category === cat);
    const pick = list[0] || (compDb.case || [])[0];
    if (pick) {
      setSelections((s) => ({ ...s, case: pick.name }));
      const size = CASE_SIZES[cat] || CASE_SIZES['Mid Tower'];
      sceneRef.current?.updateCase(size.w, size.h, size.d);
    }
  }

  function toggleGlassPanel() {
    const next = !glassHidden;
    setGlassHidden(next);
    sceneRef.current?.toggleGlass(next);
  }

  function buildAll() {
    SLOTS.forEach((id, i) => {
      if (selected[id]) return;
      setTimeout(() => toggleComponent(id), i * 90);
    });
  }

  function clearAll() {
    if (completionRunning) return;
    SLOTS.forEach((id, i) => {
      if (!selected[id]) return;
      setTimeout(() => toggleComponent(id), i * 80);
    });
    setShowComplete(false);
  }

  function handleOrder() {
    if (ordering) return;
    writeJSON('gomp_build', { selected, selections, compDb, totalPrice });
    setOrdering(true);
    setTimeout(() => navigateWithTransition(pathname, '/benchmarks', () => router.push('/benchmarks')), 600);
  }

  const activeComp = activeId ? findComp(activeId) : null;
  const activePassmark = activeComp ? passmarkLookup(activeComp.name) : null;
  const activeTier: Tier | undefined = activePassmark
    ? tierFromPassmark(activeId === 'gpu', activePassmark.score)
    : (activeComp?.tier as Tier | undefined);

  return (
    <div style={{ position: 'relative', background: BG, minHeight: '100vh' }}>
      {/* ---- Nav ---- */}
      <SiteNav />

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: isMobile ? 'auto' : '100vh', minHeight: isMobile ? '100vh' : undefined, paddingTop: 60 }}>
        {/* ---- Sidebar ---- */}
        {(!sidebarHidden || isMobile) && (
          <div
            style={{
              width: isMobile ? '100%' : 264,
              order: isMobile ? 2 : 0,
              background: PANEL,
              borderRight: isMobile ? 'none' : '0.5px solid rgba(28,28,26,0.1)',
              borderTop: isMobile ? '0.5px solid rgba(28,28,26,0.1)' : 'none',
              borderBottom: isMobile ? '0.5px solid rgba(28,28,26,0.1)' : 'none',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ padding: isMobile ? '20px 20px 10px' : '20px 20px 14px' }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600, color: MUTED, letterSpacing: 2.5, textTransform: 'uppercase' }}>{t.pc_builder}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#A09890', marginTop: 4 }}>{t.select_components}</div>
            </div>
            <div style={{ flex: isMobile ? 'none' : 1, overflowY: isMobile ? 'visible' : 'auto', padding: '0 12px' }}>
              {SLOTS.map((id) => {
                const list = compDb[id] || [];
                const isSelected = !!selected[id];
                const comp = findComp(id);
                return (
                  <div
                    key={id}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('select')) return;
                      toggleComponent(id);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 8px', cursor: 'pointer', borderRadius: 4 }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: isSelected ? MAROON : 'transparent', border: `1.5px solid ${isSelected ? MAROON : 'rgba(28,28,26,0.25)'}`, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: isSelected ? 600 : 400, color: isSelected ? INK : MUTED }}>{t.cat_names[id]}</div>
                      {id === 'case' ? (
                        <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                          <select
                            value={caseCat}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => changeCaseCat(e.target.value)}
                            style={{ fontFamily: 'var(--font-mono)', fontSize: 9, flex: 1, background: 'transparent', border: 'none', color: MUTED }}
                          >
                            {t.case_cats.map((c) => (
                              <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                      <select
                        value={selections[id] || ''}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => changeSelection(id, e.target.value)}
                        style={{ fontFamily: 'var(--font-mono)', fontSize: 9, width: '100%', background: 'transparent', border: 'none', color: MUTED, marginTop: 2 }}
                      >
                        {list.length === 0 && <option value="">{t.none_add_admin}</option>}
                        {list
                          .filter((c) => id !== 'case' || c.category === caseCat)
                          .map((c) => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                      </select>
                    </div>
                    <TierBadge tier={comp?.tier as Tier} small />
                    <div
                      style={{
                        width: 16, height: 16, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isSelected ? MAROON : 'transparent', border: `1px solid ${isSelected ? MAROON : 'rgba(28,28,26,0.3)'}`,
                        color: isSelected ? '#FDFAF4' : MUTED, fontSize: 10, fontWeight: 700,
                      }}
                    >
                      {isSelected ? '✓' : '+'}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: 16, borderTop: '0.5px solid rgba(28,28,26,0.1)' }}>
              <button onClick={buildAll} style={{ width: '100%', padding: '11px', background: MAROON, color: '#FDFAF4', border: 'none', borderRadius: 3, fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}>
                {t.build_complete}
              </button>
              <button
                onClick={clearAll}
                disabled={completionRunning}
                style={{ width: '100%', padding: '10px', background: 'transparent', color: completionRunning ? '#c9c2b4' : MUTED, border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 3, fontFamily: 'var(--font-sans)', fontSize: 12, cursor: completionRunning ? 'default' : 'pointer' }}
              >
                {t.clear_all}
              </button>
            </div>
          </div>
        )}

        {/* ---- 3D viewport ---- */}
        <div style={{ flex: isMobile ? 'none' : 1, height: isMobile ? '46vh' : undefined, minHeight: isMobile ? 320 : undefined, order: isMobile ? 0 : 1, position: 'relative' }}>
          <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(28,28,26,0.35)' }}>
              {t.installed(installedCount)}
            </div>
            <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(253,250,244,0.85)', padding: '6px 14px', borderRadius: 20, fontFamily: 'var(--font-sans)', fontSize: 11, color: MUTED }}>
              {t.drag_to_orbit}
            </div>
            <button
              onClick={toggleGlassPanel}
              style={{ position: 'absolute', top: 16, right: 16, pointerEvents: 'all', background: 'rgba(253,250,244,0.9)', border: '0.5px solid rgba(28,28,26,0.15)', borderRadius: 4, padding: '7px 12px', fontFamily: 'var(--font-sans)', fontSize: 11, color: INK, cursor: 'pointer' }}
            >
              {glassHidden ? t.show_panel : t.hide_panel}
            </button>
            {!isMobile && (
              <button
                onClick={() => setSidebarHidden((v) => !v)}
                style={{ position: 'absolute', top: 16, left: 16, pointerEvents: 'all', background: 'rgba(253,250,244,0.9)', border: '0.5px solid rgba(28,28,26,0.15)', borderRadius: 4, padding: '7px 12px', fontFamily: 'var(--font-sans)', fontSize: 11, color: INK, cursor: 'pointer' }}
              >
                {sidebarHidden ? t.show_panel : t.hide_panel}
              </button>
            )}
            {showComplete && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 16 : 0 }}>
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(26,18,20,0.86), rgba(10,8,10,0.9))',
                    border: '1px solid rgba(196,163,90,0.25)',
                    boxShadow: '0 24px 70px rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 12,
                    padding: isMobile ? '28px 32px' : '42px 64px',
                    textAlign: 'center',
                    animation: 'gompCompleteFadeIn 0.7s 0.15s cubic-bezier(0.16,1,0.3,1) both',
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: isMobile ? 4 : 7, color: 'rgba(245,240,230,0.65)', textTransform: 'uppercase' }}>
                    {t.complete}
                  </div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 500, fontSize: isMobile ? 34 : 58, color: '#FDFAF4', margin: '10px 0' }}>
                    {t.your_build}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: isMobile ? 26 : 38, color: GOLD, fontWeight: 600, letterSpacing: 1 }}>{fmt(totalPrice)}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ---- Right panel ---- */}
        <div
          style={{
            width: isMobile ? '100%' : 288,
            order: isMobile ? 3 : 2,
            background: PANEL,
            borderLeft: isMobile ? 'none' : '0.5px solid rgba(28,28,26,0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: isMobile ? 'visible' : 'auto',
          }}
        >
          <div style={{ padding: 20, flex: isMobile ? 'none' : 1 }}>
            {activeId && activeComp ? (
              <>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600, color: MUTED, letterSpacing: 1.5, textTransform: 'uppercase' }}>{t.cat_names[activeId]}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: MAROON, fontWeight: 600 }}>{activeComp.name}</div>
                  <TierBadge tier={activeTier} small />
                </div>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: MUTED, marginTop: 10, lineHeight: 1.5 }}>{t.cat_desc[activeId]}</p>
                <div style={{ marginTop: 12 }}>
                  {(activeComp.specs || '').split(' · ').map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: INK, marginBottom: 4 }}>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: MAROON }} /> {s}
                    </div>
                  ))}
                </div>
                {activePassmark && (
                  <div style={{ marginTop: 12, borderTop: '0.5px solid rgba(28,28,26,0.1)', paddingTop: 12 }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: 1 }}>{t.passmark_score}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: activeTier ? TIER_COLORS[activeTier].text : INK, fontWeight: 600 }}>{activePassmark.score.toLocaleString()}</div>
                    <a href={activePassmark.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: MAROON }}>{t.verify_passmark}</a>
                  </div>
                )}
                <div style={{ marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 15, color: INK }}>{fmt(activeComp.price)}</div>
              </>
            ) : (
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#A09890' }}>{t.select_components}</div>
            )}
          </div>
          <div style={{ padding: 20, borderTop: '0.5px solid rgba(28,28,26,0.1)', marginTop: 'auto' }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: 1.5 }}>{t.build_total}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 40, color: INK, fontWeight: 500, margin: '4px 0' }}>{fmt(totalPrice)}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#A09890', marginBottom: 14 }}>{t.ofComponents(installedCount)}</div>
            <button onClick={handleOrder} style={{ width: '100%', padding: 13, background: MAROON, color: '#FDFAF4', border: 'none', borderRadius: 3, fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}>
              {t.continue_benchmarks}
            </button>
            <button style={{ width: '100%', padding: 11, background: 'transparent', color: MUTED, border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 3, fontFamily: 'var(--font-sans)', fontSize: 12, cursor: 'pointer' }}>
              {t.save_build}
            </button>
          </div>
        </div>
      </div>

      {/* ---- Order overlay ---- */}
      {ordering && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'radial-gradient(circle at 50% 40%, #8E2A3A 0%, #6E1423 55%, #4A0E1A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: 640, height: 640, margin: '-320px 0 0 -320px', border: '0.5px solid rgba(196,163,90,0.22)', borderRadius: '50%', animation: 'gompRotateSlow 8s linear infinite' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: 420, height: 420, margin: '-210px 0 0 -210px', border: '0.5px solid rgba(196,163,90,0.32)', borderRadius: '50%', animation: 'gompRotateSlowRev 6s linear infinite' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: 960, height: 960, margin: '-480px 0 0 -480px', background: 'radial-gradient(circle, rgba(196,163,90,0.16) 0%, transparent 60%)', animation: 'gompGlowPulse 2.2s ease-in-out infinite' }} />
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13, fontWeight: 500, color: 'rgba(245,240,230,0.75)', letterSpacing: 6, textTransform: 'uppercase', position: 'relative', zIndex: 1, animation: 'gompCompleteFadeIn 0.7s 0.15s cubic-bezier(0.16,1,0.3,1) both' }}>
            {t.preparing_order}
          </div>
        </div>
      )}
    </div>
  );
}
