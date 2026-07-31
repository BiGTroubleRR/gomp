'use client';

import { CSSProperties, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSite } from '@/contexts/SiteContext';
import TransitionLink from '@/components/TransitionLink';
import SiteNav from '@/components/SiteNav';
import { navigateWithTransition } from '@/lib/gomp-nav';
import { readJSON, writeJSON } from '@/lib/gomp-storage';
import { passmarkLookup, TIER_COLORS } from '@/lib/passmark';
import { useIsMobile } from '@/lib/use-media-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Group = 'fps' | 'aaa' | 'synthetic';
type BenchTier = 'S' | 'A' | 'B' | 'C';

type Benchmark = {
  id: string;
  group: Group;
  monogram: string;
  name: string;
  subtitleEn: string;
  tier: BenchTier;
  duration: number;
  recommended?: boolean;
};

// Shape of the `gomp_build` payload written by the Build page — read-only here.
type CompEntry = {
  id?: string;
  name: string;
  price?: number;
  specs?: string;
  tier?: string;
  passmark?: number;
  passmarkUrl?: string;
};
type CompCategory = 'mobo' | 'cpu' | 'cooler' | 'ram' | 'gpu' | 'storage' | 'psu' | 'case';
type BuildPayload = {
  selected: Record<string, boolean>;
  selections: Record<string, string>;
  compDb: Record<CompCategory, CompEntry[]>;
  totalPrice: number;
};

// ---------------------------------------------------------------------------
// Constant data
// ---------------------------------------------------------------------------

const BENCHMARKS: Benchmark[] = [
  { id: 'cs2', group: 'fps', monogram: 'CS2', name: 'Counter-Strike 2', subtitleEn: 'Competitive Shooter', tier: 'B', duration: 5, recommended: true },
  { id: 'val', group: 'fps', monogram: 'VAL', name: 'Valorant', subtitleEn: 'Tactical Shooter', tier: 'C', duration: 5 },
  { id: 'wz', group: 'fps', monogram: 'WZ', name: 'Call of Duty: Warzone', subtitleEn: 'Battle Royale', tier: 'A', duration: 5 },
  { id: 'apex', group: 'fps', monogram: 'APEX', name: 'Apex Legends', subtitleEn: 'Battle Royale', tier: 'B', duration: 5 },
  { id: 'ow2', group: 'fps', monogram: 'OW2', name: 'Overwatch 2', subtitleEn: 'Hero Shooter', tier: 'B', duration: 5 },
  { id: 'fn', group: 'fps', monogram: 'FN', name: 'Fortnite (UE5)', subtitleEn: 'Battle Royale', tier: 'A', duration: 5 },
  { id: 'cp77', group: 'aaa', monogram: '2077', name: 'Cyberpunk 2077: Phantom Liberty', subtitleEn: 'Open-World RPG', tier: 'S', duration: 5, recommended: true },
  { id: 'bmw', group: 'aaa', monogram: 'BMW', name: 'Black Myth: Wukong', subtitleEn: 'Action RPG', tier: 'S', duration: 5 },
  { id: 'aw2', group: 'aaa', monogram: 'AW2', name: 'Alan Wake 2', subtitleEn: 'Survival Horror', tier: 'S', duration: 5 },
  { id: 'bg3', group: 'aaa', monogram: 'BG3', name: "Baldur's Gate 3", subtitleEn: 'Turn-Based RPG', tier: 'B', duration: 5 },
  { id: 'hl', group: 'aaa', monogram: 'HL', name: 'Hogwarts Legacy', subtitleEn: 'Open-World RPG', tier: 'A', duration: 5 },
  { id: 'er', group: 'aaa', monogram: 'ER', name: 'Elden Ring', subtitleEn: 'Action RPG', tier: 'B', duration: 5 },
  { id: 'ts', group: 'synthetic', monogram: 'TS', name: '3DMark Time Spy', subtitleEn: 'DirectX 12 GPU Test', tier: 'B', duration: 4, recommended: true },
  { id: 'sw', group: 'synthetic', monogram: 'SW', name: '3DMark Speed Way', subtitleEn: 'DX12 Ultimate Ray Tracing', tier: 'S', duration: 3, recommended: true },
  { id: 'sn', group: 'synthetic', monogram: 'SN', name: '3DMark Steel Nightmare', subtitleEn: 'Extreme RT Stress Test', tier: 'S', duration: 6 },
  { id: 'cb24', group: 'synthetic', monogram: 'CB24', name: 'Cinebench 2024', subtitleEn: 'CPU + GPU Render', tier: 'A', duration: 10, recommended: true },
  { id: 'bmk', group: 'synthetic', monogram: 'BMK', name: 'Blender Benchmark', subtitleEn: 'Render Engine Suite', tier: 'A', duration: 15 },
  { id: 'pm10', group: 'synthetic', monogram: 'PM10', name: 'PCMark 10', subtitleEn: 'System Productivity', tier: 'C', duration: 20 },
];

const GPU_PARTS = [
  { id: 'g1', name: 'NVIDIA RTX 5090 FE', passmark: 38960 },
  { id: 'g2', name: 'NVIDIA RTX 4090', passmark: 38054 },
  { id: 'g3', name: 'NVIDIA RTX 4080 Super', passmark: 34238 },
  { id: 'g4', name: 'NVIDIA RTX 4070 Ti Super', passmark: 31851 },
  { id: 'g5', name: 'NVIDIA RTX 4070 Super', passmark: 29940 },
  { id: 'g6', name: 'NVIDIA RTX 4070', passmark: 26874 },
];
const CPU_PARTS = [
  { id: 'c1', name: 'AMD Ryzen 9 9950X', passmark: 65758 },
  { id: 'c2', name: 'Intel Core i9-14900KS', passmark: 60010 },
  { id: 'c3', name: 'Intel Core i9-14900K', passmark: 58312 },
  { id: 'c4', name: 'Intel Core i7-14700K', passmark: 51956 },
];

// Fixed "1.0x" baseline scores for the FPS ratio math below — hardcoded reference points for
// this page's estimator, independent of whatever the shared PassMark table reports today.
const REF_GPU_SCORE = 31851;
const REF_CPU_SCORE = 51995;

// Best-effort reconstruction of each title's GPU/CPU-bound character (base 1440p fps at the
// reference rig, plus how much of the swing comes from GPU vs. CPU headroom). Synthetic
// benchmarks have no entry here, so they never render an FPS line.
const FPS_MODEL: Record<string, { base: number; gpuW: number; cpuW: number }> = {
  cs2: { base: 280, gpuW: 0.35, cpuW: 0.65 },
  val: { base: 350, gpuW: 0.45, cpuW: 0.55 },
  wz: { base: 110, gpuW: 0.75, cpuW: 0.25 },
  apex: { base: 180, gpuW: 0.6, cpuW: 0.4 },
  ow2: { base: 220, gpuW: 0.55, cpuW: 0.45 },
  fn: { base: 150, gpuW: 0.65, cpuW: 0.35 },
  cp77: { base: 88, gpuW: 0.9, cpuW: 0.1 },
  bmw: { base: 75, gpuW: 0.85, cpuW: 0.15 },
  aw2: { base: 70, gpuW: 0.85, cpuW: 0.15 },
  bg3: { base: 95, gpuW: 0.6, cpuW: 0.4 },
  hl: { base: 100, gpuW: 0.75, cpuW: 0.25 },
  er: { base: 90, gpuW: 0.7, cpuW: 0.3 },
};

const GROUP_LABELS: Record<'en' | 'sk', Record<Group, string>> = {
  en: { fps: 'FPS', aaa: 'Release', synthetic: 'Synthetic' },
  sk: { fps: 'FPS', aaa: 'Titul', synthetic: 'Syntetický' },
};

const SUBTITLES_SK: Record<string, string> = {
  cs2: 'Kompetitívna strieľačka',
  val: 'Taktická strieľačka',
  wz: 'Battle Royale',
  apex: 'Battle Royale',
  ow2: 'Hrdinská strieľačka',
  fn: 'Battle Royale',
  cp77: 'Open-World RPG',
  bmw: 'Akčné RPG',
  aw2: 'Survival Horor',
  bg3: 'Ťahové RPG',
  hl: 'Open-World RPG',
  er: 'Akčné RPG',
  ts: 'DirectX 12 GPU test',
  sw: 'DX12 Ultimate Ray Tracing',
  sn: 'Extrémny RT stres test',
  cb24: 'Render CPU + GPU',
  bmk: 'Sada renderovacieho enginu',
  pm10: 'Produktivita systému',
};

const translations = {
  en: {
    nav_home: 'Home',
    nav_shop: 'Shop',
    nav_build: 'Build',
    nav_about: 'About',
    nav_account: 'Account',
    your_build: 'Your Build',
    benchmark_suite: 'Benchmark Suite',
    selected_word: 'selected',
    no_selection_msg:
      "No benchmarks selected yet — pick a few on the right, or skip and we'll run our default suite.",
    continue_checkout: 'Continue to Checkout →',
    skip_benchmarks: 'Skip benchmarks',
    back_to_build: '← Back to Build',
    step_build: 'Build',
    step_benchmarks: 'Benchmarks',
    step_checkout: 'Checkout',
    choose_title_line1: 'Choose your',
    choose_title_em: 'benchmarks.',
    choose_desc:
      "Every GOMP build ships with a printed performance validation sheet. Pick the games and tests you want on it — we'll run them on your exact rig before it leaves the shop.",
    select_recommended: 'Select Recommended',
    clear_all: 'Clear All',
    section_fps_title: 'In-Game · Competitive & FPS',
    section_fps_desc: 'The titles that live and die by frame rate.',
    section_aaa_title: 'In-Game · Popular Releases',
    section_aaa_desc: 'Heavier worlds for a truer read on real-world performance.',
    section_synth_title: 'Synthetic Benchmarks',
    section_synth_desc: 'Industry-standard scores you can compare against any rig.',
    recommended_badge: 'Recommended',
    preparing_checkout: 'Preparing checkout',
    custom_pc_build: 'Custom PC Build',
    no_build_found: 'No build found',
    configure_first: 'Configure a build first, or continue with a default rig.',
    components_word: 'components',
    no_test_time: 'No test time yet',
    fps_source_title: 'Estimated FPS (1440p)',
    fps_need_both: 'Configure a build first, or pick a GPU and CPU below to estimate FPS.',
    total_test_time: (n: number) => `~${n} min total test time`,
    fps_from_build: (g: string, c: string) => `Estimates based on your configured build — ${g} + ${c}.`,
    // Shown when the GPU is the missing half (CPU is known from the build).
    fps_pick_gpu: (c: string) => `Using ${c} from your build — pick a GPU below to estimate FPS.`,
    // Shown when the CPU is the missing half (GPU is known from the build).
    fps_pick_cpu: (g: string) => `Using ${g} from your build — pick a CPU below to estimate FPS.`,
  },
  sk: {
    nav_home: 'Domov',
    nav_shop: 'Obchod',
    nav_build: 'Zostaviť',
    nav_about: 'O nás',
    nav_account: 'Účet',
    your_build: 'Vaša zostava',
    benchmark_suite: 'Sada testov',
    selected_word: 'vybraných',
    no_selection_msg:
      'Zatiaľ nemáte vybrané žiadne testy — vyberte niekoľko vpravo, alebo preskočte a spustíme našu východiskovú sadu.',
    continue_checkout: 'Pokračovať na pokladňu →',
    skip_benchmarks: 'Preskočiť testy',
    back_to_build: '← Späť na zostavu',
    step_build: 'Zostava',
    step_benchmarks: 'Testy',
    step_checkout: 'Pokladňa',
    choose_title_line1: 'Vyberte si',
    choose_title_em: 'testy.',
    choose_desc:
      'Každá zostava GOMP sa dodáva s vytlačeným listom výkonu. Vyberte hry a testy, ktoré na ňom chcete mať — spustíme ich na vašom presnom stroji ešte pred odoslaním.',
    select_recommended: 'Vybrať odporúčané',
    clear_all: 'Zrušiť výber',
    section_fps_title: 'V hre · Kompetitívne a FPS',
    section_fps_desc: 'Tituly, ktoré žijú a umierajú s počtom snímok.',
    section_aaa_title: 'V hre · Populárne novinky',
    section_aaa_desc: 'Náročnejšie svety pre presnejší obraz reálneho výkonu.',
    section_synth_title: 'Syntetické testy',
    section_synth_desc: 'Priemyselné štandardy, ktoré môžete porovnať s akýmkoľvek strojom.',
    recommended_badge: 'Odporúčané',
    preparing_checkout: 'Pripravuje sa pokladňa',
    custom_pc_build: 'Vlastná zostava PC',
    no_build_found: 'Zostava sa nenašla',
    configure_first: 'Najprv nakonfigurujte zostavu, alebo pokračujte so základným strojom.',
    components_word: 'komponentov',
    no_test_time: 'Zatiaľ žiadny čas testov',
    fps_source_title: 'Odhadované FPS (1440p)',
    fps_need_both: 'Najprv nakonfigurujte zostavu, alebo vyberte GPU a CPU nižšie pre odhad FPS.',
    total_test_time: (n: number) => `~${n} min celkový čas testov`,
    fps_from_build: (g: string, c: string) => `Odhad na základe vašej zostavy — ${g} + ${c}.`,
    fps_pick_gpu: (c: string) => `Používa sa ${c} z vašej zostavy — vyberte GPU nižšie pre odhad FPS.`,
    fps_pick_cpu: (g: string) => `Používa sa ${g} z vašej zostavy — vyberte CPU nižšie pre odhad FPS.`,
  },
} as const;

// ---------------------------------------------------------------------------
// Style constants
// ---------------------------------------------------------------------------

const MAROON = '#6E1423';
const GOLD = '#C4A35A';
const INK = '#1C1C1A';
const MUTED = '#7A7469';
const FAINT = '#A09890';
const PAGE_BG = '#F5F0E6';
const PANEL_BG = '#FDFAF4';

const serif: CSSProperties = { fontFamily: 'var(--font-serif)' };
const sans: CSSProperties = { fontFamily: 'var(--font-sans)' };
const mono: CSSProperties = { fontFamily: 'var(--font-mono)' };

// ---------------------------------------------------------------------------
// Decorative ember overlay — shared between the entry (fade out) and exit (fade in) states
// ---------------------------------------------------------------------------

function EmberRings() {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 640,
          height: 640,
          margin: '-320px 0 0 -320px',
          border: '0.5px solid rgba(196,163,90,0.22)',
          borderRadius: '50%',
          animation: 'gompRotateSlow 8s linear infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 420,
          height: 420,
          margin: '-210px 0 0 -210px',
          border: '0.5px solid rgba(196,163,90,0.32)',
          borderRadius: '50%',
          animation: 'gompRotateSlowRev 6s linear infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 960,
          height: 960,
          margin: '-480px 0 0 -480px',
          background: 'radial-gradient(circle, rgba(196,163,90,0.16) 0%, transparent 60%)',
          animation: 'gompGlowPulse 2.2s ease-in-out infinite',
        }}
      />
      <div style={{ position: 'absolute', top: '62%', left: '20%', width: 6, height: 6, borderRadius: '50%', background: GOLD, boxShadow: '0 0 10px 3px rgba(196,163,90,0.55)', animation: 'gompEmberRise 1.6s ease-out infinite' }} />
      <div style={{ position: 'absolute', top: '70%', left: '68%', width: 4, height: 4, borderRadius: '50%', background: '#E8A9B4', boxShadow: '0 0 8px 2px rgba(232,169,180,0.5)', animation: 'gompEmberRise 1.9s 0.2s ease-out infinite' }} />
      <div style={{ position: 'absolute', top: '55%', left: '80%', width: 5, height: 5, borderRadius: '50%', background: GOLD, boxShadow: '0 0 9px 2px rgba(196,163,90,0.5)', animation: 'gompEmberRise 1.4s 0.35s ease-out infinite' }} />
      <div style={{ position: 'absolute', top: '78%', left: '40%', width: 3, height: 3, borderRadius: '50%', background: '#E8A9B4', animation: 'gompEmberRise 2.1s 0.1s ease-out infinite' }} />
      <div style={{ position: 'absolute', top: '32%', left: '14%', width: 4, height: 4, borderRadius: '50%', background: GOLD, boxShadow: '0 0 8px 2px rgba(196,163,90,0.5)', animation: 'gompEmberRise 1.7s 0.5s ease-out infinite' }} />
      <div style={{ position: 'absolute', top: '28%', left: '86%', width: 5, height: 5, borderRadius: '50%', background: '#E8A9B4', animation: 'gompEmberRise 1.5s 0.25s ease-out infinite' }} />
    </>
  );
}

const overlayBg = 'radial-gradient(circle at 50% 45%, #8E2A3A 0%, #6E1423 55%, #4A0E1A 100%)';

function EntryOverlay() {
  // Fades out once on mount and stays invisible (pointer-events:none throughout) — the
  // receiving half of the Build page's "Booting up your legend..." exit transition.
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: overlayBg,
        pointerEvents: 'none',
        overflow: 'hidden',
        animation: 'gompOverlayOut 0.9s 0.1s cubic-bezier(.16,1,.3,1) forwards',
      }}
    >
      <EmberRings />
    </div>
  );
}

function ExitOverlay({ label }: { label: string }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: overlayBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'all',
        overflow: 'hidden',
        animation: 'gompOverlayIn 0.65s cubic-bezier(.16,1,.3,1) both',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <EmberRings />
      </div>
      <div
        style={{
          ...serif,
          fontSize: 13,
          fontWeight: 500,
          color: 'rgba(245,240,230,0.75)',
          letterSpacing: 6,
          textTransform: 'uppercase',
          position: 'relative',
          zIndex: 1,
          animation: 'gompCompleteFadeIn 0.7s 0.15s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BenchmarksPage() {
  const { lang, currency, setLang, setCurrency, fmt } = useSite();
  const router = useRouter();
  const pathname = usePathname();
  const t = translations[lang];
  const isMobile = useIsMobile();

  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {};
    BENCHMARKS.forEach((b) => {
      if (b.recommended) o[b.id] = true;
    });
    return o;
  });
  const [exiting, setExiting] = useState(false);
  const [build, setBuild] = useState<BuildPayload | null>(null);
  const [manualGpuId, setManualGpuId] = useState('g4');
  const [manualCpuId, setManualCpuId] = useState('c4');

  useEffect(() => {
    setBuild(readJSON<BuildPayload | null>('gomp_build', null));
  }, []);

  const activeColor = MAROON;
  const inactiveColor = MUTED;
  const groupLabels = GROUP_LABELS[lang];

  // Prefer today's live score from the shared daily-refreshed PassMark table over whatever
  // score is stored (a saved build's compDb, or the static GPU_PARTS/CPU_PARTS reference
  // list), falling back to the stored value for models the table doesn't track.
  function liveScore(name: string, stored: number): number {
    const live = passmarkLookup(name);
    return live ? live.score : stored;
  }

  const buildGpuName = build?.selected?.gpu ? build.selections.gpu : null;
  const buildCpuName = build?.selected?.cpu ? build.selections.cpu : null;
  const buildGpuScoreStored = buildGpuName ? build?.compDb?.gpu?.find((c) => c.name === buildGpuName)?.passmark : undefined;
  const buildCpuScoreStored = buildCpuName ? build?.compDb?.cpu?.find((c) => c.name === buildCpuName)?.passmark : undefined;
  const buildGpuScore = buildGpuName && buildGpuScoreStored ? liveScore(buildGpuName, buildGpuScoreStored) : null;
  const buildCpuScore = buildCpuName && buildCpuScoreStored ? liveScore(buildCpuName, buildCpuScoreStored) : null;

  const needManualGpu = !buildGpuScore;
  const needManualCpu = !buildCpuScore;
  const manualGpu = GPU_PARTS.find((g) => g.id === manualGpuId) ?? GPU_PARTS[3];
  const manualCpu = CPU_PARTS.find((c) => c.id === manualCpuId) ?? CPU_PARTS[3];
  const finalGpuScore = buildGpuScore || liveScore(manualGpu.name, manualGpu.passmark);
  const finalCpuScore = buildCpuScore || liveScore(manualCpu.name, manualCpu.passmark);
  const gpuRatio = finalGpuScore / REF_GPU_SCORE;
  const cpuRatio = finalCpuScore / REF_CPU_SCORE;

  function estimateFps(id: string): number | null {
    const m = FPS_MODEL[id];
    if (!m) return null;
    const raw = m.base * (m.gpuW * gpuRatio + m.cpuW * cpuRatio);
    return Math.max(20, Math.round(raw / 5) * 5);
  }

  const showFpsPicker = needManualGpu || needManualCpu;
  const fpsSourceDesc =
    !needManualGpu && !needManualCpu
      ? t.fps_from_build(buildGpuName!, buildCpuName!)
      : needManualGpu && needManualCpu
        ? t.fps_need_both
        : needManualGpu
          ? t.fps_pick_gpu(buildCpuName!)
          : t.fps_pick_cpu(buildGpuName!);

  const selectedIds = Object.keys(selected).filter((k) => selected[k]);
  const selectedList = BENCHMARKS.filter((b) => selected[b.id]).map((b) => ({
    name: b.name,
    groupLabel: groupLabels[b.group] || b.group,
    durationLabel: `~${b.duration} min`,
  }));
  const totalMin = BENCHMARKS.filter((b) => selected[b.id]).reduce((s, b) => s + b.duration, 0);
  const totalCount = BENCHMARKS.length;

  const buildComponentCount = build ? Object.values(build.selected || {}).filter(Boolean).length : 0;
  const buildLabel = build ? t.custom_pc_build : t.no_build_found;
  const buildSubline = build
    ? `${buildComponentCount} ${t.components_word} · ${fmt(build.totalPrice || 0)}`
    : t.configure_first;

  const flowSteps = [
    { num: '1', label: t.step_build, state: 'done' as const },
    { num: '2', label: t.step_benchmarks, state: 'active' as const },
    { num: '3', label: t.step_checkout, state: 'upcoming' as const },
  ];

  function toggle(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function selectRecommended() {
    const o: Record<string, boolean> = {};
    BENCHMARKS.forEach((b) => {
      if (b.recommended) o[b.id] = true;
    });
    setSelected(o);
  }

  function clearAll() {
    setSelected({});
  }

  function navigateTo(ids: string[]) {
    const chosen = BENCHMARKS.filter((b) => ids.includes(b.id)).map((b) => ({ id: b.id, name: b.name, group: b.group }));
    writeJSON('gomp_benchmarks', chosen);
    setExiting(true);
    setTimeout(() => {
      navigateWithTransition(pathname, '/checkout', () => router.push('/checkout'));
    }, 600);
  }

  function renderCard(b: Benchmark) {
    const isSel = !!selected[b.id];
    const fps = estimateFps(b.id);
    const subtitle = lang === 'sk' ? SUBTITLES_SK[b.id] || b.subtitleEn : b.subtitleEn;
    const tierColors = TIER_COLORS[b.tier];
    const borderColor = isSel ? 'rgba(110,20,35,0.35)' : 'rgba(28,28,26,0.12)';
    const bgColor = isSel ? 'rgba(110,20,35,0.05)' : PANEL_BG;
    const checkBg = isSel ? MAROON : 'transparent';
    const checkBorder = isSel ? MAROON : 'rgba(28,28,26,0.2)';
    const checkColor = isSel ? PANEL_BG : FAINT;

    return (
      <div
        key={b.id}
        onClick={() => toggle(b.id)}
        style={{
          position: 'relative',
          padding: '16px 16px 14px',
          borderRadius: 2,
          border: `0.5px solid ${borderColor}`,
          background: bgColor,
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div
            style={{
              padding: '4px 8px',
              border: '0.5px solid rgba(28,28,26,0.18)',
              borderRadius: 2,
              ...mono,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 0.5,
              color: INK,
              background: PANEL_BG,
            }}
          >
            {b.monogram}
          </div>
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: checkBg,
              border: `0.5px solid ${checkBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              fontWeight: 600,
              color: checkColor,
              ...sans,
              flexShrink: 0,
            }}
          >
            {isSel ? '✓' : '+'}
          </div>
        </div>
        {b.recommended && (
          <div
            style={{
              display: 'inline-flex',
              width: 'fit-content',
              ...mono,
              fontSize: 9,
              fontWeight: 700,
              color: '#7A5500',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              background: '#FFF3C4',
              border: '0.5px solid #D4A017',
              borderRadius: 2,
              padding: '3px 6px',
            }}
          >
            {t.recommended_badge}
          </div>
        )}
        <div>
          <div style={{ ...serif, fontSize: 19, fontWeight: 600, color: INK, lineHeight: 1.15, marginBottom: 2 }}>{b.name}</div>
          <div style={{ ...sans, fontSize: 11, color: MUTED, fontWeight: 300 }}>{subtitle}</div>
        </div>
        {fps !== null && <div style={{ ...mono, fontSize: 15, fontWeight: 600, color: MAROON }}>{`~${fps} FPS`}</div>}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 'auto',
            paddingTop: 10,
            borderTop: '0.5px solid rgba(28,28,26,0.08)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 20,
              height: 20,
              background: tierColors.bg,
              border: `1.5px solid ${tierColors.border}`,
              borderRadius: 3,
              ...mono,
              fontSize: 11,
              fontWeight: 700,
              color: tierColors.text,
              flexShrink: 0,
            }}
          >
            {b.tier}
          </div>
          <span style={{ ...mono, fontSize: 10, color: MUTED }}>{`~${b.duration} min`}</span>
        </div>
      </div>
    );
  }

  const fpsCards = BENCHMARKS.filter((b) => b.group === 'fps');
  const aaaCards = BENCHMARKS.filter((b) => b.group === 'aaa');
  const synthCards = BENCHMARKS.filter((b) => b.group === 'synthetic');

  const cardGridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: isMobile ? 8 : 12,
  };

  return (
    <>
      <EntryOverlay />
      <div style={{ position: 'relative', zIndex: 2, background: PAGE_BG, minHeight: '100vh' }}>
        {/* Nav */}
        <SiteNav />

        <div style={{ minHeight: '100vh', paddingTop: 60, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'stretch' }}>
          {/* Left sidebar */}
          <div
            style={{
              width: isMobile ? '100%' : 400,
              flexShrink: 0,
              background: PANEL_BG,
              borderRight: isMobile ? 'none' : '0.5px solid rgba(28,28,26,0.12)',
              borderBottom: isMobile ? '0.5px solid rgba(28,28,26,0.12)' : 'none',
              padding: isMobile ? '32px 20px 28px' : '48px 32px 40px',
              position: isMobile ? 'static' : 'sticky',
              top: isMobile ? undefined : 60,
              height: isMobile ? 'auto' : 'calc(100vh - 60px)',
              overflowY: isMobile ? 'visible' : 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ ...sans, fontSize: 10, fontWeight: 600, color: MUTED, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 20 }}>
              {t.your_build}
            </div>
            <div style={{ ...serif, fontSize: 26, fontWeight: 600, color: INK, lineHeight: 1.15, marginBottom: 6 }}>{buildLabel}</div>
            <div style={{ ...sans, fontSize: 12, color: MUTED, fontWeight: 300, marginBottom: 28 }}>{buildSubline}</div>
            <div style={{ height: 0.5, background: 'rgba(28,28,26,0.15)', marginBottom: 28 }} />
            <div style={{ ...sans, fontSize: 10, fontWeight: 600, color: MUTED, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 12 }}>
              {t.benchmark_suite}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
              <span style={{ ...mono, fontSize: 40, fontWeight: 500, color: INK, letterSpacing: '-1.5px', lineHeight: 1 }}>{selectedIds.length}</span>
              <span style={{ ...sans, fontSize: 13, color: MUTED, fontWeight: 300 }}>{`/ ${totalCount} ${t.selected_word}`}</span>
            </div>
            <div style={{ ...sans, fontSize: 12, color: MUTED, marginBottom: 24, fontWeight: 300 }}>
              {totalMin > 0 ? t.total_test_time(totalMin) : t.no_test_time}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 24, flex: 1 }}>
              {selectedList.length > 0 ? (
                selectedList.map((item, i) => (
                  <div
                    key={i}
                    style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '0.5px solid rgba(28,28,26,0.08)' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...sans, fontSize: 10, color: MUTED, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>{item.groupLabel}</div>
                      <div style={{ ...sans, fontSize: 13, color: INK, fontWeight: 400, lineHeight: 1.4 }}>{item.name}</div>
                    </div>
                    <div style={{ ...mono, fontSize: 11, color: MUTED, flexShrink: 0, paddingTop: 2, whiteSpace: 'nowrap' }}>{item.durationLabel}</div>
                  </div>
                ))
              ) : (
                <div style={{ ...sans, fontSize: 12, color: FAINT, fontWeight: 300, lineHeight: 1.6, padding: '12px 0' }}>{t.no_selection_msg}</div>
              )}
            </div>
            <button
              onClick={() => navigateTo(selectedIds)}
              style={{ width: '100%', padding: 15, background: MAROON, color: PANEL_BG, border: 'none', borderRadius: 2, ...sans, fontSize: 14, fontWeight: 500, cursor: 'pointer', letterSpacing: 0.3, marginBottom: 8 }}
            >
              {t.continue_checkout}
            </button>
            <button
              onClick={() => navigateTo([])}
              style={{ width: '100%', padding: 11, background: 'transparent', color: MUTED, border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 2, ...sans, fontSize: 12, cursor: 'pointer', marginBottom: 16 }}
            >
              {t.skip_benchmarks}
            </button>
            <TransitionLink href="/build" style={{ ...sans, fontSize: 12, color: MUTED, textDecoration: 'none' }}>
              {t.back_to_build}
            </TransitionLink>
          </div>

          {/* Right panel */}
          <div style={{ flex: 1, padding: isMobile ? '32px 20px 56px' : '48px 64px 80px', minWidth: 0, overflowY: 'auto', maxWidth: 1020 }}>
            {/* Step indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: isMobile ? 28 : 40, flexWrap: 'wrap' }}>
              {flowSteps.map((step, i) => {
                const bgColor = step.state !== 'upcoming' ? MAROON : 'transparent';
                const borderColor = step.state !== 'upcoming' ? MAROON : 'rgba(28,28,26,0.2)';
                const numColor = step.state !== 'upcoming' ? PANEL_BG : MUTED;
                const labelColor = step.state === 'active' ? INK : MUTED;
                const labelWeight = step.state === 'active' ? 500 : 400;
                return (
                  <div key={step.num} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8 }}>
                      <div style={{ width: isMobile ? 20 : 22, height: isMobile ? 20 : 22, borderRadius: '50%', background: bgColor, border: `0.5px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ ...mono, fontSize: 9, fontWeight: 500, color: numColor }}>{step.num}</span>
                      </div>
                      <span style={{ ...sans, fontSize: isMobile ? 11 : 12, fontWeight: labelWeight, color: labelColor, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>{step.label}</span>
                    </div>
                    {i < flowSteps.length - 1 && <div style={{ width: isMobile ? 20 : 40, height: 0.5, background: 'rgba(28,28,26,0.18)', margin: isMobile ? '0 8px' : '0 12px' }} />}
                  </div>
                );
              })}
            </div>

            {/* Header */}
            <div style={{ ...serif, fontSize: isMobile ? 30 : 44, fontWeight: 600, color: INK, letterSpacing: '-1px', marginBottom: 10, lineHeight: 1.1 }}>
              {t.choose_title_line1} <span style={{ fontStyle: 'italic', color: MAROON }}>{t.choose_title_em}</span>
            </div>
            <p style={{ ...sans, fontSize: isMobile ? 13 : 15, lineHeight: 1.7, color: MUTED, margin: '0 0 28px', maxWidth: 600, fontWeight: 300 }}>{t.choose_desc}</p>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 44 }}>
              <button
                onClick={selectRecommended}
                style={{ padding: '10px 18px', background: 'transparent', color: MAROON, border: '0.5px solid rgba(110,20,35,0.35)', borderRadius: 2, ...sans, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
              >
                {t.select_recommended}
              </button>
              <button
                onClick={clearAll}
                style={{ padding: '10px 18px', background: 'transparent', color: MUTED, border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 2, ...sans, fontSize: 12, cursor: 'pointer' }}
              >
                {t.clear_all}
              </button>
            </div>

            {/* FPS section */}
            <div style={{ ...sans, fontSize: 10, fontWeight: 600, color: MUTED, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 4 }}>{t.section_fps_title}</div>
            <div style={{ ...sans, fontSize: 12, color: FAINT, fontWeight: 300, marginBottom: 16 }}>{t.section_fps_desc}</div>
            <div style={{ background: PANEL_BG, border: '0.5px solid rgba(28,28,26,0.14)', borderRadius: 2, padding: isMobile ? '14px 16px' : '16px 18px', marginBottom: 20 }}>
              <div style={{ ...sans, fontSize: 10, fontWeight: 600, color: MUTED, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>{t.fps_source_title}</div>
              <div style={{ ...sans, fontSize: 12, color: MUTED, fontWeight: 300, lineHeight: 1.6, marginBottom: showFpsPicker ? 14 : 0 }}>{fpsSourceDesc}</div>
              {showFpsPicker && (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                  {needManualGpu && (
                    <div>
                      <div style={{ ...sans, fontSize: 9, fontWeight: 600, color: MUTED, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>GPU</div>
                      <select
                        value={manualGpuId}
                        onChange={(e) => setManualGpuId(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 2, fontSize: 12, background: PAGE_BG, color: INK, ...sans }}
                      >
                        {GPU_PARTS.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {needManualCpu && (
                    <div>
                      <div style={{ ...sans, fontSize: 9, fontWeight: 600, color: MUTED, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>CPU</div>
                      <select
                        value={manualCpuId}
                        onChange={(e) => setManualCpuId(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 2, fontSize: 12, background: PAGE_BG, color: INK, ...sans }}
                      >
                        {CPU_PARTS.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ ...cardGridStyle, marginBottom: 44 }}>{fpsCards.map(renderCard)}</div>

            {/* AAA section */}
            <div style={{ ...sans, fontSize: 10, fontWeight: 600, color: MUTED, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 4 }}>{t.section_aaa_title}</div>
            <div style={{ ...sans, fontSize: 12, color: FAINT, fontWeight: 300, marginBottom: 16 }}>{t.section_aaa_desc}</div>
            <div style={{ ...cardGridStyle, marginBottom: 44 }}>{aaaCards.map(renderCard)}</div>

            {/* Synthetic section */}
            <div style={{ ...sans, fontSize: 10, fontWeight: 600, color: MUTED, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 4 }}>{t.section_synth_title}</div>
            <div style={{ ...sans, fontSize: 12, color: FAINT, fontWeight: 300, marginBottom: 16 }}>{t.section_synth_desc}</div>
            <div style={cardGridStyle}>{synthCards.map(renderCard)}</div>
          </div>
        </div>
      </div>
      {exiting && <ExitOverlay label={t.preparing_checkout} />}
    </>
  );
}
