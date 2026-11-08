// Pure layout maths for the v2 configurator scene: given the case size and each part's
// real-mm dimensions, returns where every part sits. No three.js / WebGL here, so it is easy to reason
// about and to check. Frame (same as the production scene): X points from the motherboard tray (-X, the
// solid side) toward the glass panel (+X); Y is up; the case front is -Z and the rear (I/O side) is +Z.
import { DEFAULT_ALIGNMENT_TUNING, mmToUnits, type AlignmentTuning, type CompId, type DimensionSpec } from '@/lib/build-scene';
import {
  GPU_HEIGHT_MM,
  MOBO_FORM_FACTOR_SIZE_MM,
  PCIE_SLOT_PITCH_MM,
  PSU_ATX_SIZE_MM,
  RAM_DIMM_SIZE_MM,
  STORAGE_M2_SIZE_MM,
  type FanMountPosition,
} from '@/lib/component-db-seed';

export type V3 = [number, number, number];
export type Dims3 = { x: number; y: number; z: number };
export type CaseSize = { w: number; h: number; d: number };

// Admin's saved alignment (src/lib/supabase/alignment-tuning.ts), expressed as *offsets from the production
// defaults*. v2 lays parts out from real-mm maths, so the production absolute values (hand-tuned for the old
// meshes) can't be used as-is; what carries over is how far Admin moved something away from the default.
// Zero everywhere = Admin never touched it = v2's own layout unchanged.
export type LayoutTuning = {
  parts: Partial<Record<'cpu' | 'cooler' | 'ram' | 'storage' | 'gpu', V3>>; // per-part nudge (gpu: flat mount only)
  mobo: V3; // moves the board and everything mounted on it (cpu, cooler, ram, storage, flat gpu)
  gpuVertical: V3; // vertical / riser-mounted gpu nudge
  tubeRadiusScale: number;
  tubeSpacingScale: number;
  tubeBend: V3; // added to the AIO tubes' middle control point
};

export const NO_TUNING: LayoutTuning = { parts: {}, mobo: [0, 0, 0], gpuVertical: [0, 0, 0], tubeRadiusScale: 1, tubeSpacingScale: 1, tubeBend: [0, 0, 0] };

export type PartInputs = {
  specs: Partial<Record<CompId, DimensionSpec[]>>;
  cooler: { type: 'air' | 'aio'; radiatorMm: number; heightMm: number };
  ram: { sticks: number; slots: number };
  gpuVertical: boolean;
  tuning?: LayoutTuning;
};

export const DEFAULT_INPUTS: PartInputs = {
  specs: {},
  cooler: { type: 'air', radiatorMm: 360, heightMm: 158 },
  ram: { sticks: 2, slots: 4 },
  gpuVertical: false,
  tuning: NO_TUNING,
};

// Real AIO radiator thickness and the gap to the front panel — same values as the production scene
// (build-scene.ts: mmToUnits(27), FRONT_RADIATOR_CLEARANCE).
export const RADIATOR_THICKNESS_MM = 27;
const FRONT_RADIATOR_CLEARANCE = 0.02;

// Size (in scene units) of a part along an axis, from the real-mm DimensionSpec for that axis.
function axisUnits(specs: DimensionSpec[] | undefined, axis: 'x' | 'y' | 'z', fallbackMm: number): number {
  const s = specs?.find((sp) => sp.axis === axis && sp.scalesMesh !== false);
  return mmToUnits(s ? s.mm : fallbackMm);
}

export const MOBO_T = 0.05; // board thickness (units) — not a catalog dimension

export type Layout = {
  mobo: { pos: V3; dims: Dims3; slotZ: number[] };
  cpu: { pos: V3; dims: Dims3 };
  ram: { dims: Dims3; pos: V3[]; filled: number[] };
  gpu: { pos: V3; dims: Dims3; vertical: boolean }; // dims are in WORLD axes (already swapped when vertical)
  storage: { pos: V3; dims: Dims3 };
  psu: { pos: V3; dims: Dims3 };
  cooler: {
    anchor: V3; // air: tower centre; aio: pump centre
    radius: number; // aio pump radius
    towerLen: number; // air tower height along X
    // aio, case-frame. 'front' (default, as production): standing, length along Y, fans on its inner (+Z)
    // face. 'top': lying under the top panel, length along Z, fans underneath — used when the GPU needs the
    // front of the case (a vertical card, or a flat card long enough to reach the radiator).
    radiator: { pos: V3; length: number; thickness: number; fans: number; mount: 'front' | 'top' };
    tubes: { radiusScale: number; spacingScale: number; bend: V3 };
  };
  sideFanZ: number | null;
};

export function computeLayout(c: CaseSize, inp: PartInputs): Layout {
  const { w, h, d } = c;
  const atx = MOBO_FORM_FACTOR_SIZE_MM.ATX;

  // ---- motherboard: flush to the tray, rear-aligned, hanging from a gap under the top panel
  const moboDims: Dims3 = {
    x: MOBO_T,
    y: axisUnits(inp.specs.mobo, 'y', atx.width),
    z: axisUnits(inp.specs.mobo, 'z', atx.depth),
  };
  const moboX = -w / 2 + 0.03 + MOBO_T / 2;
  const top = h / 2 - 0.3;
  const moboY = top - moboDims.y / 2;
  const moboZ = d / 2 - 0.2 - moboDims.z / 2;
  const face = moboX + MOBO_T / 2; // x of the board's component face

  // ---- socket / RAM bank positions scale with the board so small form factors stay on the board
  const cy = top - 0.29 * moboDims.y;
  const cz = moboZ + 0.065 * moboDims.z;
  const slots = Math.max(1, inp.ram.slots);
  const slotSpacing = (slots <= 2 ? 0.11 : 0.052) * moboDims.z;
  const slotFirst = cz - 0.26 * moboDims.z;
  const slotZ = Array.from({ length: slots }, (_, i) => slotFirst - i * slotSpacing);

  const cpuDims: Dims3 = { x: 0.06, y: 0.42, z: 0.42 };
  const cpuPos: V3 = [face + 0.03, cy, cz];

  const ramDims: Dims3 = {
    x: axisUnits(inp.specs.ram, 'x', RAM_DIMM_SIZE_MM.height),
    y: axisUnits(inp.specs.ram, 'y', RAM_DIMM_SIZE_MM.length),
    z: 0.07,
  };
  const n = Math.max(1, Math.min(inp.ram.sticks, slots));
  const filled = slots <= 2 ? (n >= 2 ? [0, 1] : [0]) : n >= 4 ? [0, 1, 2, 3] : n === 3 ? [0, 1, 2] : n === 2 ? [1, 3] : [1];
  // Keep the stick (and its slot) on the board: a 133 mm DIMM on a 170 mm Mini-ITX board must sit lower than on ATX.
  const ramY = Math.min(cy, top - ramDims.y / 2);
  const ramPos: V3[] = slotZ.map((z) => [face + 0.02 + ramDims.x / 2, ramY, z]);

  // ---- gpu: lower PCIe slot (horizontal) or standing in the glass-side chamber (riser / vertical)
  const gH = axisUnits(inp.specs.gpu, 'x', GPU_HEIGHT_MM);
  const gLen = axisUnits(inp.specs.gpu, inp.gpuVertical ? 'y' : 'z', 300);
  const gThick = axisUnits(inp.specs.gpu, inp.gpuVertical ? 'z' : 'y', 2.5 * PCIE_SLOT_PITCH_MM);
  const gpuDims: Dims3 = inp.gpuVertical ? { x: gH, y: gLen, z: gThick } : { x: gH, y: gThick, z: gLen };
  const frontGapMidZ = (-d / 2 + (moboZ - moboDims.z / 2)) / 2;
  const gpuPos: V3 = inp.gpuVertical
    ? [w / 2 - 0.08 - gH / 2, Math.min(-h / 2 + 0.15 + gLen / 2, h / 2 - gLen / 2 - 0.1), Math.max(-d / 2 + gThick / 2 + 0.05, frontGapMidZ)]
    : [face + 0.03 + gH / 2, moboY - 0.155 * moboDims.y - gThick / 2, d / 2 - 0.12 - gLen / 2];

  // ---- storage (M.2 stick on the board) and PSU (basement, rear)
  const stoDims: Dims3 = { x: 0.04, y: axisUnits(inp.specs.storage, 'y', STORAGE_M2_SIZE_MM.width), z: axisUnits(inp.specs.storage, 'z', STORAGE_M2_SIZE_MM.length) };
  const stoPos: V3 = [face + 0.04, moboY - 0.1 * moboDims.y, cz];
  const psuDims: Dims3 = {
    x: axisUnits(inp.specs.psu, 'x', PSU_ATX_SIZE_MM.width),
    y: axisUnits(inp.specs.psu, 'y', PSU_ATX_SIZE_MM.height),
    z: axisUnits(inp.specs.psu, 'z', 160),
  };
  const psuPos: V3 = [0, -h / 2 + 0.04 + psuDims.y / 2, d / 2 - 0.1 - psuDims.z / 2];

  // ---- cooler
  const towerLen = mmToUnits(inp.cooler.heightMm);
  const radT = mmToUnits(RADIATOR_THICKNESS_MM);
  const RAD_FAN_DEPTH = 0.14; // fan stack in front of the radiator's inner face
  const radInnerZ = -d / 2 + FRONT_RADIATOR_CLEARANCE + radT + RAD_FAN_DEPTH;
  const gpuFrontZ = inp.gpuVertical ? gpuPos[2] - gThick / 2 : gpuPos[2] - gLen / 2;
  const radMount: 'front' | 'top' = gpuFrontZ < radInnerZ + 0.02 ? 'top' : 'front';
  const radLen = Math.min(mmToUnits(inp.cooler.radiatorMm), Math.max(0.6, radMount === 'front' ? h - 0.3 : d - 0.5));
  const radPos: V3 = radMount === 'front' ? [0, 0, -d / 2 + FRONT_RADIATOR_CLEARANCE + radT / 2] : [0.2, h / 2 - 0.06 - radT / 2, -d / 2 + 0.25 + radLen / 2];
  const aioFans = Math.max(1, Math.round(inp.cooler.radiatorMm / 120));
  const coolerAnchor: V3 = inp.cooler.type === 'aio' ? [cpuPos[0] + 0.03 + 0.08 + 0.02, cy, cz] : [cpuPos[0] + 0.03 + 0.02 + towerLen / 2, cy, cz];

  // ---- Admin alignment offsets (all zero unless Admin moved something)
  const t = inp.tuning ?? NO_TUNING;
  const add = (p: V3, ...o: (V3 | undefined)[]): V3 => o.reduce<V3>((a, v) => (v ? [a[0] + v[0], a[1] + v[1], a[2] + v[2]] : a), p);
  const onBoard = t.mobo;

  return {
    mobo: { pos: add([moboX, moboY, moboZ], onBoard), dims: moboDims, slotZ: slotZ.map((z) => z + onBoard[2]) },
    cpu: { pos: add(cpuPos, onBoard, t.parts.cpu), dims: cpuDims },
    ram: { dims: ramDims, pos: ramPos.map((p) => add(p, onBoard, t.parts.ram)), filled },
    gpu: { pos: inp.gpuVertical ? add(gpuPos, t.gpuVertical) : add(gpuPos, onBoard, t.parts.gpu), dims: gpuDims, vertical: inp.gpuVertical },
    storage: { pos: add(stoPos, onBoard, t.parts.storage), dims: stoDims },
    psu: { pos: psuPos, dims: psuDims },
    cooler: {
      anchor: add(coolerAnchor, onBoard, t.parts.cooler),
      radius: 0.24,
      towerLen,
      radiator: { pos: radPos, length: radLen, thickness: radT, fans: Math.max(1, Math.min(aioFans, Math.floor(radLen / mmToUnits(120) + 0.15))), mount: radMount },
      tubes: { radiusScale: t.tubeRadiusScale, spacingScale: t.tubeSpacingScale, bend: t.tubeBend },
    },
    sideFanZ: frontGapMidZ,
  };
}

// Fan-mount position -> placement (same rules as the production scene's fanTransform): fans sit just
// outside the panel they mount on, facing outward; 'side' fans sit inside on the tray wall.
export function fanTransform(
  position: FanMountPosition,
  index: number,
  count: number,
  c: CaseSize,
  sizeMm: number,
  sideCenterZ?: number,
): { pos: V3; rot: V3 } {
  const { w, h, d } = c;
  const gap = 0.04;
  const along = (span: number) => {
    const step = span / (count + 1);
    return span / 2 - step * (index + 1);
  };
  switch (position) {
    case 'front':
      return { pos: [0, along(h), -d / 2 - gap], rot: [0, Math.PI, 0] };
    case 'rear':
      return { pos: [0, along(h), d / 2 + gap], rot: [0, 0, 0] };
    case 'top':
      return { pos: [0, h / 2 + gap, along(d)], rot: [-Math.PI / 2, 0, 0] };
    case 'bottom':
      return { pos: [0, -h / 2 - gap, along(d)], rot: [Math.PI / 2, 0, 0] };
    case 'side': {
      const size = mmToUnits(sizeMm);
      return { pos: [-w / 2 + size * 0.105 + gap, along(h), sideCenterZ ?? -d / 2 + size / 2 + gap], rot: [0, Math.PI / 2, 0] };
    }
  }
}

// Production alignment (absolute values, as saved by Admin per motherboard form factor) -> v2 offsets.
// Same frame as production: X toward the glass, Y up, -Z front. Larger moboRearClearance pulls the board
// away from the rear wall (-Z); larger moboSideClearance pushes it off the tray (+X); larger gpuSideClearance
// moves a vertical card away from the glass (-X); larger gpuVerticalBottomClearance lifts it (+Y).
export function tuningFromAlignment(a: AlignmentTuning): LayoutTuning {
  const D = DEFAULT_ALIGNMENT_TUNING;
  const delta = (v: [number, number, number], base: [number, number, number]): V3 => [v[0] - base[0], v[1] - base[1], v[2] - base[2]];
  const parts: LayoutTuning['parts'] = {};
  (['cpu', 'cooler', 'ram', 'storage', 'gpu'] as const).forEach((id) => {
    const d = delta(a.basePos[id], D.basePos[id]);
    if (d[0] || d[1] || d[2]) parts[id] = d;
  });
  return {
    parts,
    mobo: [a.moboSideClearance - D.moboSideClearance, 0, -(a.moboRearClearance - D.moboRearClearance)],
    gpuVertical: [-(a.gpuSideClearance - D.gpuSideClearance), a.gpuVerticalBottomClearance - D.gpuVerticalBottomClearance, 0],
    tubeRadiusScale: D.aioTubeRadius ? a.aioTubeRadius / D.aioTubeRadius : 1,
    tubeSpacingScale: D.aioTubeSpacing ? a.aioTubeSpacing / D.aioTubeSpacing : 1,
    tubeBend: [a.aioBendOffset[0], a.aioBendOffset[1], a.aioBendOffset[2]],
  };
}
