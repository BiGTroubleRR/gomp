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

// Where the case lets an AIO radiator stand, in order of preference (see radiatorMountsFor in fit.ts). 'top' is always
// the last resort when the preferred mount is blocked.
export type RadiatorMount = 'front' | 'side' | 'top';

export type PartInputs = {
  specs: Partial<Record<CompId, DimensionSpec[]>>;
  cooler: { type: 'air' | 'aio'; radiatorMm: number; heightMm: number };
  ram: { sticks: number; slots: number };
  gpuVertical: boolean;
  radiatorMounts?: RadiatorMount[];
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
// Radiator width (one 120 mm fan wide, a little narrower than the fan frame) — shared with the part builder.
export const RADIATOR_WIDTH = mmToUnits(120) * 0.94;
const FRONT_RADIATOR_CLEARANCE = 0.02;

// Size (in scene units) of a part along an axis, from the real-mm DimensionSpec for that axis.
function axisUnits(specs: DimensionSpec[] | undefined, axis: 'x' | 'y' | 'z', fallbackMm: number): number {
  const s = specs?.find((sp) => sp.axis === axis && sp.scalesMesh !== false);
  return mmToUnits(s ? s.mm : fallbackMm);
}

export const MOBO_T = 0.05; // board thickness (units) — not a catalog dimension

export type Layout = {
  caseSize: CaseSize; // needed to keep hoses inside the case
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
    radiator: { pos: V3; length: number; thickness: number; fans: number; mount: RadiatorMount };
    tubes: { radiusScale: number; spacingScale: number; bend: V3 };
  };
  sideFanZ: number | null;
  // Free depth range (z0..z1) beside the board, in front of it AND in front of a flat card's nose, where side
  // fans can sit without cutting through the GPU. Null when there is none to speak of.
  sideFanRange: [number, number] | null;
};

// Real AIO hoses are about 400 mm (240 mm and larger) or ~300 mm (120 / 140 mm units); the pump has to reach the
// radiator's fittings in a straight-ish line with a little slack for the bend, so ~95 % of the hose length is the
// farthest the fittings can be from the pump.
export function aioHoseReachUnits(radiatorMm: number): number {
  return mmToUnits((radiatorMm >= 240 ? 400 : 300) * 0.95);
}

// Straight distance from the pump to the radiator fittings (the middle of the two ports).
export function aioHoseDistance(L: Layout): number {
  const { ports } = aioHose(L);
  const a = L.cooler.anchor;
  const mid: V3 = [(ports[0][0] + ports[1][0]) / 2, (ports[0][1] + ports[1][1]) / 2, (ports[0][2] + ports[1][2]) / 2];
  return Math.hypot(mid[0] - a[0], mid[1] - a[1], mid[2] - a[2]);
}

// Public entry: lays the parts out. For an AIO, if the hoses could not reach the radiator at the mount the case
// prefers (a big case: the front radiator is too far from the CPU), the radiator moves to the next mount the case can
// take and finally under the roof, above the board, where the hoses are short — as people do in real builds.
export function computeLayout(c: CaseSize, inp: PartInputs): Layout {
  const first = layoutFor(c, inp);
  if (inp.cooler.type !== 'aio') return first;
  const reach = aioHoseReachUnits(inp.cooler.radiatorMm);
  if (aioHoseDistance(first) <= reach) return first;
  const tried = new Set<RadiatorMount>([first.cooler.radiator.mount]);
  let best = first;
  let bestD = aioHoseDistance(first);
  for (const m of [...(inp.radiatorMounts ?? ['front']), 'top'] as RadiatorMount[]) {
    const L = layoutFor(c, inp, m);
    const mount = L.cooler.radiator.mount;
    if (tried.has(mount)) continue;
    tried.add(mount);
    const d = aioHoseDistance(L);
    if (d <= reach) return L;
    if (d < bestD) {
      best = L;
      bestD = d;
    }
  }
  return best;
}

function layoutFor(c: CaseSize, inp: PartInputs, forceMount?: RadiatorMount): Layout {
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
  const boardFrontZ = moboZ - moboDims.z / 2;
  const frontGapMidZ = (-d / 2 + boardFrontZ) / 2;
  const ramBottom = ramY - ramDims.y / 2; // a flat card must clear the DIMMs on short boards
  const gpuPos: V3 = inp.gpuVertical
    ? [w / 2 - 0.08 - gH / 2, Math.min(-h / 2 + 0.15 + gLen / 2, h / 2 - gLen / 2 - 0.1), Math.max(-d / 2 + gThick / 2 + 0.05, frontGapMidZ)]
    : [face + 0.03 + gH / 2, Math.min(moboY - 0.155 * moboDims.y - gThick / 2, ramBottom - 0.02 - gThick / 2), d / 2 - 0.12 - gLen / 2];

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
  // 'side': standing against the tray wall in the free gap in front of the board and a flat card's nose, where cases
  // with a side fan column (e.g. Cooler Master Elite 600, Lian Li O11D) mount a radiator in place of those fans.
  const sideRange: [number, number] = [-d / 2 + 0.04, Math.min(boardFrontZ, inp.gpuVertical ? Infinity : gpuPos[2] - gLen / 2) - 0.03];
  const sideFits = sideRange[1] - sideRange[0] >= RADIATOR_WIDTH + 0.1;
  const frontFits = gpuFrontZ >= radInnerZ + 0.02;
  const radMount: RadiatorMount =
    [...(forceMount ? [forceMount] : []), ...(inp.radiatorMounts ?? ['front'])].find((m) => (m === 'front' ? frontFits : m === 'side' ? sideFits : true)) ?? 'top';
  const radLen = Math.min(mmToUnits(inp.cooler.radiatorMm), Math.max(0.6, radMount === 'top' ? d - 0.5 : h - 0.3));
  const radPos: V3 =
    radMount === 'front'
      ? [0, 0, -d / 2 + FRONT_RADIATOR_CLEARANCE + radT / 2]
      : radMount === 'side'
        ? [-w / 2 + 0.04 + radT / 2, 0, (sideRange[0] + sideRange[1]) / 2]
        : [0.2, h / 2 - 0.06 - radT / 2, -d / 2 + 0.25 + radLen / 2];
  const aioFans = Math.max(1, Math.round(inp.cooler.radiatorMm / 120));
  const coolerAnchor: V3 = inp.cooler.type === 'aio' ? [cpuPos[0] + 0.03 + 0.08 + 0.02, cy, cz] : [cpuPos[0] + 0.03 + 0.02 + towerLen / 2, cy, cz];

  // ---- Admin alignment offsets (all zero unless Admin moved something)
  const t = inp.tuning ?? NO_TUNING;
  const add = (p: V3, ...o: (V3 | undefined)[]): V3 => o.reduce<V3>((a, v) => (v ? [a[0] + v[0], a[1] + v[1], a[2] + v[2]] : a), p);
  const onBoard = t.mobo;

  return {
    caseSize: c,
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
    sideFanRange: sideRange,
  };
}

// AIO hoses: where they leave the radiator and the path they take to the pump. Real radiators have the two
// hose fittings on an END tank (a short end of the radiator), side by side across its thickness, on the edge
// that faces the board — never in the middle of the radiator. A standing (front) radiator uses its top end when
// that is above the pump (keeps the pump below the highest point of the loop), otherwise its bottom end; a radiator
// lying under the top panel uses the rear end, the one that faces the CPU. Everything here is in the case frame.
export type AioHose = { dir: V3; ports: [V3, V3]; paths: [V3[], V3[]] };
export function aioHose(L: Layout): AioHose {
  const r = L.cooler.radiator;
  const a = L.cooler.anchor;
  const t = L.cooler.tubes;
  // The two fittings sit well apart on the end tank (~36 mm between centres), along the radiator's width and not
  // across its thin side, so the hoses do not run touching each other.
  const sp = 0.17 * t.spacingScale; // half the gap between the two fittings
  const xc = r.pos[0] - RADIATOR_WIDTH / 2 + 0.42; // toward the board side of the end tank
  let dir: V3;
  let ports: [V3, V3];
  if (r.mount === 'front' || r.mount === 'side') {
    const up = r.pos[1] + r.length / 2 > a[1] + 0.3 ? 1 : -1;
    const y = r.pos[1] + (up * r.length) / 2;
    dir = [0, up, 0];
    if (r.mount === 'front') ports = [[xc - sp, y, r.pos[2]], [xc + sp, y, r.pos[2]]];
    else {
      const zc = r.pos[2] + RADIATOR_WIDTH / 2 - 0.42; // toward the pump (rear) side of the end tank
      ports = [[r.pos[0], y, zc - sp], [r.pos[0], y, zc + sp]];
    }
  } else {
    const z = r.pos[2] + r.length / 2;
    dir = [0, 0, 1];
    ports = [[xc - sp, r.pos[1], z], [xc + sp, r.pos[1], z]];
  }
  const pumpZ = r.mount === 'top' ? 0.12 : -0.12;
  const paths = [0, 1].map((k) => {
    const o = (k === 0 ? -0.17 : 0.17) * t.spacingScale;
    const p0: V3 = [a[0] + 0.09, a[1] + o, a[2] + pumpZ];
    const e = ports[k];
    // straight run out of the end tank, shortened when the radiator end is close to the case wall
    const room = dir[1] > 0 ? L.caseSize.h / 2 - e[1] : dir[1] < 0 ? e[1] + L.caseSize.h / 2 : L.caseSize.d / 2 - e[2];
    const stub = Math.max(0.05, Math.min(0.35, room - 0.08));
    const s: V3 = [e[0] + dir[0] * stub, e[1] + dir[1] * stub, e[2] + dir[2] * stub];
    // The hoses rise off the pump toward the glass first, so they pass in FRONT of the RAM and a flat graphics card
    // (as in real builds) instead of through them, and stay inside the case.
    const ramTop = L.ram.pos[0][0] + L.ram.dims.x / 2;
    const gpuTop = L.gpu.vertical ? -Infinity : L.gpu.pos[0] + L.gpu.dims.x / 2;
    const xHigh = Math.min(Math.max(p0[0] + 0.35, ramTop + 0.12, gpuTop + 0.12 + k * 0.1), L.caseSize.w / 2 - 0.2);
    const q: V3 = [xHigh, p0[1], p0[2]];
    const apart = (k === 0 ? -0.1 : 0.1) * t.spacingScale; // keeps the two hoses clearly separate along the whole run
    const m: V3 = [xHigh + t.bend[0], (p0[1] + s[1]) / 2 + apart + t.bend[1], (p0[2] + s[2]) / 2 + t.bend[2]];
    return [p0, q, m, s, e];
  }) as [V3[], V3[]];
  return { dir, ports, paths };
}

// Fan-mount position -> placement (same rules as the production scene's fanTransform): fans sit just
// outside the panel they mount on, facing outward; 'side' fans sit inside on the tray wall.
export function fanTransform(
  position: FanMountPosition,
  index: number,
  count: number,
  c: CaseSize,
  sizeMm: number,
  sideRange?: [number, number] | null,
): { pos: V3; rot: V3; diameter: number } {
  const { w, h, d } = c;
  const gap = 0.04;
  const size = mmToUnits(sizeMm);
  // Fans sit edge to edge (pitch = one fan diameter) in a column centred on the panel — like real stacked
  // 120/140 mm fans. If the catalogue lists more / bigger fans than the panel can take, the fans shrink to
  // fit instead of overlapping each other or hanging off the case.
  const spanOf = (span: number) => {
    const diameter = Math.min(size, span / count);
    return { diameter, along: ((count - 1) / 2 - index) * diameter };
  };
  switch (position) {
    case 'front': {
      const s = spanOf(h);
      return { pos: [0, s.along, -d / 2 - gap], rot: [0, Math.PI, 0], diameter: s.diameter };
    }
    case 'rear': {
      const s = spanOf(h);
      return { pos: [0, s.along, d / 2 + gap], rot: [0, 0, 0], diameter: s.diameter };
    }
    case 'top': {
      const s = spanOf(d);
      return { pos: [0, h / 2 + gap, s.along], rot: [-Math.PI / 2, 0, 0], diameter: s.diameter };
    }
    case 'bottom': {
      const s = spanOf(d);
      return { pos: [0, -h / 2 - gap, s.along], rot: [Math.PI / 2, 0, 0], diameter: s.diameter };
    }
    case 'side': {
      const s = spanOf(h);
      if (!sideRange) return { pos: [-w / 2 + s.diameter * 0.105 + gap, s.along, -d / 2 + s.diameter / 2 + gap], rot: [0, Math.PI / 2, 0], diameter: s.diameter };
      // Fit between the front panel and whatever is in the way (board front / a flat card's nose); too little room = no fan.
      const room = sideRange[1] - sideRange[0];
      const diameter = room < 0.45 ? 0 : Math.min(s.diameter, room);
      const along = ((count - 1) / 2 - index) * diameter;
      return { pos: [-w / 2 + diameter * 0.105 + gap, along, (sideRange[0] + sideRange[1]) / 2], rot: [0, Math.PI / 2, 0], diameter };
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
