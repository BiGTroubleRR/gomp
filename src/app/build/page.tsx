'use client';

import { useEffect, useMemo, useRef, useState, useCallback, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSite } from '@/contexts/SiteContext';
import TransitionLink from '@/components/TransitionLink';
import SiteNav from '@/components/SiteNav';
import { navigateWithTransition } from '@/lib/gomp-nav';
import { writeJSON } from '@/lib/gomp-storage';
import { fetchComponentDb, subscribeComponents } from '@/lib/supabase/components';
import { passmarkLookup, tierFromPassmark, TIER_COLORS, type Tier } from '@/lib/passmark';
import {
  defaultComponentDb,
  caseFitsFormFactor,
  caseHasVerticalGpuMount,
  fitsInCase,
  MOBO_FORM_FACTOR_SIZE_MM,
  CPU_PACKAGE_SIZE_MM,
  RAM_DIMM_SIZE_MM,
  STORAGE_M2_SIZE_MM,
  PSU_ATX_SIZE_MM,
  type Category,
  type Component,
  type ComponentDb,
} from '@/lib/component-db-seed';
import { createBuildScene, SLOTS, CASE_SIZES, mmToUnits, type BuildScene, type CompId, type DimensionSpec } from '@/lib/build-scene';
import { useIsMobile } from '@/lib/use-media-query';
import { setDustCursorVisible, isDustEnabled } from '@/lib/cursor-dust';

const T = {
  en: {
    nav_home: 'Home', nav_shop: 'Shop', nav_build: 'Build', nav_about: 'About', nav_account: 'Account',
    pc_builder: 'PC Builder', select_components: 'Select components to add', build_complete: 'Build Complete PC',
    clear_all: 'Clear All', drag_to_orbit: 'Drag to orbit  ·  Scroll to zoom', hide_panel: 'Hide Side Panel',
    show_panel: 'Show Side Panel', complete: 'Complete', your_build: 'Your Build', selected_part: 'Selected Part',
    build_total: 'Build Total', passmark_score: 'PassMark Score', verify_passmark: 'Verify on PassMark ↗', dimensions: 'Dimensions',
    show_can: 'Add Can for Scale', hide_can: 'Remove Can', show_dims: 'Show Dimensions', hide_dims: 'Hide Dimensions',
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
    step_of: (n: number) => `Step ${n} of 8`,
    back: 'Back', next: 'Next', size: 'Size',
    no_socket_match: (socket: string) => `No CPUs match the ${socket} socket of your selected motherboard — pick a different motherboard, or check Admin.`,
    no_case_fit: (formFactor: string) => `No cases fit a ${formFactor} motherboard at this size — try a larger size, or a smaller motherboard.`,
    no_part_fit: (caseName: string) => `Nothing here fits inside the ${caseName} — pick a bigger case, or a smaller part.`,
    no_case_fit_part: 'No cases at this size fit everything you already picked — try a larger size, or remove a part.',
    power_draw: 'Estimated power draw',
    psu_ok: 'Comfortably within your PSU’s capacity.',
    psu_insufficient: 'Over your PSU’s rated capacity — pick a higher-wattage unit.',
  },
  sk: {
    nav_home: 'Domov', nav_shop: 'Obchod', nav_build: 'Zostaviť', nav_about: 'O nás', nav_account: 'Účet',
    pc_builder: 'Konfigurátor PC', select_components: 'Vyberte komponenty na pridanie', build_complete: 'Zostaviť kompletné PC',
    clear_all: 'Vymazať všetko', drag_to_orbit: 'Ťahaním otáčať  ·  Kolieskom priblížiť', hide_panel: 'Skryť bočný panel',
    show_panel: 'Zobraziť bočný panel', complete: 'Dokončené', your_build: 'Vaša zostava', selected_part: 'Vybraný diel',
    build_total: 'Celková cena', passmark_score: 'Skóre PassMark', verify_passmark: 'Overiť na PassMark ↗', dimensions: 'Rozmery',
    show_can: 'Vložiť plechovku pre mierku', hide_can: 'Odstrániť plechovku', show_dims: 'Zobraziť rozmery', hide_dims: 'Skryť rozmery',
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
    step_of: (n: number) => `Krok ${n} z 8`,
    back: 'Späť', next: 'Ďalej', size: 'Veľkosť',
    no_socket_match: (socket: string) => `Žiadne CPU nesedí na pätici ${socket} vybranej základnej dosky — zvoľte inú dosku, alebo skontrolujte Admin.`,
    no_case_fit: (formFactor: string) => `Žiadna skriňa tejto veľkosti neposkytne miesto pre dosku ${formFactor} — skúste väčšiu veľkosť alebo menšiu dosku.`,
    no_part_fit: (caseName: string) => `Nič tu sa nezmestí do skrine ${caseName} — zvoľte väčšiu skriňu alebo menší diel.`,
    no_case_fit_part: 'Žiadna skriňa tejto veľkosti neposkytne miesto pre všetko, čo ste už vybrali — skúste väčšiu veľkosť alebo odstráňte diel.',
    power_draw: 'Odhadovaný príkon',
    psu_ok: 'S rezervou v rámci kapacity vášho zdroja.',
    psu_insufficient: 'Nad menovitú kapacitu vášho zdroja — zvoľte silnejší zdroj.',
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

// Small monospace tag for a CPU/motherboard's socket or a motherboard's form factor — shown
// right next to the tier badge on picker cards so compatibility is visible before you click.
function SpecPill({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: '2px 6px', borderRadius: 3, border: '1px solid rgba(28,28,26,0.2)',
        fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 9, color: MUTED, whiteSpace: 'nowrap',
      }}
    >
      {label}
    </div>
  );
}

// Real per-SKU dimensions when the selected case has them (sourced from buildcores-open-db —
// see the attribution note on /about), falling back to the old category-bucket size for a case
// that doesn't (e.g. one added in Admin without dimension fields filled in yet).
function caseUnitsFor(comp: Component | undefined, category: string) {
  if (comp?.caseWidthMm && comp?.caseHeightMm && comp?.caseDepthMm) {
    return { w: mmToUnits(comp.caseWidthMm), h: mmToUnits(comp.caseHeightMm), d: mmToUnits(comp.caseDepthMm) };
  }
  return CASE_SIZES[category] || CASE_SIZES['Mid Tower'];
}

// mm -> a "N.N cm" string, the unit every dimension in the Build page (side panel, hover
// tooltip, and the 3D blueprint annotations) is shown in.
function cm(mm: number): string {
  return `${(mm / 10).toFixed(1)} cm`;
}

// GPU/CPU/PSU specs already quote their wattage as a plain "570W"-style token (the same text
// the picker card displays), so this pulls the number straight from there instead of adding a
// parallel structured field that could drift out of sync with what's shown on screen.
function extractWatts(specs: string): number | null {
  const m = specs.match(/(\d+)\s?W\b/);
  return m ? Number(m[1]) : null;
}

// Flat per-category draw for the parts that don't quote their own wattage — small next to a
// GPU/CPU, so a rough industry-typical estimate is enough for a "will my PSU handle this"
// gut-check rather than a precise measurement.
const BASE_WATTS: Partial<Record<CompId, number>> = {
  mobo: 50,
  ram: 6,
  storage: 6,
  cooler: 8,
};

// Every category's real physical dimension(s) — case/gpu/cooler/psu from the per-SKU data
// sourced from buildcores-open-db, mobo/cpu/ram/storage from the standardized form-factor/
// socket tables in component-db-seed.ts (real, industry-standard sizes that barely vary within
// a form factor, so a per-SKU fetch wouldn't add anything). Returns [] when nothing is known
// yet (e.g. an Admin-added case with no dimensions filled in).
function dimensionSpecsFor(id: CompId, comp: Component | undefined, gpuVertical = false): DimensionSpec[] {
  if (!comp) return [];
  if (id === 'case' && comp.caseWidthMm && comp.caseHeightMm && comp.caseDepthMm) {
    return [
      { axis: 'x', mm: comp.caseWidthMm },
      { axis: 'y', mm: comp.caseHeightMm },
      { axis: 'z', mm: comp.caseDepthMm },
    ];
  }
  if (id === 'gpu' && comp.gpuLengthMm) return [{ axis: gpuVertical ? 'y' : 'z', mm: comp.gpuLengthMm }];
  if (id === 'cooler') {
    // scalesMesh: false — the placeholder cooler mesh is a pump block, not a radiator; there's
    // no matching geometry to scale by radiator length, so this quotes the real size without
    // resizing the mesh (unlike every other spec here).
    if (comp.coolerRadiatorMm) return [{ axis: 'x', mm: comp.coolerRadiatorMm, label: `Ø ${cm(comp.coolerRadiatorMm)}`, scalesMesh: false }];
    if (comp.coolerHeightMm) return [{ axis: 'y', mm: comp.coolerHeightMm }];
  }
  if (id === 'psu' && comp.psuLengthMm) {
    return [
      { axis: 'z', mm: comp.psuLengthMm },
      { axis: 'x', mm: PSU_ATX_SIZE_MM.width },
      { axis: 'y', mm: PSU_ATX_SIZE_MM.height },
    ];
  }
  // The remaining categories' placeholder meshes (build-scene.ts's buildComponentMesh) each
  // have one genuinely thin "thickness" local axis (the PCB/package thinness — mobo's local X
  // is 0.04 units, cpu's ~0.06-0.1, ram's ~0.04-0.05, storage's ~0.04) and two much larger axes
  // that form the part's actual real-world footprint. The real width/length/depth numbers below
  // are mapped onto those two larger axes specifically — never onto the thin one, or the
  // annotation ends up perpendicular to how the part actually looks (a real physical fix, not
  // just a display tweak: mobo/cpu use local Y+Z, ram/storage use local Y+Z too but paired with
  // a different real dimension each since ram's long axis is Y while storage's is Z).
  if (id === 'mobo' && comp.formFactor) {
    const size = MOBO_FORM_FACTOR_SIZE_MM[comp.formFactor];
    return size ? [{ axis: 'y', mm: size.width }, { axis: 'z', mm: size.depth }] : [];
  }
  if (id === 'cpu' && comp.socket) {
    const size = CPU_PACKAGE_SIZE_MM[comp.socket];
    return size ? [{ axis: 'y', mm: size.width }, { axis: 'z', mm: size.depth }] : [];
  }
  if (id === 'ram') return [{ axis: 'y', mm: RAM_DIMM_SIZE_MM.length }, { axis: 'z', mm: comp.ramHeightMm ?? RAM_DIMM_SIZE_MM.height }];
  if (id === 'storage') return [{ axis: 'z', mm: STORAGE_M2_SIZE_MM.length }, { axis: 'y', mm: STORAGE_M2_SIZE_MM.width }];
  return [];
}

// Same data, formatted as a single line of text for the side panel / hover tooltip (the 3D
// annotations above are the blueprint-style version of the same numbers).
function dimensionLabel(id: CompId, comp: Component | undefined): string | null {
  if (!comp) return null;
  if (id === 'case' && comp.caseWidthMm && comp.caseHeightMm && comp.caseDepthMm) {
    return `${cm(comp.caseWidthMm)} × ${cm(comp.caseHeightMm)} × ${cm(comp.caseDepthMm)}`;
  }
  if (id === 'gpu' && comp.gpuLengthMm) {
    return comp.gpuSlotWidth ? `${cm(comp.gpuLengthMm)} long · ${comp.gpuSlotWidth}-slot` : `${cm(comp.gpuLengthMm)} long`;
  }
  if (id === 'cooler') {
    if (comp.coolerRadiatorMm) return `${cm(comp.coolerRadiatorMm)} radiator`;
    if (comp.coolerHeightMm) return `${cm(comp.coolerHeightMm)} tall`;
  }
  if (id === 'psu' && comp.psuLengthMm) return `${cm(PSU_ATX_SIZE_MM.width)} × ${cm(PSU_ATX_SIZE_MM.height)} × ${cm(comp.psuLengthMm)}`;
  if (id === 'mobo' && comp.formFactor) {
    const size = MOBO_FORM_FACTOR_SIZE_MM[comp.formFactor];
    return size ? `${cm(size.width)} × ${cm(size.depth)}` : null;
  }
  if (id === 'cpu' && comp.socket) {
    const size = CPU_PACKAGE_SIZE_MM[comp.socket];
    return size ? `${cm(size.width)} × ${cm(size.depth)}` : null;
  }
  if (id === 'ram') return `${cm(RAM_DIMM_SIZE_MM.length)} × ${cm(comp.ramHeightMm ?? RAM_DIMM_SIZE_MM.height)}`;
  if (id === 'storage') return `${cm(STORAGE_M2_SIZE_MM.length)} × ${cm(STORAGE_M2_SIZE_MM.width)}`;
  return null;
}

export default function BuildPage() {
  const { lang, fmt } = useSite();
  const router = useRouter();
  const pathname = usePathname();
  const t = T[lang];
  const isMobile = useIsMobile();
  // Desktop's sidebar/right panel float semi-transparently over the 3D scene — a hard cream
  // outline (four offset copies, not just a soft blur) keeps the text legible against both the
  // light empty scene and the dark case body, since a single soft halo isn't opaque enough at
  // small sizes to beat a mid-gray backdrop. Mobile keeps a fully opaque panel (see below), so
  // it needs no such treatment.
  const textPop: CSSProperties = !isMobile
    ? {
        textShadow:
          '0 0 4px #FDFAF4, 0 0 4px #FDFAF4, 1px 1px 1px #FDFAF4, -1px -1px 1px #FDFAF4, 1px -1px 1px #FDFAF4, -1px 1px 1px #FDFAF4',
      }
    : {};

  const [compDb, setCompDb] = useState<ComponentDb>(defaultComponentDb());
  const [selected, setSelected] = useState<Record<CompId, boolean>>({} as Record<CompId, boolean>);
  const [selections, setSelections] = useState<Record<CompId, string>>({} as Record<CompId, string>);
  const [caseCat, setCaseCat] = useState('Mid Tower');
  const [activeId, setActiveId] = useState<CompId | null>(null);
  const [activeStep, setActiveStep] = useState<CompId>(SLOTS[0]);
  const [ordering, setOrdering] = useState(false);
  const [glassHidden, setGlassHidden] = useState(false);
  const [canVisible, setCanVisible] = useState(false);
  const [dimensionsVisible, setDimensionsVisible] = useState(true);
  const [showComplete, setShowComplete] = useState(false);
  const [completionRunning, setCompletionRunning] = useState(false);
  const [hoverId, setHoverId] = useState<CompId | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BuildScene | null>(null);

  // Load the shared component catalog from Supabase (managed by /admin) on mount, and keep it
  // live: any Admin edit (insert/update/delete) broadcasts over Realtime and gets refetched
  // here, so an already-open /build tab picks up new prices/stock without a reload. Per-slot
  // selections are only seeded once, from that very first load — later catalog refreshes must
  // not silently reset whatever the visitor has already picked.
  const catalogInitializedRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const db = await fetchComponentDb();
      if (cancelled) return;
      setCompDb(db);
      if (!catalogInitializedRef.current) {
        catalogInitializedRef.current = true;
        const initSelections = {} as Record<CompId, string>;
        SLOTS.forEach((id) => {
          const list = db[id] || [];
          // The case model must match the default caseCat filter, or the picker (which only
          // shows 'Mid Tower' options initially) would show a different item than what's
          // actually stored in state/passed to the 3D scene.
          const pick = id === 'case' ? list.find((c) => c.category === 'Mid Tower') || list[0] : list[0];
          if (pick) initSelections[id] = pick.name;
        });
        setSelections(initSelections);
      }
    }
    load();
    const unsubscribe = subscribeComponents(load);
    return () => {
      cancelled = true;
      unsubscribe();
    };
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

  // Swaps the native cursor for the same gold dot used on nav-link hovers whenever the
  // pointer is over a built component in the 3D view (see handleViewportPointerMove below).
  useEffect(() => {
    setDustCursorVisible(!!hoverId);
    return () => setDustCursorVisible(false);
  }, [hoverId]);

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

  // Estimated system draw vs. the selected PSU's rated wattage — a buildcores-style "will this
  // PSU handle it" gut-check, not a precise measurement (see BASE_WATTS/extractWatts above).
  const { estimatedWatts, psuWatts } = useMemo(() => {
    let watts = 0;
    let psu: number | null = null;
    SLOTS.forEach((id) => {
      if (!selected[id]) return;
      const list = compDb[id] || [];
      const comp = list.find((c) => c.name === selections[id]) || list[0];
      if (!comp) return;
      if (id === 'gpu' || id === 'cpu') watts += extractWatts(comp.specs) ?? 0;
      else if (id === 'psu') psu = extractWatts(comp.specs);
      else watts += BASE_WATTS[id] ?? 0;
    });
    return { estimatedWatts: watts, psuWatts: psu };
  }, [selected, selections, compDb]);

  const installedCount = SLOTS.filter((id) => selected[id]).length;

  // Falls back to a compatible default rather than always list[0] — otherwise "Build Complete
  // PC" (which just toggles every unpicked category via its list-item default) could default
  // into a combo the picker itself would never let you click together, e.g. a 360mm-radiator
  // cooler defaulted before a case that only clears 140mm.
  function findComp(id: CompId): Component | undefined {
    const list = compDb[id] || [];
    const preferred = list.find((c) => c.name === selections[id]);
    if (preferred) return preferred;
    if (id === 'case') {
      const mobo = selected.mobo ? (compDb.mobo || []).find((c) => c.name === selections.mobo) : undefined;
      const compatible = list.find((c) => {
        if (mobo?.formFactor && !caseFitsFormFactor(c.category, mobo.formFactor)) return false;
        return (['gpu', 'cooler', 'psu'] as Category[]).every((otherId) => {
          if (!selected[otherId]) return true;
          const otherComp = (compDb[otherId] || []).find((x) => x.name === selections[otherId]);
          return !otherComp || fitsInCase(otherId, otherComp, c);
        });
      });
      if (compatible) return compatible;
    } else if ((id === 'gpu' || id === 'cooler' || id === 'psu') && selected.case) {
      const caseComp = (compDb.case || []).find((c) => c.name === selections.case);
      const compatible = caseComp && list.find((c) => fitsInCase(id, c, caseComp));
      if (compatible) return compatible;
    }
    return list[0];
  }

  const toggleComponent = useCallback(
    (id: CompId) => {
      const next = !selected[id];
      setSelected((s) => ({ ...s, [id]: next }));
      setActiveId(id);
      const comp = next ? findComp(id) : undefined;
      if (id === 'case' && next) sceneRef.current?.setGpuOrientation(caseHasVerticalGpuMount(comp?.name));
      if (comp) sceneRef.current?.setSizeScale(id, dimensionSpecsFor(id, comp));
      sceneRef.current?.toggleComponent(id, next);
      const gpuVertical =
        id === 'gpu' && selected.case
          ? caseHasVerticalGpuMount((compDb.case || []).find((c) => c.name === selections.case)?.name)
          : false;
      sceneRef.current?.setComponentDimensions(id, comp ? dimensionSpecsFor(id, comp, gpuVertical) : []);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, compDb, selections],
  );

  // Only takes effect immediately when `id` is already selected in the scene (a same-category
  // SKU swap) — a first-time select is handled by selectCard right after it calls
  // toggleComponent(id, true), since the scene doesn't mark itself selected until then.
  function changeSelection(id: CompId, name: string) {
    setSelections((s) => ({ ...s, [id]: name }));
    const comp = (compDb[id] || []).find((c) => c.name === name);
    if (id === 'case') {
      const size = caseUnitsFor(comp, comp?.category || 'Mid Tower');
      sceneRef.current?.updateCase(size.w, size.h, size.d);
      const vertical = caseHasVerticalGpuMount(comp?.name);
      sceneRef.current?.setGpuOrientation(vertical);
      // The card's own dimension annotation axis depends on the case it's mounted in — refresh
      // it here too, since changing the case doesn't otherwise touch the gpu selection at all.
      if (selected.gpu) {
        const gpuComp = (compDb.gpu || []).find((c) => c.name === selections.gpu);
        sceneRef.current?.setComponentDimensions('gpu', gpuComp ? dimensionSpecsFor('gpu', gpuComp, vertical) : []);
      }
    } else if (comp) {
      // Also covers a same-category SKU swap while already installed (e.g. GPU already on,
      // user picks a different card) — that path doesn't go through toggleComponent (see
      // selectCard), so this is what picks up the new part's real size in that case.
      sceneRef.current?.setSizeScale(id, dimensionSpecsFor(id, comp));
    }
    const gpuVertical =
      id === 'gpu' && selected.case
        ? caseHasVerticalGpuMount((compDb.case || []).find((c) => c.name === selections.case)?.name)
        : false;
    sceneRef.current?.setComponentDimensions(id, comp ? dimensionSpecsFor(id, comp, gpuVertical) : []);
  }

  function changeCaseCat(cat: string) {
    setCaseCat(cat);
    const list = (compDb.case || []).filter((c) => c.category === cat);
    const pick = list[0] || (compDb.case || [])[0];
    if (pick) {
      setSelections((s) => ({ ...s, case: pick.name }));
      const size = caseUnitsFor(pick, cat);
      sceneRef.current?.updateCase(size.w, size.h, size.d);
      sceneRef.current?.setComponentDimensions('case', dimensionSpecsFor('case', pick));
      const vertical = caseHasVerticalGpuMount(pick.name);
      sceneRef.current?.setGpuOrientation(vertical);
      if (selected.gpu) {
        const gpuComp = (compDb.gpu || []).find((c) => c.name === selections.gpu);
        sceneRef.current?.setComponentDimensions('gpu', gpuComp ? dimensionSpecsFor('gpu', gpuComp, vertical) : []);
      }
    }
  }

  // Picking a card in the progressive picker: swap the selection, install it into the 3D
  // scene if this category isn't already on (a re-pick of the same category just swaps the
  // SKU, matching the old dropdown's behavior), and auto-advance to the next category —
  // picking a category's card twice in a row deselects it instead, since the one-by-one flow
  // has no other obvious "remove" affordance.
  function selectCard(id: CompId, name: string) {
    if (selected[id] && selections[id] === name) {
      setSelected((s) => ({ ...s, [id]: false }));
      sceneRef.current?.toggleComponent(id, false);
      return;
    }
    // changeSelection (above) already applies this pick's size/scale/orientation, but the scene
    // only builds a dimension annotation once the part is marked selected — which toggleComponent
    // below is what actually does for a first-time install — so the annotation still needs
    // setting again here, after that flip (changeSelection's own call was a no-op until now).
    changeSelection(id, name);
    setActiveId(id);
    if (!selected[id]) {
      setSelected((s) => ({ ...s, [id]: true }));
      sceneRef.current?.toggleComponent(id, true);
      const comp = (compDb[id] || []).find((c) => c.name === name);
      const gpuVertical =
        id === 'gpu' && selected.case
          ? caseHasVerticalGpuMount((compDb.case || []).find((c) => c.name === selections.case)?.name)
          : false;
      sceneRef.current?.setComponentDimensions(id, comp ? dimensionSpecsFor(id, comp, gpuVertical) : []);
    }

    // Swapping the motherboard can strand an already-picked CPU (wrong socket) or case (too
    // small for the new board's form factor) — drop those picks rather than silently keeping
    // an invalid pairing installed.
    if (id === 'mobo') {
      const newMobo = (compDb.mobo || []).find((c) => c.name === name);
      if (selected.cpu) {
        const currentCpu = (compDb.cpu || []).find((c) => c.name === selections.cpu);
        if (currentCpu?.socket && newMobo?.socket && currentCpu.socket !== newMobo.socket) {
          setSelected((s) => ({ ...s, cpu: false }));
          sceneRef.current?.toggleComponent('cpu', false);
        }
      }
      if (selected.case) {
        const currentCase = (compDb.case || []).find((c) => c.name === selections.case);
        if (!caseFitsFormFactor(currentCase?.category, newMobo?.formFactor)) {
          setSelected((s) => ({ ...s, case: false }));
          sceneRef.current?.toggleComponent('case', false);
        }
      }
    }

    const idx = SLOTS.indexOf(id);
    if (idx < SLOTS.length - 1) setActiveStep(SLOTS[idx + 1]);
  }

  function toggleGlassPanel() {
    const next = !glassHidden;
    setGlassHidden(next);
    sceneRef.current?.toggleGlass(next);
  }

  // Reference can: a real 500ml can placed beside the case purely as a familiar object to
  // gauge every other part's size against.
  function toggleCan() {
    const next = !canVisible;
    setCanVisible(next);
    sceneRef.current?.setCanVisible(next);
  }

  // Hides every blueprint-style measurement (case/gpu/cooler/psu/mobo/cpu/ram/storage, and the
  // can's own) at once, for a cleaner look once you've seen the numbers you needed.
  function toggleDimensions() {
    const next = !dimensionsVisible;
    setDimensionsVisible(next);
    sceneRef.current?.setDimensionsVisible(next);
  }

  function handleViewportPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const id = sceneRef.current?.pickComponentAt(e.clientX, e.clientY) ?? null;
    setHoverId(id);
    setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top, w: rect.width, h: rect.height });
  }

  function handleViewportPointerLeave() {
    setHoverId(null);
    setHoverPos(null);
  }

  function buildAll() {
    SLOTS.forEach((id, i) => {
      if (selected[id]) return;
      setTimeout(() => toggleComponent(id), i * 90);
    });
    setActiveStep(SLOTS[SLOTS.length - 1]);
  }

  function clearAll() {
    if (completionRunning) return;
    SLOTS.forEach((id, i) => {
      if (!selected[id]) return;
      setTimeout(() => toggleComponent(id), i * 80);
    });
    setShowComplete(false);
    setActiveStep(SLOTS[0]);
  }

  function handleOrder() {
    if (ordering) return;
    writeJSON('gomp_build', { selected, selections, compDb, totalPrice });
    setOrdering(true);
    setTimeout(() => navigateWithTransition(pathname, '/benchmarks', () => router.push('/benchmarks')), 300);
  }

  const activeComp = activeId ? findComp(activeId) : null;
  const activePassmark = activeComp ? passmarkLookup(activeComp.name) : null;
  const activeTier: Tier | undefined = activePassmark
    ? tierFromPassmark(activeId === 'gpu', activePassmark.score)
    : (activeComp?.tier as Tier | undefined);

  const hoverComp = hoverId ? findComp(hoverId) : null;
  const hoverPassmark = hoverComp ? passmarkLookup(hoverComp.name) : null;
  const hoverTier: Tier | undefined = hoverPassmark
    ? tierFromPassmark(hoverId === 'gpu', hoverPassmark.score)
    : (hoverComp?.tier as Tier | undefined);

  return (
    <div style={{ position: 'relative', background: BG, minHeight: '100vh' }}>
      {/* ---- Nav ---- */}
      <SiteNav />

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: isMobile ? 'auto' : '100vh', minHeight: isMobile ? '100vh' : undefined, paddingTop: 60 }}>
        {/* ---- Sidebar ----
            Desktop: floats over the full-bleed 3D viewport, semi-transparent + blurred, rather
            than sitting beside it. Mobile: opaque and in normal flow — the see-through look
            made component names and specs unreadable against the scene, so mobile keeps a
            solid panel instead. */}
        <div
          style={{
            width: isMobile ? '100%' : 264,
            order: isMobile ? 2 : 0,
            position: isMobile ? 'static' : 'absolute',
            top: isMobile ? undefined : 60,
            bottom: isMobile ? undefined : 0,
            left: isMobile ? undefined : 0,
            zIndex: isMobile ? undefined : 10,
            background: isMobile ? PANEL : 'rgba(253,250,244,0.5)',
            backdropFilter: isMobile ? undefined : 'blur(20px)',
            borderRight: isMobile ? 'none' : '0.5px solid rgba(28,28,26,0.1)',
            borderTop: isMobile ? '0.5px solid rgba(28,28,26,0.1)' : 'none',
            borderBottom: isMobile ? '0.5px solid rgba(28,28,26,0.1)' : 'none',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
            <div style={{ padding: isMobile ? '20px 20px 10px' : '20px 20px 14px' }}>
              <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600, color: MUTED, letterSpacing: 2.5, textTransform: 'uppercase' }}>{t.pc_builder}</div>
              <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 12, color: '#A09890', marginTop: 4 }}>{t.select_components}</div>
            </div>
            <div style={{ flex: isMobile ? 'none' : 1, overflowY: isMobile ? 'visible' : 'auto', padding: '0 20px 16px' }}>
              {/* ---- Step pills — free-jump between categories, green/checked once picked ---- */}
              <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 9, color: MUTED, letterSpacing: 1, marginBottom: 8 }}>
                {t.step_of(SLOTS.indexOf(activeStep) + 1)}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {SLOTS.map((id) => {
                  const done = !!selected[id];
                  const isActive = id === activeStep;
                  return (
                    <button
                      key={id}
                      onClick={() => setActiveStep(id)}
                      style={{
                        ...(isActive ? {} : textPop),
                        display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20,
                        border: `1px solid ${isActive ? MAROON : done ? 'rgba(110,20,35,0.4)' : 'rgba(28,28,26,0.2)'}`,
                        background: isActive ? MAROON : done ? 'rgba(110,20,35,0.08)' : 'transparent',
                        color: isActive ? '#FDFAF4' : done ? MAROON : MUTED,
                        fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: isActive ? 600 : 500, cursor: 'pointer',
                      }}
                    >
                      {done && !isActive && <span style={{ fontSize: 9 }}>✓</span>}
                      {t.cat_names[id]}
                    </button>
                  );
                })}
              </div>

              {/* ---- Active category ---- */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ ...textPop, fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 20, color: INK }}>{t.cat_names[activeStep]}</div>
                <p style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 11, color: MUTED, marginTop: 4, lineHeight: 1.4 }}>{t.cat_desc[activeStep]}</p>
              </div>

              {activeStep === 'case' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {t.case_cats.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => changeCaseCat(c.id)}
                      style={{
                        ...textPop, padding: '4px 9px', borderRadius: 4,
                        border: `1px solid ${caseCat === c.id ? MAROON : 'rgba(28,28,26,0.2)'}`,
                        background: caseCat === c.id ? 'rgba(110,20,35,0.08)' : 'transparent',
                        color: caseCat === c.id ? MAROON : MUTED,
                        fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer',
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}

              {/* ---- Product cards for the active category only ----
                  CPU is filtered to the selected motherboard's socket (once one is picked).
                  Case is filtered to sizes that fit the selected motherboard's form factor
                  (never a smaller-rated case for a bigger board) AND to cases with enough
                  clearance for whichever gpu/cooler/psu are already installed. GPU/cooler/psu
                  are filtered the other way — to parts that fit inside the selected case — so
                  an incompatible pairing can never be selected in either direction. Everything
                  stays unfiltered until the part(s) it depends on are actually picked. */}
              {(() => {
                const selectedMobo = selected.mobo ? (compDb.mobo || []).find((c) => c.name === selections.mobo) : undefined;
                const selectedCase = selected.case ? (compDb.case || []).find((c) => c.name === selections.case) : undefined;
                let list = (compDb[activeStep] || []);
                if (activeStep === 'case') {
                  list = list.filter((c) => c.category === caseCat);
                  if (selectedMobo?.formFactor) {
                    list = list.filter((c) => caseFitsFormFactor(c.category, selectedMobo.formFactor));
                  }
                  (['gpu', 'cooler', 'psu'] as Category[]).forEach((otherId) => {
                    if (!selected[otherId]) return;
                    const otherComp = (compDb[otherId] || []).find((c) => c.name === selections[otherId]);
                    if (otherComp) list = list.filter((c) => fitsInCase(otherId, otherComp, c));
                  });
                } else if (activeStep === 'cpu' && selectedMobo?.socket) {
                  list = list.filter((c) => c.socket === selectedMobo.socket);
                } else if (activeStep === 'gpu' || activeStep === 'cooler' || activeStep === 'psu') {
                  if (selectedCase) list = list.filter((c) => fitsInCase(activeStep, c, selectedCase));
                }
                if (list.length === 0) {
                  const reason =
                    activeStep === 'cpu' && selectedMobo?.socket
                      ? t.no_socket_match(selectedMobo.socket)
                      : activeStep === 'case' && selectedMobo?.formFactor
                        ? t.no_case_fit(selectedMobo.formFactor)
                        : activeStep === 'case'
                          ? t.no_case_fit_part
                          : (activeStep === 'gpu' || activeStep === 'cooler' || activeStep === 'psu') && selectedCase
                            ? t.no_part_fit(selectedCase.name)
                            : t.none_add_admin;
                  return <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 11, color: '#A09890', padding: '12px 0' }}>{reason}</div>;
                }
                return list.map((c) => {
                  const isThisSelected = selected[activeStep] && selections[activeStep] === c.name;
                  return (
                    <div
                      key={c.id}
                      onClick={() => selectCard(activeStep, c.name)}
                      style={{
                        border: `1.5px solid ${isThisSelected ? MAROON : 'rgba(28,28,26,0.12)'}`,
                        background: isThisSelected ? 'rgba(110,20,35,0.06)' : 'transparent',
                        borderRadius: 6, padding: '10px 12px', marginBottom: 8, cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: isThisSelected ? MAROON : INK }}>{c.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          {c.formFactor && <SpecPill label={c.formFactor} />}
                          {c.socket && <SpecPill label={c.socket} />}
                          <TierBadge tier={c.tier} small />
                        </div>
                      </div>
                      <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 9, color: MUTED, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.specs}
                      </div>
                      {dimensionLabel(activeStep, c) && (
                        <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 9, color: '#A89A78', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {dimensionLabel(activeStep, c)}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                        <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 13, color: INK }}>{fmt(c.price)}</div>
                        <div
                          style={{
                            width: 16, height: 16, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isThisSelected ? MAROON : 'transparent', border: `1px solid ${isThisSelected ? MAROON : 'rgba(28,28,26,0.3)'}`,
                            color: isThisSelected ? '#FDFAF4' : MUTED, fontSize: 10, fontWeight: 700,
                          }}
                        >
                          {isThisSelected ? '✓' : '+'}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}

              {/* ---- Back / Next ---- */}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => { const i = SLOTS.indexOf(activeStep); if (i > 0) setActiveStep(SLOTS[i - 1]); }}
                  disabled={SLOTS.indexOf(activeStep) === 0}
                  style={{
                    ...textPop, flex: 1, padding: '9px', background: 'transparent',
                    color: SLOTS.indexOf(activeStep) === 0 ? '#c9c2b4' : MUTED,
                    border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 3,
                    fontFamily: 'var(--font-sans)', fontSize: 11,
                    cursor: SLOTS.indexOf(activeStep) === 0 ? 'default' : 'pointer',
                  }}
                >
                  ← {t.back}
                </button>
                <button
                  onClick={() => { const i = SLOTS.indexOf(activeStep); if (i < SLOTS.length - 1) setActiveStep(SLOTS[i + 1]); }}
                  disabled={SLOTS.indexOf(activeStep) === SLOTS.length - 1}
                  style={{
                    ...(SLOTS.indexOf(activeStep) === SLOTS.length - 1 ? textPop : {}), flex: 1, padding: '9px',
                    background: SLOTS.indexOf(activeStep) === SLOTS.length - 1 ? 'transparent' : MAROON,
                    color: SLOTS.indexOf(activeStep) === SLOTS.length - 1 ? '#c9c2b4' : '#FDFAF4',
                    border: SLOTS.indexOf(activeStep) === SLOTS.length - 1 ? '0.5px solid rgba(28,28,26,0.2)' : 'none',
                    borderRadius: 3, fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
                    cursor: SLOTS.indexOf(activeStep) === SLOTS.length - 1 ? 'default' : 'pointer',
                  }}
                >
                  {t.next} →
                </button>
              </div>
            </div>
            <div style={{ padding: 16, borderTop: '0.5px solid rgba(28,28,26,0.1)' }}>
              <button onClick={buildAll} style={{ width: '100%', padding: '11px', background: MAROON, color: '#FDFAF4', border: 'none', borderRadius: 3, fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}>
                {t.build_complete}
              </button>
              <button
                onClick={clearAll}
                disabled={completionRunning}
                style={{ ...textPop, width: '100%', padding: '10px', background: 'transparent', color: completionRunning ? '#c9c2b4' : MUTED, border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 3, fontFamily: 'var(--font-sans)', fontSize: 12, cursor: completionRunning ? 'default' : 'pointer' }}
              >
                {t.clear_all}
              </button>
            </div>
          </div>

        {/* ---- 3D viewport ---- */}
        <div
          ref={viewportRef}
          onPointerMove={handleViewportPointerMove}
          onPointerLeave={handleViewportPointerLeave}
          style={{
            flex: isMobile ? 'none' : 1,
            height: isMobile ? '46vh' : undefined,
            minHeight: isMobile ? 320 : undefined,
            order: isMobile ? 0 : 1,
            position: 'relative',
            cursor: hoverId && isDustEnabled() ? 'none' : undefined,
          }}
        >
          <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div style={{ ...textPop, position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(28,28,26,0.35)' }}>
              {t.installed(installedCount)}
            </div>
            <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(253,250,244,0.85)', padding: '6px 14px', borderRadius: 20, fontFamily: 'var(--font-sans)', fontSize: 11, color: MUTED }}>
              {t.drag_to_orbit}
            </div>
            <div
              style={{
                position: 'absolute',
                top: 16,
                right: isMobile ? 16 : 288 + 16,
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
                gap: 8,
                maxWidth: isMobile ? 'calc(100% - 32px)' : 320,
                pointerEvents: 'all',
              }}
            >
              <button
                onClick={toggleGlassPanel}
                style={{ background: 'rgba(253,250,244,0.9)', border: '0.5px solid rgba(28,28,26,0.15)', borderRadius: 4, padding: '7px 12px', fontFamily: 'var(--font-sans)', fontSize: 11, color: INK, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {glassHidden ? t.show_panel : t.hide_panel}
              </button>
              <button
                onClick={toggleCan}
                style={{
                  background: canVisible ? MAROON : 'rgba(253,250,244,0.9)',
                  border: `0.5px solid ${canVisible ? MAROON : 'rgba(28,28,26,0.15)'}`,
                  borderRadius: 4, padding: '7px 12px', fontFamily: 'var(--font-sans)', fontSize: 11,
                  color: canVisible ? '#FDFAF4' : INK, cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {canVisible ? t.hide_can : t.show_can}
              </button>
              <button
                onClick={toggleDimensions}
                style={{ background: 'rgba(253,250,244,0.9)', border: '0.5px solid rgba(28,28,26,0.15)', borderRadius: 4, padding: '7px 12px', fontFamily: 'var(--font-sans)', fontSize: 11, color: INK, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {dimensionsVisible ? t.hide_dims : t.show_dims}
              </button>
            </div>
            {hoverId && hoverComp && hoverPos && !isMobile && (
              <div
                style={{
                  position: 'absolute',
                  ...(hoverPos.x > hoverPos.w / 2 ? { right: hoverPos.w - hoverPos.x + 18 } : { left: hoverPos.x + 18 }),
                  ...(hoverPos.y > hoverPos.h / 2 ? { bottom: hoverPos.h - hoverPos.y + 18 } : { top: hoverPos.y + 18 }),
                  minWidth: 190,
                  maxWidth: 240,
                  background: 'rgba(20,17,15,0.94)',
                  backdropFilter: 'blur(6px)',
                  border: '0.5px solid rgba(196,163,90,0.35)',
                  borderRadius: 6,
                  padding: '12px 14px',
                  boxShadow: '0 16px 36px rgba(0,0,0,0.35)',
                  zIndex: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 600, color: 'rgba(245,240,230,0.55)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                    {t.cat_names[hoverId]}
                  </span>
                  <TierBadge tier={hoverTier} small />
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: GOLD, fontWeight: 600, marginBottom: 8, lineHeight: 1.3 }}>{hoverComp.name}</div>
                <div style={{ marginBottom: hoverPassmark || dimensionLabel(hoverId, hoverComp) ? 8 : 0 }}>
                  {(hoverComp.specs || '').split(' · ').map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(245,240,230,0.85)', marginBottom: 3 }}>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: GOLD, flexShrink: 0 }} /> {s}
                    </div>
                  ))}
                </div>
                {dimensionLabel(hoverId, hoverComp) && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-sans)', fontSize: 10, color: 'rgba(245,240,230,0.5)', marginBottom: 8 }}>
                    <span>{t.dimensions}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'rgba(245,240,230,0.9)' }}>{dimensionLabel(hoverId, hoverComp)}</span>
                  </div>
                )}
                {hoverPassmark && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-sans)', fontSize: 10, color: 'rgba(245,240,230,0.5)', marginBottom: 8 }}>
                    <span>{t.passmark_score}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'rgba(245,240,230,0.9)' }}>{hoverPassmark.score.toLocaleString()}</span>
                  </div>
                )}
                <div style={{ borderTop: '0.5px solid rgba(245,240,230,0.14)', paddingTop: 8, fontFamily: 'var(--font-mono)', fontSize: 14, color: '#FDFAF4', fontWeight: 500 }}>
                  {fmt(hoverComp.price)}
                </div>
              </div>
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
            position: isMobile ? 'static' : 'absolute',
            top: isMobile ? undefined : 60,
            bottom: isMobile ? undefined : 0,
            right: isMobile ? undefined : 0,
            zIndex: isMobile ? undefined : 10,
            background: isMobile ? PANEL : 'rgba(253,250,244,0.5)',
            backdropFilter: isMobile ? undefined : 'blur(20px)',
            borderLeft: isMobile ? 'none' : '0.5px solid rgba(28,28,26,0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: isMobile ? 'visible' : 'auto',
          }}
        >
          <div style={{ padding: 20, flex: isMobile ? 'none' : 1 }}>
            {activeId && activeComp ? (
              <>
                <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600, color: MUTED, letterSpacing: 1.5, textTransform: 'uppercase' }}>{t.cat_names[activeId]}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 14, color: MAROON, fontWeight: 600 }}>{activeComp.name}</div>
                  <TierBadge tier={activeTier} small />
                </div>
                <p style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 12, color: MUTED, marginTop: 10, lineHeight: 1.5 }}>{t.cat_desc[activeId]}</p>
                <div style={{ marginTop: 12 }}>
                  {(activeComp.specs || '').split(' · ').map((s, i) => (
                    <div key={i} style={{ ...textPop, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: INK, marginBottom: 4 }}>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: MAROON }} /> {s}
                    </div>
                  ))}
                </div>
                {dimensionLabel(activeId, activeComp) && (
                  <div style={{ marginTop: 12, borderTop: '0.5px solid rgba(28,28,26,0.1)', paddingTop: 12 }}>
                    <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: 1 }}>{t.dimensions}</div>
                    <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 14, color: INK, fontWeight: 600 }}>{dimensionLabel(activeId, activeComp)}</div>
                  </div>
                )}
                {activePassmark && (
                  <div style={{ marginTop: 12, borderTop: '0.5px solid rgba(28,28,26,0.1)', paddingTop: 12 }}>
                    <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: 1 }}>{t.passmark_score}</div>
                    <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 16, color: activeTier ? TIER_COLORS[activeTier].text : INK, fontWeight: 600 }}>{activePassmark.score.toLocaleString()}</div>
                    <a href={activePassmark.url} target="_blank" rel="noopener noreferrer" style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 11, color: MAROON }}>{t.verify_passmark}</a>
                  </div>
                )}
                <div style={{ ...textPop, marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 15, color: INK }}>{fmt(activeComp.price)}</div>
              </>
            ) : (
              <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 12, color: '#A09890' }}>{t.select_components}</div>
            )}
          </div>
          {estimatedWatts > 0 && (
            <div style={{ padding: '16px 20px 0', borderTop: '0.5px solid rgba(28,28,26,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: 1 }}>{t.power_draw}</div>
                <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 13, color: psuWatts && estimatedWatts > psuWatts ? MAROON : INK, fontWeight: 600 }}>
                  {estimatedWatts}W{psuWatts ? ` / ${psuWatts}W` : ''}
                </div>
              </div>
              {psuWatts != null && (
                <>
                  <div style={{ height: 5, borderRadius: 3, background: 'rgba(28,28,26,0.08)', marginTop: 6, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, (estimatedWatts / psuWatts) * 100)}%`,
                        background: estimatedWatts > psuWatts ? MAROON : estimatedWatts > psuWatts * 0.7 ? GOLD : INK,
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                  <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 10, color: estimatedWatts > psuWatts ? MAROON : MUTED, marginTop: 5, marginBottom: 2 }}>
                    {estimatedWatts > psuWatts ? t.psu_insufficient : t.psu_ok}
                  </div>
                </>
              )}
            </div>
          )}
          <div style={{ padding: 20, borderTop: estimatedWatts > 0 ? 'none' : '0.5px solid rgba(28,28,26,0.1)', marginTop: 'auto' }}>
            <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: 1.5 }}>{t.build_total}</div>
            <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 40, color: INK, fontWeight: 500, margin: '4px 0' }}>{fmt(totalPrice)}</div>
            <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 11, color: '#A09890', marginBottom: 14 }}>{t.ofComponents(installedCount)}</div>
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
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13, fontWeight: 500, color: 'rgba(245,240,230,0.75)', letterSpacing: 6, textTransform: 'uppercase', position: 'relative', zIndex: 1, animation: 'gompCompleteFadeIn 0.35s 0.05s cubic-bezier(0.16,1,0.3,1) both' }}>
            {t.preparing_order}
          </div>
        </div>
      )}
    </div>
  );
}
