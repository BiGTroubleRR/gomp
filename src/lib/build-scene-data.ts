// Pure data + helpers for the 3D configurator (slot ids, case/part sizes, dimension specs, RAM math...).
// Split out of build-scene.ts so pages can import these WITHOUT pulling three.js into their initial JavaScript;
// build-scene.ts re-exports everything below, so existing imports keep working.
import {
  RAM_DIMM_SIZE_MM,
  MOBO_FORM_FACTOR_SIZE_MM,
  STORAGE_M2_SIZE_MM,
  PSU_ATX_SIZE_MM,
  GPU_HEIGHT_MM,
  PCIE_SLOT_PITCH_MM,
  type Component,
} from './component-db-seed';

export type CompId = 'mobo' | 'cpu' | 'cooler' | 'ram' | 'gpu' | 'storage' | 'psu' | 'case';
export const SLOTS: CompId[] = ['mobo', 'cpu', 'cooler', 'ram', 'gpu', 'storage', 'psu', 'case'];

// The BASE_POS entries Admin's alignment panel can adjust — gpu moves with this group in its
// normal (horizontal) mount, same as cpu/cooler/ram/storage; mobo/psu use separate anchoring
// mechanisms (moboAnchoredX/Z, psuAnchoredY/Z) so aren't included. gpu's *vertical* (riser-mount
// case) mount stays separately anchored — see gpuSideClearance/gpuVerticalBottomClearance below.
export type AlignmentTunableId = 'cpu' | 'cooler' | 'ram' | 'storage' | 'gpu';
export type AlignmentTuning = {
  basePos: Record<AlignmentTunableId, [number, number, number]>;
  moboRearClearance: number;
  moboSideClearance: number;
  gpuSideClearance: number;
  gpuVerticalBottomClearance: number;
  aioTubeSpacing: number;
  aioTubeRadius: number;
  aioBendOffset: [number, number, number];
};

// mobo/cpu/cooler/ram are all mounted flush on the motherboard's own face, so they share a Z
// shift toward the case's rear panel — a real board's rear I/O sits flush against that wall,
// not centered front-to-back the way the old z≈0 values had it. These three Z values are only
// ever read as *relative offsets from BASE_POS.mobo's own Z* (see resetComponentPositions and
// moboAnchoredZ below) — the group's actual world Z is pinned to the selected case's real rear
// wall (z=+d/2, see buildCase's `front`/`rear` panels) at runtime, not to this constant.
// ram sits beside the CPU (same Y as cpu, offset further along Z — real DIMM slots run down
// the board next to the socket, not above it) rather than stacked on a separate Y band above
// it: an earlier revision pulled ram apart from cpu along Y instead of Z to fix an overlap,
// which put the whole kit up near the board's own top edge — fine at the placeholder's old,
// undersized length, but once the RAM slot outline fix (see ramSlotOutlineGroup below) made an
// installed stick's real mm-accurate length correct, that same Y put it past the board's own
// top edge, AND still directly above the CPU instead of beside it, as a real board has it.
// gpu's Z is no longer a raw offset from mobo like the others — it's the rear-wall clearance
// gpuAnchoredZ() reads directly (see below), matching moboRearClearance/PSU_REAR_CLEARANCE's own
// ~0.04 scale. X/Y stay genuine mobo-relative offsets (the card still has to line up with the
// PCIe slot's actual position on the board).
// cooler's X used to be -0.42 (tuned for the old buildAirCoolerMesh, which centered its own
// height span around the group's local origin — so this constant placed that *midpoint*, not the
// base plate, a real distance from the CPU). The rewritten mesh anchors its base's CPU-facing
// surface at its own local X=0 instead (see buildAirCoolerMesh's comment), so this now needs to
// place the base right up against the CPU's own contact face — calculated from the CPU mesh's own
// geometry (die box centered at its group origin, contact face at local X=+0.05):
// BASE_POS.cpu[0] + 0.05 = -0.73. Nudge via Admin's alignment panel if a visual check shows a gap.
export const BASE_POS: Record<Exclude<CompId, 'case'>, [number, number, number]> = {
  mobo: [-0.88, 0.2, -0.35],
  cpu: [-0.78, 0.55, -0.25],
  cooler: [-0.73, 0.65, -0.25],
  ram: [-0.8, 0.55, -0.88],
  gpu: [-0.45, -0.5, 0.04],
  storage: [-0.8, 0.08, 0.37],
  psu: [0.1, -1.88, 0.0],
};

// The out-of-the-box values for everything Admin's alignment panel can override — both the
// scene's own per-instance starting point (cloned fresh in createBuildScene below) and, on the
// Admin side, what a blank/partial saved row falls back to for any field that's never been
// customized. Single source of truth so the two never drift apart.
export const DEFAULT_ALIGNMENT_TUNING: AlignmentTuning = {
  basePos: {
    cpu: [...BASE_POS.cpu],
    cooler: [...BASE_POS.cooler],
    ram: [...BASE_POS.ram],
    storage: [...BASE_POS.storage],
    gpu: [...BASE_POS.gpu],
  } as Record<AlignmentTunableId, [number, number, number]>,
  moboRearClearance: 0.04,
  moboSideClearance: 0.18,
  gpuSideClearance: 0.04,
  gpuVerticalBottomClearance: 0.04,
  aioTubeSpacing: 0.05,
  aioTubeRadius: 0.016,
  aioBendOffset: [0, 0, 0],
};

// Riser-mounted vertical-GPU cases (NZXT H1 V2 and similar dual-chamber designs) put the card
// in its own chamber, upright, opposite the motherboard tray — the horizontal BASE_POS.gpu
// above puts a real-length card outside a case this shallow, since gpu length maps to world Z
// (case depth) there. This is the card's position/orientation for that chamber instead.
export const GPU_VERTICAL_POS: [number, number, number] = [0.55, 0, 0];

// Category-bucket fallback, used only when a specific case has no real dimensions on file yet
// (e.g. a newly admin-added case). Calibrated against real mid-tower dimensions (~105mm/unit —
// see MM_PER_UNIT) so the fallback and real-dimension paths produce comparably-sized cases.
// Exported so Admin's alignment panel can show real depth-mm reference numbers next to the GPU's
// rear-clearance control, instead of duplicating these figures.
export const SIZES: Record<string, { w: number; h: number; d: number }> = {
  'Full Tower': { w: 2.3, h: 5.5, d: 4.6 },
  'Mid Tower': { w: 2.0, h: 4.5, d: 4.2 },
  'Mini Tower': { w: 1.7, h: 3.9, d: 3.8 },
  SFF: { w: 1.4, h: 3.2, d: 1.4 },
};

// mm-per-scene-unit — the single absolute scale every component AND the case are sized in, so
// a part's rendered size and its quoted dimension always agree regardless of which case is
// picked (a bigger case just means more empty space around the same real-size parts).
export const MM_PER_UNIT = 105;
export function mmToUnits(mm: number): number {
  return mm / MM_PER_UNIT;
}


export type SizeScale = { x: number; y: number; z: number };

// ---------------------------------------------------------------------------
// Blueprint-style dimension annotations — quoted measurements (extension
// ticks + a dimension line + a centered "N.N cm" label) next to a part or the
// reference can, the way an engineering drawing calls out a measurement.
// These are independent scene objects (not children of the animated
// component groups), sized directly from real mm data via mmToUnits, so they
// stay correctly sized and legible regardless of how a placeholder mesh's own
// sizeScale happens to be animating.
// ---------------------------------------------------------------------------
// scalesMesh: false marks a spec that should still draw its annotation but must NOT drive the
// placeholder mesh's scale via the generic per-axis pipeline — e.g. an AIO's radiator now has
// real geometry (see buildAioCoolerMesh), but it's built directly at its true mm length at
// rebuild time (setSizeScale's cooler branch), not resized afterward — the generic pipeline
// would stretch the WHOLE cooler group (pump and LCD included) to match a 360mm target, which is
// wrong for parts that don't actually grow with the radiator. lineLengthMm overrides how long
// the tick+line itself is drawn, independent of `mm` (which always drives the label text) — for
// that same radiator case, the tick is a small fixed length rather than spanning the real
// (already fully baked into the mesh) radiator length.
// annotate: false marks a spec that should still drive the placeholder mesh's scale (so the
// part's footprint in the scene stays physically correct) but must NOT draw a blueprint
// annotation or quote a label — the opposite of scalesMesh: false above. Used for motherboards,
// whose form factor (ATX/mATX/E-ATX/Mini-ITX) already implies the size class, so quoting exact
// cm figures on top of that is redundant.
export type DimensionSpec = { axis: 'x' | 'y' | 'z'; mm: number; label?: string; scalesMesh?: boolean; lineLengthMm?: number; annotate?: boolean };

// mm -> a "N.N cm" string, the unit every dimension in the Build page (side panel, hover
// tooltip, and the 3D blueprint annotations) is shown in.
export function cm(mm: number): string {
  return `${(mm / 10).toFixed(1)} cm`;
}

// Real per-SKU dimensions when the selected case has them (sourced from buildcores-open-db —
// see the attribution note on /about), falling back to the old category-bucket size for a case
// that doesn't (e.g. one added in Admin without dimension fields filled in yet).
export function caseUnitsFor(comp: Component | undefined, category: string) {
  if (comp?.caseWidthMm && comp?.caseHeightMm && comp?.caseDepthMm) {
    return { w: mmToUnits(comp.caseWidthMm), h: mmToUnits(comp.caseHeightMm), d: mmToUnits(comp.caseDepthMm) };
  }
  return SIZES[category] || SIZES['Mid Tower'];
}

// Every RAM row's specs string leads with "N×..." (e.g. "2×16GB · CL32") — read straight off
// that rather than adding a dedicated column, since every curated and bulk-imported RAM row
// already follows this format. Falls back to 2 (the most common kit) if unparseable.
export function ramModuleCount(comp: Component): number {
  const m = comp.specs.match(/^(\d+)\s*×/);
  return m ? Number(m[1]) : 2;
}

// Per-stick capacity (not total kit capacity) — the number right after the "N×" that
// ramModuleCount reads, e.g. "2×16GB · CL32" -> 16. Used by the /build RAM picker's stage-2
// stick-count buttons to tell apart same-brand+speed+count rows that differ only in capacity
// (e.g. 2×16GB vs 2×32GB), the same distinction ramFamily's own middle segment encodes.
export function ramPerStickCapacityGB(comp: Component): number | null {
  const m = comp.specs.match(/^\d+\s*×\s*(\d+)\s*GB/i);
  return m ? Number(m[1]) : null;
}

// Real DIMM slot count by form factor — every Mini-ITX board in the catalog has 2 (there's no
// room for more), every ATX/mATX/E-ATX board has 4. No per-SKU data needed since this holds for
// every real board at each of those sizes.
export function moboRamSlotCount(mobo: Component | undefined): number {
  if (!mobo) return 0;
  return mobo.formFactor === 'Mini-ITX' ? 2 : 4;
}

// Every category's real physical dimension(s) — case/gpu/cooler/psu from the per-SKU data
// sourced from buildcores-open-db, mobo/cpu/ram/storage from the standardized form-factor/
// socket tables in component-db-seed.ts (real, industry-standard sizes that barely vary within
// a form factor, so a per-SKU fetch wouldn't add anything). Returns [] when nothing is known
// yet (e.g. an Admin-added case with no dimensions filled in).
export function dimensionSpecsFor(id: CompId, comp: Component | undefined, gpuVertical = false): DimensionSpec[] {
  if (!comp) return [];
  if (id === 'case' && comp.caseWidthMm && comp.caseHeightMm && comp.caseDepthMm) {
    return [
      { axis: 'x', mm: comp.caseWidthMm },
      { axis: 'y', mm: comp.caseHeightMm },
      { axis: 'z', mm: comp.caseDepthMm },
    ];
  }
  // Length is the only per-SKU-varying axis the placeholder mesh used to scale — height and
  // thickness stayed frozen at the mesh's own arbitrary baked proportions regardless of card
  // length, which is exactly what made longer cards look like an ever-thinner stick. Height
  // barely varies by real-world card at all (see GPU_HEIGHT_MM), so it's a flat constant rather
  // than a per-SKU field; thickness reuses the already-existing (and previously unused)
  // gpuSlotWidth. Height always lands on world x regardless of vertical-mount orientation —
  // setGpuOrientation (below) rotates the wrapper about world X, which never moves x itself —
  // while length/thickness are the pair that swap between y/z depending on gpuVertical.
  if (id === 'gpu' && comp.gpuLengthMm) {
    const lengthAxis = gpuVertical ? 'y' : 'z';
    const thicknessAxis = gpuVertical ? 'z' : 'y';
    return [
      { axis: lengthAxis, mm: comp.gpuLengthMm },
      { axis: 'x', mm: comp.gpuWidthMm ?? GPU_HEIGHT_MM, annotate: false },
      ...(comp.gpuSlotWidth ? [{ axis: thicknessAxis, mm: comp.gpuSlotWidth * PCIE_SLOT_PITCH_MM, annotate: false } as DimensionSpec] : []),
    ];
  }
  if (id === 'cooler') {
    // comp.coolerType, when an admin has explicitly set it, decides which shape to return outright
    // — same priority order setSizeScale uses for the actual 3D-model swap, so the two can't
    // disagree about which variant is installed. Falls back to the old radiatorMm/heightMm-presence
    // detection only when coolerType is unset (pre-migration rows, or a cooler nobody has switched
    // yet).
    const isAio = comp.coolerType ? comp.coolerType === 'aio' : !!comp.coolerRadiatorMm;
    if (isAio && comp.coolerRadiatorMm) return [{ axis: 'x', mm: comp.coolerRadiatorMm, label: `Ø ${cm(comp.coolerRadiatorMm)}`, scalesMesh: false, lineLengthMm: 40, annotate: false }];
    // 'x', not 'y' — buildAirCoolerMesh() builds its height (base-to-fin-stack) along local X now,
    // matching the file-wide "X = away from the motherboard face" convention (see that function's
    // own comment for why). sizeScaleFromSpecs is axis-generic, so this one label is what actually
    // makes the real-mm rescale and the on-screen dimension annotation land on the right axis.
    if (!isAio && comp.coolerHeightMm) return [{ axis: 'x', mm: comp.coolerHeightMm }];
  }
  if (id === 'psu' && comp.psuLengthMm) {
    return [
      { axis: 'z', mm: comp.psuLengthMm },
      { axis: 'x', mm: PSU_ATX_SIZE_MM.width },
      { axis: 'y', mm: PSU_ATX_SIZE_MM.height },
    ];
  }
  if (id === 'mobo' && comp.formFactor) {
    const size = MOBO_FORM_FACTOR_SIZE_MM[comp.formFactor];
    return size ? [{ axis: 'y', mm: size.width, annotate: false }, { axis: 'z', mm: size.depth, annotate: false }] : [];
  }
  // Length is standardized (every desktop DIMM is 133.35mm regardless of capacity/speed/tier),
  // so annotating it is just noise — annotate: false still keeps it driving the mesh's Y scale,
  // it just stops drawing a blueprint line/label for a number that's the same on every kit.
  // Height is the one that actually varies (bare PCB vs. a tall RGB heatsink) and the one that
  // matters — a tall kit can collide with a big air cooler's fins — so it's the only annotation.
  if (id === 'ram') return [{ axis: 'y', mm: RAM_DIMM_SIZE_MM.length, annotate: false }, { axis: 'x', mm: comp.ramHeightMm ?? RAM_DIMM_SIZE_MM.height }];
  // Every M.2 drive in this catalog is the same fixed 2280 size (unlike RAM's height, nothing
  // here varies by SKU at all), so there's nothing worth calling out with a blueprint line —
  // annotate: false still scales the mesh to the right (fixed) size, it just draws no label.
  if (id === 'storage') return [{ axis: 'z', mm: STORAGE_M2_SIZE_MM.length, annotate: false }, { axis: 'y', mm: STORAGE_M2_SIZE_MM.width, annotate: false }];
  return [];
}


export { SIZES as CASE_SIZES };
