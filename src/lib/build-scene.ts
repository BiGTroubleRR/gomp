// Interactive three.js PC-builder scene for the Build page — ported from GOMP_Config.dc.html's
// inline three.js code. Instantiable (not module-singleton) so React can create/dispose it
// cleanly per mount via a useEffect. Owns the renderer/camera/scene/controls and every
// per-component mesh; exposes an imperative API the page's React state changes call into.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  RAM_DIMM_SIZE_MM,
  MOBO_FORM_FACTOR_SIZE_MM,
  STORAGE_M2_SIZE_MM,
  PSU_ATX_SIZE_MM,
  caseHasVerticalGpuMount,
  type FanMountPosition,
  type Component,
} from './component-db-seed';

export type CompId = 'mobo' | 'cpu' | 'cooler' | 'ram' | 'gpu' | 'storage' | 'psu' | 'case';
export const SLOTS: CompId[] = ['mobo', 'cpu', 'cooler', 'ram', 'gpu', 'storage', 'psu', 'case'];

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
const BASE_POS: Record<Exclude<CompId, 'case'>, [number, number, number]> = {
  mobo: [-0.88, 0.2, -0.35],
  cpu: [-0.78, 0.55, -0.25],
  cooler: [-0.42, 0.65, -0.25],
  ram: [-0.8, 0.55, -0.88],
  gpu: [-0.45, -0.5, 0.1],
  storage: [-0.8, 0.08, 0.37],
  psu: [0.1, -1.88, 0.0],
};

// Riser-mounted vertical-GPU cases (NZXT H1 V2 and similar dual-chamber designs) put the card
// in its own chamber, upright, opposite the motherboard tray — the horizontal BASE_POS.gpu
// above puts a real-length card outside a case this shallow, since gpu length maps to world Z
// (case depth) there. This is the card's position/orientation for that chamber instead.
const GPU_VERTICAL_POS: [number, number, number] = [0.55, 0, 0];

// Category-bucket fallback, used only when a specific case has no real dimensions on file yet
// (e.g. a newly admin-added case). Calibrated against real mid-tower dimensions (~105mm/unit —
// see MM_PER_UNIT) so the fallback and real-dimension paths produce comparably-sized cases.
const SIZES: Record<string, { w: number; h: number; d: number }> = {
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
// placeholder mesh's scale — e.g. an AIO's radiator length has no matching geometry on the
// pump-block placeholder mesh, so treating it as a real axis-length would balloon the whole
// part rather than actually depict a radiator. lineLengthMm overrides how long the tick+line
// itself is drawn, independent of `mm` (which always drives the label text) — for that same
// radiator case, the label must still quote the true 360mm spec, but the line has no real
// geometry to span, so it draws at a small placeholder length instead of stretching across
// the whole case.
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
  if (id === 'gpu' && comp.gpuLengthMm) return [{ axis: gpuVertical ? 'y' : 'z', mm: comp.gpuLengthMm }];
  if (id === 'cooler') {
    if (comp.coolerRadiatorMm) return [{ axis: 'x', mm: comp.coolerRadiatorMm, label: `Ø ${cm(comp.coolerRadiatorMm)}`, scalesMesh: false, lineLengthMm: 40 }];
    if (comp.coolerHeightMm) return [{ axis: 'y', mm: comp.coolerHeightMm }];
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

// Frees every geometry/material/texture attached under a scene root — three.js never does this
// on its own (removing an object from the scene graph just stops it rendering, it does not free
// its GPU-side buffers), so a scene torn down without this leaks VRAM on every mount/unmount.
function disposeSceneContents(root: THREE.Object3D) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (!material) return;
    (Array.isArray(material) ? material : [material]).forEach((m) => {
      Object.values(m).forEach((value) => {
        if (value instanceof THREE.Texture) value.dispose();
      });
      m.dispose();
    });
  });
}

const DIM_COLOR = 0xc4a35a; // GOMP gold — matches the site's accent color

// Text size scales with what's being measured — a case's "47.5 cm" label and a RAM stick's
// "3.1 cm" label were previously the same fixed size, which both crowded the small parts with
// oversized text and added to the overall "wall of numbers" feel. Clamped so a tiny part's
// label never becomes unreadable and a huge case's label never gets comically large; readers
// are expected to zoom in on small parts rather than have every label pinned to one size.
function makeTextSprite(text: string, targetHeight: number): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const scale = 4; // supersample so the label stays crisp when the camera zooms in
  canvas.width = 220 * scale;
  canvas.height = 56 * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.font = `${34 * scale}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8 * scale;
  ctx.strokeStyle = 'rgba(253,250,244,0.95)';
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = '#6E1423';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(material);
  const aspect = canvas.width / canvas.height;
  const height = Math.min(0.26, Math.max(0.05, targetHeight));
  sprite.scale.set(height * aspect, height, 1);
  return sprite;
}

// One quoted measurement: two short perpendicular extension ticks at the ends, a line joining
// them, and a centered cm label — built along `spec.axis` in local space, centered at origin
// (the caller positions the whole group flush against the measured object's edge).
function buildDimensionAnnotation(spec: DimensionSpec): THREE.Group {
  const group = new THREE.Group();
  const lengthUnits = mmToUnits(spec.lineLengthMm ?? spec.mm);
  const half = lengthUnits / 2;
  const tick = Math.min(0.05, lengthUnits * 0.15);
  const lineMat = new THREE.LineBasicMaterial({ color: DIM_COLOR, transparent: true, opacity: 0.85, depthTest: false });

  const axisVec = spec.axis === 'x' ? new THREE.Vector3(1, 0, 0) : spec.axis === 'y' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
  const tickVec = spec.axis === 'y' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);

  const main = new THREE.BufferGeometry().setFromPoints([axisVec.clone().multiplyScalar(-half), axisVec.clone().multiplyScalar(half)]);
  group.add(new THREE.Line(main, lineMat));

  [-half, half].forEach((p) => {
    const center = axisVec.clone().multiplyScalar(p);
    const capGeo = new THREE.BufferGeometry().setFromPoints([
      center.clone().addScaledVector(tickVec, -tick),
      center.clone().addScaledVector(tickVec, tick),
    ]);
    group.add(new THREE.Line(capGeo, lineMat));
  });

  const label = spec.label ?? `${(spec.mm / 10).toFixed(1)} cm`;
  const sprite = makeTextSprite(label, lengthUnits * 0.22);
  sprite.position.copy(tickVec.clone().multiplyScalar(tick * 2.4));
  group.add(sprite);

  return group;
}

// Builds every dimension callout for one part, positioned flush against the real edges of a
// box exactly the size of the part being measured — each line runs the object's full,
// correctly-centered length along its own axis, offset only on the OTHER two axes by a small
// fixed gap so it sits just outside that face rather than floating off to one side (the gap is
// a small constant regardless of part size, matching how extension lines work on a real
// blueprint — it doesn't scale up for a big case or shrink to nothing for a tiny RAM stick).
// Axes with no measurement of their own default to a small assumed half-extent so the gap still
// lands just outside a reasonable guess at that face, rather than at the object's exact center.
function buildDimensionSet(specs: DimensionSpec[]): THREE.Group {
  const set = new THREE.Group();
  const gap = 0.06;
  const defaultHalfExtentUnits = 0.09;
  const halfExtent: Record<'x' | 'y' | 'z', number> = { x: defaultHalfExtentUnits, y: defaultHalfExtentUnits, z: defaultHalfExtentUnits };
  specs.forEach((spec) => {
    halfExtent[spec.axis] = mmToUnits(spec.lineLengthMm ?? spec.mm) / 2;
  });

  specs.forEach((spec) => {
    if (spec.annotate === false) return;
    const annotation = buildDimensionAnnotation(spec);
    const pos = new THREE.Vector3(0, 0, 0);
    if (spec.axis !== 'x') pos.x = halfExtent.x + gap;
    if (spec.axis !== 'y') pos.y = -(halfExtent.y + gap);
    if (spec.axis !== 'z') pos.z = halfExtent.z + gap;
    annotation.position.copy(pos);
    set.add(annotation);
  });
  return set;
}

type ObjRecord = {
  mesh: THREE.Object3D;
  finalPos: THREE.Vector3;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  targetScale: THREE.Vector3;
  moveFrom?: THREE.Vector3;
  scaleFrom?: THREE.Vector3;
  moveStart?: number;
  moveDur?: number;
  exiting?: boolean;
  selected: boolean;
  baseMats: THREE.Material[];
  selMats: THREE.Material[];
  // Per-axis scale that makes the placeholder mesh's real-world footprint match the same mm
  // figures its dimension annotation quotes — see sizeScaleFromSpecs. {1,1,1} until the first
  // setSizeScale call for this part.
  sizeScale: SizeScale;
};

// 4 fixed local-Z positions for the ram mesh's DIMM slots (real motherboards have 2 or 4) —
// shared between the actual stick meshes and the standalone empty-slot outline group so both
// line up. Index 1/2 are the centered pair a 2-slot board (or a 2-stick kit on a 4-slot board)
// uses; 0/1/2/3 is a populated 4-slot board. Z (not X) because slots repeat across the
// motherboard's own face — mobo's local X is its face normal (thickness), so stacking slots
// along X would spread them out perpendicular to the board instead of side by side on it.
// Index 0 needs to land on the physically-left slot from the default camera angle — reversed
// from a naive ascending-Z order, which actually put index 0 on the right.
const RAM_SLOT_Z = [0.15, 0.05, -0.05, -0.15];

// A single DIMM stick, styled after G.Skill Trident Z's signature silhouette: a dark anodized
// heatsink shroud with a jagged "crown" of alternating-height teeth along the top ridge and a
// gold diffuser strip running underneath them (standing in for Trident Z's RGB light bar, in
// the site's own accent color rather than literal RGB). Built along local Y (length) / X
// (height, sticking up off the board) — X is every placeholder mesh's face-normal axis in this
// file (see mobo's own box, thin along X), and a real DIMM sticks up perpendicular to the
// board's face, so height has to ride the same axis as the board's normal for the two meshes
// to actually line up. Z is the thin card-thickness axis, doubling as the slot-repeat axis.
function buildRamStick(T: typeof THREE): THREE.Group {
  const g = new T.Group();
  const pcbMat = new T.MeshStandardMaterial({ color: 0x001825, roughness: 0.6 });
  const bodyMat = new T.MeshStandardMaterial({ color: 0x2a2530, roughness: 0.28, metalness: 0.75 });
  const toothMat = new T.MeshStandardMaterial({ color: 0x3d3648, roughness: 0.22, metalness: 0.85 });
  const goldMat = new T.MeshStandardMaterial({ color: 0xc4a35a, emissive: 0xc4a35a, emissiveIntensity: 0.8 });

  // Bare PCB edge peeking out below the heatsink shroud.
  const pcbHeight = 0.86;
  const pcb = new T.Mesh(new T.BoxGeometry(0.1, pcbHeight, 0.03), pcbMat);
  g.add(pcb);

  // Main heatsink shroud, sitting on top of (out from the board's face, along X) the PCB.
  const bodyHeight = 0.42;
  const bodyX = 0.05 + bodyHeight / 2;
  const body = new T.Mesh(new T.BoxGeometry(bodyHeight, pcbHeight, 0.05), bodyMat);
  body.position.x = bodyX;
  g.add(body);

  // Gold diffuser strip, right at the top edge of the shroud.
  const stripX = bodyX + bodyHeight / 2 + 0.015;
  const strip = new T.Mesh(new T.BoxGeometry(0.03, pcbHeight * 0.97, 0.052), goldMat);
  strip.position.x = stripX;
  g.add(strip);

  // Jagged crown: alternating-height teeth along the top ridge, sitting on the strip.
  const toothHeights = [0.09, 0.18, 0.1, 0.2, 0.1, 0.18, 0.09];
  const toothWidth = (pcbHeight * 0.94) / toothHeights.length;
  const toothBaseX = stripX + 0.015;
  toothHeights.forEach((h, i) => {
    const tooth = new T.Mesh(new T.BoxGeometry(h, toothWidth * 0.7, 0.05), toothMat);
    tooth.position.set(toothBaseX + h / 2, -pcbHeight * 0.47 + toothWidth * (i + 0.5), 0);
    g.add(tooth);
  });

  return g;
}

function buildComponentMesh(id: Exclude<CompId, 'case'>): THREE.Object3D {
  const T = THREE;
  switch (id) {
    case 'mobo': {
      const g = new T.Group();
      g.add(new T.Mesh(new T.BoxGeometry(0.04, 2.8, 1.5), new T.MeshStandardMaterial({ color: 0x0f2d19, roughness: 0.7 })));
      const vrm = new T.Mesh(new T.BoxGeometry(0.1, 0.4, 0.1), new T.MeshStandardMaterial({ color: 0x111120, roughness: 0.3, metalness: 0.7 }));
      vrm.position.set(0.07, 1.1, -0.55);
      g.add(vrm);
      const pcie = new T.Mesh(new T.BoxGeometry(0.06, 0.06, 0.88), new T.MeshStandardMaterial({ color: 0x22223a }));
      pcie.position.set(0.05, -0.48, 0.08);
      g.add(pcie);

      // Rear I/O shield: a backing plate plus a real-looking cluster of ports, modeled after a
      // real rear-IO photo (ASUS ProArt X870E-CREATOR) rather than a generic guess — a 2x3 USB-A
      // grid (teal, matching that shield's USB-A tint), dual ethernet, an audio-jack trio,
      // HDMI + DisplayPort, and a USB-C pair — so a bare board doesn't read as an oddly
      // featureless slab before a case/cables give it visual context. Sits level with the CPU
      // (same local Y band) on the side opposite the RAM slots, since the real shield runs down
      // the same edge the CPU socket is closest to, not up near the board's top edge.
      const shieldMat = new T.MeshStandardMaterial({ color: 0x8a8a90, roughness: 0.3, metalness: 0.85 });
      const portMat = new T.MeshStandardMaterial({ color: 0x141414, roughness: 0.4, metalness: 0.5 });
      const usbMat = new T.MeshStandardMaterial({ color: 0x2a9d8f, roughness: 0.3, metalness: 0.4 });
      const ethernetMat = new T.MeshStandardMaterial({ color: 0xc4a35a, roughness: 0.25, metalness: 0.8 });
      const jackMat = new T.MeshStandardMaterial({ color: 0xb5b0a8, roughness: 0.3, metalness: 0.7 });
      const io = new T.Group();
      io.add(new T.Mesh(new T.BoxGeometry(0.03, 0.5, 0.42), shieldMat));

      [-0.13, -0.02].forEach((z) => {
        [0.18, 0.09, 0.0].forEach((y) => {
          const usb = new T.Mesh(new T.BoxGeometry(0.045, 0.06, 0.045), usbMat);
          usb.position.set(0.02, y, z);
          io.add(usb);
        });
      });

      [0.18, 0.09].forEach((y) => {
        const eth = new T.Mesh(new T.BoxGeometry(0.05, 0.08, 0.09), ethernetMat);
        eth.position.set(0.02, y, 0.13);
        io.add(eth);
      });

      [0.0, -0.09, -0.18].forEach((y) => {
        const jack = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 0.04, 12), jackMat);
        jack.rotation.z = Math.PI / 2;
        jack.position.set(0.03, y, 0.13);
        io.add(jack);
      });

      const hdmi = new T.Mesh(new T.BoxGeometry(0.045, 0.045, 0.09), portMat);
      hdmi.position.set(0.02, -0.09, -0.13);
      io.add(hdmi);
      const dp = new T.Mesh(new T.BoxGeometry(0.045, 0.045, 0.08), portMat);
      dp.position.set(0.02, -0.09, -0.02);
      io.add(dp);

      [-0.13, -0.02].forEach((z) => {
        const usbC = new T.Mesh(new T.BoxGeometry(0.035, 0.035, 0.06), portMat);
        usbC.position.set(0.02, -0.18, z);
        io.add(usbC);
      });

      // Rotated -90° about Y so the ports open along +Z (the case's rear wall — see buildCase's
      // `rear` panel at z=+d/2; the front sits at -d/2) instead of +X (the board's own
      // face-normal, toward the glass side panel): a real shield's plug openings face backward
      // out of the case, perpendicular to the board's face, not out toward the viewer the way
      // CPU/cooler/RAM stick up off it. This also swaps which local axis is the port grid's
      // "width" — local Z (the grid columns built above) becomes world X and local Y (the rows)
      // stays world Y, so the grid still reads as a landscape rectangle spanning the case's
      // width and height, matching what you actually see looking at a case from directly behind.
      //
      // y=0.35 matches the CPU's own local band (cpu sits at world y=0.55, mobo at world
      // y=0.2, so 0.55-0.2=0.35 in mobo-local space); z=0.68 sits right at the board's own
      // rear-most edge (half the board's ±0.75 Z placeholder extent) rather than mid-board, so
      // the rotated ports actually reach the rear wall once the whole assembly is anchored
      // there — see the mobo-anchoring block in resetComponentPositions/setSizeScale below.
      io.rotation.y = -Math.PI / 2;
      io.position.set(0.03, 0.35, 0.68);
      g.add(io);

      g.scale.setScalar(0.86);
      return g;
    }
    case 'cpu': {
      const g = new T.Group();
      g.add(new T.Mesh(new T.BoxGeometry(0.1, 0.3, 0.3), new T.MeshStandardMaterial({ color: 0xb09010, roughness: 0.12, metalness: 0.95 })));
      const sub = new T.Mesh(new T.BoxGeometry(0.06, 0.36, 0.36), new T.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 }));
      sub.position.x = -0.02;
      g.add(sub);
      return g;
    }
    case 'cooler': {
      const g = new T.Group();
      g.add(new T.Mesh(new T.BoxGeometry(0.36, 0.36, 0.38), new T.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.2, metalness: 0.85 })));
      const lcd = new T.Mesh(
        new T.CircleGeometry(0.12, 16),
        new T.MeshStandardMaterial({ color: 0x6e1423, emissive: 0x6e1423, emissiveIntensity: 1.0, side: T.DoubleSide }),
      );
      lcd.rotation.y = Math.PI / 2;
      lcd.position.x = 0.185;
      g.add(lcd);
      const tubeMat = new T.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6 });
      [-0.1, 0.1].forEach((z) => {
        const tube = new T.Mesh(new T.CylinderGeometry(0.016, 0.016, 0.16, 8), tubeMat);
        tube.rotation.z = Math.PI / 5;
        tube.position.z = z;
        g.add(tube);
      });
      g.scale.setScalar(0.85);
      return g;
    }
    case 'ram': {
      const g = new T.Group();
      // 4 fixed DIMM slots, evenly spaced along local X (the PCB-thickness axis — real slots
      // repeat in the direction perpendicular to each stick's flat face, not along its height).
      // setRamModules toggles how many are visible/populated to match the selected kit's real
      // stick count (1/2/4). Stored on userData so setRamModules/setRamSlots can find them
      // without rebuilding the mesh — naturalSize (measured right after this returns, with the
      // default centered pair visible) stays the same magnitude regardless of which slots end
      // up toggled later, since spacing no longer shares an axis with the height (X) dimension
      // ramHeightMm scales.
      const slots = RAM_SLOT_Z.map((z) => {
        const slot = buildRamStick(T);
        slot.position.z = z;
        g.add(slot);
        return slot;
      });
      slots.forEach((s, i) => {
        s.visible = i === 1 || i === 2;
      });
      g.userData.ramSlots = slots;
      g.scale.setScalar(0.82);
      return g;
    }
    case 'gpu': {
      const g = new T.Group();
      const bodyMat = new T.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.18, metalness: 0.72 });
      const ribMat = new T.MeshStandardMaterial({ color: 0x252830, roughness: 0.1, metalness: 0.9 });
      const pcbMat = new T.MeshStandardMaterial({ color: 0x081318, roughness: 0.85, metalness: 0.1 });
      const bpMat = new T.MeshStandardMaterial({ color: 0x1c1e24, roughness: 0.13, metalness: 0.95 });
      const bracketMat = new T.MeshStandardMaterial({ color: 0x888078, roughness: 0.2, metalness: 0.94 });
      const goldMat = new T.MeshStandardMaterial({ color: 0xc4a030, roughness: 0.1, metalness: 1.0 });
      const hubMat = new T.MeshStandardMaterial({ color: 0x303038, roughness: 0.1, metalness: 0.92 });
      const pcb = new T.Mesh(new T.BoxGeometry(0.028, 0.2, 0.84), pcbMat);
      g.add(pcb);
      const bp = new T.Mesh(new T.BoxGeometry(0.012, 0.2, 0.84), bpMat);
      bp.position.x = -0.02;
      g.add(bp);
      const shroud = new T.Mesh(new T.BoxGeometry(0.27, 0.268, 0.82), bodyMat);
      shroud.position.x = 0.149;
      g.add(shroud);
      const topCham = new T.Mesh(new T.BoxGeometry(0.272, 0.022, 0.82), ribMat);
      topCham.position.set(0.149, 0.145, 0);
      g.add(topCham);
      const botCham = new T.Mesh(new T.BoxGeometry(0.272, 0.012, 0.82), ribMat);
      botCham.position.set(0.149, -0.138, 0);
      g.add(botCham);
      [-0.225, 0.225].forEach((z) => {
        const bezel = new T.Mesh(new T.TorusGeometry(0.112, 0.011, 16, 48), ribMat);
        bezel.rotation.y = Math.PI / 2;
        bezel.position.set(0.285, 0, z);
        g.add(bezel);
        const hub = new T.Mesh(new T.CylinderGeometry(0.024, 0.024, 0.022, 20), hubMat);
        hub.rotation.z = Math.PI / 2;
        hub.position.set(0.285, 0, z);
        g.add(hub);
      });
      const bkt = new T.Mesh(new T.BoxGeometry(0.282, 0.248, 0.013), bracketMat);
      bkt.position.set(0.141, 0, -0.414);
      g.add(bkt);
      const pcie2 = new T.Mesh(new T.BoxGeometry(0.008, 0.033, 0.188), goldMat);
      pcie2.position.set(0.0, -0.12, -0.272);
      g.add(pcie2);
      g.rotation.z = -Math.PI / 2;
      g.scale.setScalar(0.88);
      // Wrapped in an outer group so setGpuOrientation can tip the card onto its side (world Z
      // -> world Y) for riser-mounted vertical-GPU cases without touching g's own rotation,
      // which already exists purely to keep the bracket/ports cosmetically oriented correctly.
      const wrapper = new T.Group();
      wrapper.add(g);
      return wrapper;
    }
    case 'storage': {
      const g = new T.Group();
      g.add(new T.Mesh(new T.BoxGeometry(0.04, 0.08, 0.22), new T.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.4, metalness: 0.5 })));
      const stk = new T.Mesh(new T.BoxGeometry(0.044, 0.07, 0.2), new T.MeshStandardMaterial({ color: 0x6e1423 }));
      stk.position.x = 0.004;
      g.add(stk);
      return g;
    }
    case 'psu': {
      const g = new T.Group();
      g.add(new T.Mesh(new T.BoxGeometry(0.65, 0.42, 1.52), new T.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.5, metalness: 0.3 })));
      const gr = new T.Mesh(new T.CircleGeometry(0.14, 12), new T.MeshStandardMaterial({ color: 0x1a1a1a, side: T.DoubleSide }));
      gr.rotation.y = Math.PI / 2;
      gr.position.set(-0.345, 0, 0);
      g.add(gr);
      return g;
    }
  }
}

// A subtle warm highlight on the currently-selected part — NOT a full color override. Only
// lifts the emissive channel a little on top of each material's own diffuse color, so a dark
// GPU shroud still reads as a dark GPU shroud, just faintly glowing, rather than dissolving
// into a flat maroon silhouette.
function cloneWithEmissiveGlow(mesh: THREE.Object3D): THREE.Material[] {
  const mats: THREE.Material[] = [];
  mesh.traverse((child) => {
    const m = child as THREE.Mesh;
    if (!m.isMesh) return;
    const src = m.material as THREE.MeshStandardMaterial;
    if (!src || !('emissive' in src)) return;
    const glow = src.clone() as THREE.MeshStandardMaterial;
    glow.emissive = new THREE.Color(0x332608);
    glow.emissiveIntensity = Math.max(glow.emissiveIntensity || 0, 0.42);
    mats.push(glow);
  });
  return mats;
}

// A real 500ml beverage can (66mm diameter x 168mm tall — Crown Cork's own published spec for
// the standard 16.9oz/500ml can) as a familiar object to gauge every other part's size against.
// Branded "GOMPA COLA" purely as an in-scene joke — deliberately GOMP's own maroon/gold instead
// of copying an actual soft-drink brand's real trade dress, since this ships to a live site.
export const CAN_DIAMETER_MM = 66;
export const CAN_HEIGHT_MM = 168;

function makeCanLabelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#6E1423';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#C4A35A';
  ctx.fillRect(0, canvas.height * 0.38, canvas.width, canvas.height * 0.1);
  ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.03);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height * 0.24);
  ctx.font = 'italic bold 64px Georgia, serif';
  ctx.fillStyle = '#FDFAF4';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GOMPA', 0, 0);
  ctx.restore();
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height * 0.58);
  // A generic flowing script gives it a fun soda-label feel without tracing any real brand's
  // specific lettering — the exact Coca-Cola script is itself the protected trade dress, not
  // just the wordmark, so this deliberately doesn't reach for that.
  ctx.font = 'bold 92px "Brush Script MT", "Segoe Script", cursive';
  ctx.fillStyle = '#6E1423';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Cola', 0, 0);
  ctx.restore();
  ctx.font = '600 22px "JetBrains Mono", monospace';
  ctx.fillStyle = 'rgba(253,250,244,0.8)';
  ctx.textAlign = 'center';
  ctx.fillText('500 ml · NET 0.5 L', canvas.width / 2, canvas.height * 0.86);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildCanMesh(): THREE.Group {
  const group = new THREE.Group();
  const radius = mmToUnits(CAN_DIAMETER_MM) / 2;
  const height = mmToUnits(CAN_HEIGHT_MM);
  const bodyGeo = new THREE.CylinderGeometry(radius, radius, height, 32);
  const bodyMat = new THREE.MeshStandardMaterial({ map: makeCanLabelTexture(), roughness: 0.35, metalness: 0.6 });
  group.add(new THREE.Mesh(bodyGeo, bodyMat));
  const capMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.3, metalness: 0.8 });
  const topCap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.96, radius, height * 0.03, 32), capMat);
  topCap.position.y = height / 2;
  group.add(topCap);
  const botCap = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.96, height * 0.03, 32), capMat);
  botCap.position.y = -height / 2;
  group.add(botCap);
  return group;
}

// A curved, tapered blade profile (wide at the hub end, narrowing to a rounded tip) extruded to
// a thickness — instead of a flat rectangular box, which reads as a crude paddle sticking out
// past the fan's circular silhouette rather than a blade curving within it.
function makeBladeGeometry(length: number, width: number, thickness: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, -width * 0.5);
  shape.quadraticCurveTo(length * 0.55, -width * 0.55, length, -width * 0.05);
  shape.quadraticCurveTo(length * 1.03, 0, length, width * 0.05);
  shape.quadraticCurveTo(length * 0.55, width * 0.32, 0, width * 0.5);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 10 });
  geo.translate(0, 0, -thickness / 2);
  return geo;
}

// A real case fan reads as a square shroud around a round blade cavity, not a flat disc. The
// frame is built as 4 border bars — an actual open ring, NOT a solid box — because a solid box
// spanning the full footprint would sit directly in front of the blades and hide them entirely
// regardless of what's drawn behind it. Colors lean on the site's own maroon/gold palette (a
// maroon shroud, gold trim) rather than flat black, matching every other component's finish.
// Built facing local +Z so a caller can rotate the whole group to face whichever case wall it's
// mounted on.
function buildFanMesh(sizeMm: number): THREE.Group {
  const T = THREE;
  const group = new T.Group();
  const size = mmToUnits(sizeMm);
  const radius = size / 2;
  const depth = size * 0.21; // real 120/140mm fans are ~25mm thick — roughly a fifth of the frame width
  const frameMat = new T.MeshStandardMaterial({ color: 0x241318, roughness: 0.4, metalness: 0.45 });
  const bezelMat = new T.MeshStandardMaterial({ color: 0xc4a35a, roughness: 0.25, metalness: 0.85 });
  const bladeMat = new T.MeshStandardMaterial({ color: 0x2e181d, roughness: 0.45, metalness: 0.3 });
  const hubMat = new T.MeshStandardMaterial({ color: 0xc4a35a, roughness: 0.2, metalness: 0.85 });
  const screwMat = new T.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.6 });

  const borderWidth = size * 0.12;
  const topBar = new T.Mesh(new T.BoxGeometry(size, borderWidth, depth), frameMat);
  topBar.position.y = radius - borderWidth / 2;
  group.add(topBar);
  const botBar = new T.Mesh(new T.BoxGeometry(size, borderWidth, depth), frameMat);
  botBar.position.y = -(radius - borderWidth / 2);
  group.add(botBar);
  const sideLen = size - 2 * borderWidth;
  const leftBar = new T.Mesh(new T.BoxGeometry(borderWidth, sideLen, depth), frameMat);
  leftBar.position.x = -(radius - borderWidth / 2);
  group.add(leftBar);
  const rightBar = new T.Mesh(new T.BoxGeometry(borderWidth, sideLen, depth), frameMat);
  rightBar.position.x = radius - borderWidth / 2;
  group.add(rightBar);

  // Gold bezel ring sitting right at the cavity's edge, flush with the frame — since the middle
  // is now actually open, this reads as the visible trim of the blade housing rather than
  // floating decoration in front of a solid wall.
  const bezel = new T.Mesh(new T.TorusGeometry(radius * 0.82, radius * 0.028, 12, 32), bezelMat);
  group.add(bezel);

  // Blades kept just inside the bezel's own radius so their tips never poke past the fan's
  // circular silhouette, tapering toward the tip so they read as blades rather than paddles.
  const bladeCount = 7;
  const bladeGeo = makeBladeGeometry(radius * 0.68, radius * 0.34, depth * 0.5);
  for (let i = 0; i < bladeCount; i++) {
    const angle = (i / bladeCount) * Math.PI * 2;
    const blade = new T.Mesh(bladeGeo, bladeMat);
    blade.rotation.z = angle;
    group.add(blade);
  }
  const hub = new T.Mesh(new T.CylinderGeometry(radius * 0.15, radius * 0.15, depth * 0.65, 16), hubMat);
  hub.rotation.x = Math.PI / 2;
  group.add(hub);

  const inset = size * 0.42;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
    const screw = new T.Mesh(new T.CylinderGeometry(size * 0.025, size * 0.025, depth * 1.02, 10), screwMat);
    screw.rotation.x = Math.PI / 2;
    screw.position.set(sx * inset, sy * inset, 0);
    group.add(screw);
  });

  return group;
}

// Fan-mount position -> world placement, spread evenly across the relevant span of the current
// case's real size, sitting just outside the panel it's mounted on, facing outward (matching
// buildFanMesh's local +Z default face). front/rear/side spread vertically (along Y, like a
// radiator's fan row); top/bottom spread front-to-back (along Z).
function fanTransform(
  position: FanMountPosition,
  index: number,
  count: number,
  caseSize: { w: number; h: number; d: number },
): { pos: [number, number, number]; rot: [number, number, number] } {
  const { w, h, d } = caseSize;
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
    case 'side':
      return { pos: [w / 2 + gap, along(h), 0], rot: [0, Math.PI / 2, 0] };
  }
}

export type SceneCallbacks = {
  onCompletionStart?: () => void;
  onCompletionEnd?: () => void;
};

export function createBuildScene(container: HTMLDivElement, cb: SceneCallbacks = {}) {
  const W = container.clientWidth || 800;
  const H = container.clientHeight || 600;

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(W, H);
  renderer.setClearColor(0xf5f0e6);
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f0e6);
  const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
  camera.position.set(5.4, 2.2, 2.0);
  camera.lookAt(0, 0.2, 0);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0, 0.2, 0);
  controls.enablePan = false;
  controls.minDistance = 3;
  controls.maxDistance = 12;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.4;

  scene.add(new THREE.AmbientLight(0xf5ecd8, 1.8));
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.position.set(5, 10, 5);
  scene.add(sun);
  const navyLight = new THREE.PointLight(0x6e1423, 2.0, 22);
  navyLight.position.set(-4, 1, -3);
  scene.add(navyLight);
  const warm = new THREE.PointLight(0xffe4c0, 0.7, 15);
  warm.position.set(4, -2, 4);
  scene.add(warm);

  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0xede6d8 }));
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = -2.6;
  scene.add(floorMesh);
  const gridHelper = new THREE.GridHelper(30, 60, 0xcfc8ba, 0xd8d0c2);
  gridHelper.position.y = floorMesh.position.y + 0.05;
  (gridHelper.material as THREE.Material).transparent = true;
  (gridHelper.material as THREE.Material).opacity = 0.4;
  scene.add(gridHelper);

  // ---- Ambient decoration: 6 clusters of thin rotating rings + floating "motes" ----
  const ambientGroup = new THREE.Group();
  scene.add(ambientGroup);
  const clusterPositions: [number, number, number][] = [
    [-0.87, -1.2, 4.92],
    [-4.76, 2.0, 2.75],
    [-5.98, 0.3, -0.52],
    [-3.54, -1.8, -3.54],
    [-0.48, 3.0, -5.48],
    [3.2, 3.4, -1.0],
  ];
  const ringSpins: { mesh: THREE.Mesh; spin: number }[] = [];
  clusterPositions.forEach((pos, i) => {
    const color = i % 2 === 0 ? 0x6e1423 : 0xc4a35a;
    const outer = new THREE.Mesh(
      new THREE.TorusGeometry(2.6 + (i % 3) * 0.3, 0.008, 8, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22 }),
    );
    outer.position.set(...pos);
    outer.rotation.set(i * 0.7, i * 0.4 + 0.3, i * 0.2);
    ambientGroup.add(outer);
    ringSpins.push({ mesh: outer, spin: (i % 2 === 0 ? 1 : -1) * 0.0008 });
    const inner = new THREE.Mesh(
      new THREE.TorusGeometry(1.8 + (i % 3) * 0.2, 0.006, 8, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.13 }),
    );
    inner.position.set(...pos);
    inner.rotation.set(i * 0.7, i * 0.4 + 0.3, i * 0.2 + 0.9);
    ambientGroup.add(inner);
    ringSpins.push({ mesh: inner, spin: (i % 2 === 0 ? 1 : -1) * 0.0006 });
  });
  const motesData: { pos: [number, number, number]; color: number; size: number }[] = [
    { pos: [-2.6, 2.4, -1.0], color: 0x6e1423, size: 0.028 },
    { pos: [-3.4, 1.2, 3.2], color: 0xc4a35a, size: 0.022 },
    { pos: [-1.2, -0.8, 4.0], color: 0x6e1423, size: 0.02 },
    { pos: [-5.2, 2.8, -2.0], color: 0xc4a35a, size: 0.024 },
    { pos: [-4.0, -1.4, -4.2], color: 0x6e1423, size: 0.018 },
    { pos: [1.4, 2.6, -3.0], color: 0xc4a35a, size: 0.02 },
  ];
  const motes = motesData.map((m, i) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(m.size, 10, 10), new THREE.MeshBasicMaterial({ color: m.color, transparent: true, opacity: 0.55 }));
    mesh.position.set(...m.pos);
    ambientGroup.add(mesh);
    return { mesh, basePos: new THREE.Vector3(...m.pos), phase: i * 1.3 };
  });
  let motionOn = true;

  // ---- Case ----
  let caseGroup = new THREE.Group();
  scene.add(caseGroup);
  let glassMesh: THREE.Mesh | null = null;
  let glassHidden = false;
  const GLASS_REST_OPACITY = 0.13;

  function buildCase(w: number, h: number, d: number) {
    scene.remove(caseGroup);
    caseGroup = new THREE.Group();
    const panelMat = () =>
      new THREE.MeshStandardMaterial({ color: 0x1e1c1a, roughness: 0.72, metalness: 0.18, side: THREE.DoubleSide, transparent: true, opacity: 0.55, depthWrite: false });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(d, h), panelMat());
    back.rotation.y = Math.PI / 2;
    back.position.x = -w / 2;
    caseGroup.add(back);
    const top = new THREE.Mesh(new THREE.PlaneGeometry(w, d), panelMat());
    top.rotation.x = Math.PI / 2;
    top.position.y = h / 2;
    caseGroup.add(top);
    const bottom = new THREE.Mesh(new THREE.PlaneGeometry(w, d), panelMat());
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = -h / 2;
    caseGroup.add(bottom);
    // front sits at -d/2, not +d/2: with the glass panel on +X (see glassMesh below) and the
    // camera looking in from that side, the case's front is the wall to the right of that view
    // (confirmed against the actual render, not assumed) — i.e. -Z, not +Z.
    const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), panelMat());
    front.rotation.y = Math.PI;
    front.position.z = -d / 2;
    caseGroup.add(front);
    const rear = new THREE.Mesh(new THREE.PlaneGeometry(w, h), panelMat());
    rear.position.z = d / 2;
    caseGroup.add(rear);

    const boxGeo = new THREE.BoxGeometry(w, h, d);
    caseGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo, 1), new THREE.LineBasicMaterial({ color: 0x6e1423, transparent: true, opacity: 0.55 })));

    glassMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(d, h),
      new THREE.MeshStandardMaterial({ color: 0xc9dee2, transparent: true, opacity: glassHidden ? 0 : GLASS_REST_OPACITY, roughness: 0.06, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false }),
    );
    glassMesh.rotation.y = -Math.PI / 2;
    glassMesh.position.x = w / 2 + 0.006;
    glassMesh.visible = !glassHidden;
    caseGroup.add(glassMesh);

    // Visibility is owned by toggleComponent/updateCase (called after `objects` exists) —
    // default to hidden here since nothing is selected yet on first build.
    caseGroup.visible = false;
    scene.add(caseGroup);

    floorMesh.position.y = -h / 2 - 0.1;
    gridHelper.position.y = floorMesh.position.y + 0.05;
  }
  buildCase(2.0, 4.5, 2.0);

  // ---- Per-component objects ----
  const objects: Partial<Record<CompId, ObjRecord>> = {};

  // Each placeholder mesh's own bounding size at scale 1 — measured once, right after it's
  // built and before any position/scale mutation, so it reflects whatever internal rotation/
  // scale buildComponentMesh already baked in (e.g. the gpu group's -90° z-rotation, which
  // swaps its local x/y extents in world space). sizeScaleFromSpecs divides a part's real mm
  // size by this to get the exact per-axis scale that makes the mesh true to its own quoted
  // dimension, rather than every SKU in a category sharing one fixed placeholder size.
  const naturalSize: Partial<Record<Exclude<CompId, 'case'>, SizeScale>> = {};

  // Axes with no real-mm spec of their own (e.g. a mobo's PCB thickness, or a GPU's width/
  // height) are left at scale 1 — their own placeholder size — rather than inheriting some
  // other axis's ratio: that ratio belongs to a different real-world measurement and applying
  // it here would distort an axis nothing actually verified.
  function sizeScaleFromSpecs(id: Exclude<CompId, 'case'>, specs: DimensionSpec[]): SizeScale {
    const natural = naturalSize[id];
    const scale: SizeScale = { x: 1, y: 1, z: 1 };
    if (!natural) return scale;
    specs.forEach((spec) => {
      if (spec.scalesMesh === false) return;
      const nat = natural[spec.axis];
      if (nat > 0.0001) scale[spec.axis] = mmToUnits(spec.mm) / nat;
    });
    return scale;
  }

  (Object.keys(BASE_POS) as Exclude<CompId, 'case'>[]).forEach((id) => {
    const mesh = buildComponentMesh(id);
    naturalSize[id] = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
    const finalPos = new THREE.Vector3(...BASE_POS[id]);
    const startPos = finalPos.clone().add(new THREE.Vector3(id === 'psu' ? 0 : 8, id === 'cooler' ? 8 : 0, id === 'mobo' || id === 'storage' ? -8 : 0));
    mesh.position.copy(startPos);
    mesh.scale.setScalar(0.001);
    mesh.visible = false;
    scene.add(mesh);
    objects[id] = {
      mesh,
      finalPos,
      startPos,
      targetPos: startPos.clone(),
      targetScale: new THREE.Vector3(0.001, 0.001, 0.001),
      selected: false,
      baseMats: [],
      selMats: cloneWithEmissiveGlow(mesh),
      sizeScale: { x: 1, y: 1, z: 1 },
    };
  });
  // Case is tracked as a pseudo-object so SLOTS-driven logic stays uniform.
  objects.case = {
    mesh: caseGroup,
    finalPos: new THREE.Vector3(0, 0, 0),
    startPos: new THREE.Vector3(0, 20, 0),
    targetPos: new THREE.Vector3(0, 20, 0),
    targetScale: new THREE.Vector3(1, 1, 1),
    selected: false,
    baseMats: [],
    selMats: [],
    sizeScale: { x: 1, y: 1, z: 1 },
  };

  // ---- Dimension annotations ----
  let dimensionsVisible = true;
  const dimensionGroups: Partial<Record<CompId | 'can', THREE.Group>> = {};
  let lastCaseSize = { w: 2.0, h: 4.5, d: 2.0 };

  function clearDimensionGroup(id: CompId | 'can') {
    const existing = dimensionGroups[id];
    if (!existing) return;
    existing.traverse((child) => {
      const line = child as THREE.Line;
      if ((line as THREE.Object3D).type === 'Line' && line.geometry) line.geometry.dispose();
      const sprite = child as THREE.Sprite;
      if (sprite.material) {
        const mat = sprite.material as THREE.SpriteMaterial;
        mat.map?.dispose();
        mat.dispose();
      }
    });
    scene.remove(existing);
    delete dimensionGroups[id];
  }

  function setComponentDimensions(id: CompId, specs: DimensionSpec[]) {
    clearDimensionGroup(id);
    if (!dimensionsVisible || !specs.length || !objects[id]?.selected) return;
    const set = buildDimensionSet(specs);
    // buildDimensionSet already offsets each line to sit just outside the part's own edges —
    // the set itself just needs to sit at the part's actual center (the case's local origin
    // IS its center; every other part's finalPos already is its center too).
    set.position.copy(id === 'case' ? new THREE.Vector3(0, 0, 0) : objects[id]!.finalPos);
    scene.add(set);
    dimensionGroups[id] = set;
  }

  function setDimensionsVisible(visible: boolean) {
    dimensionsVisible = visible;
    Object.values(dimensionGroups).forEach((g) => {
      if (g) g.visible = visible;
    });
    refreshCanDimensions();
  }

  // ---- RAM slot outlines ----
  // Real motherboards have a fixed number of DIMM slots (2 on Mini-ITX, 4 otherwise) whether or
  // not any RAM is installed — this pre-renders that as faint outline frames at the same
  // RAM_SLOT_Z positions the actual stick meshes use, so the empty slots are visible as soon as
  // a motherboard is picked. Deliberately a standalone group (not part of objects.ram) so its
  // visibility doesn't get tangled with the ram mesh's own fly-in/out lifecycle, which only
  // exists once RAM itself is installed.
  //
  // Sized straight from RAM_DIMM_SIZE_MM rather than a hand-tuned box: the page's own 'ram'
  // DimensionSpec scales an installed stick's local Y (length) to mmToUnits(RAM_DIMM_SIZE_MM.
  // length) too — every DDR4/DDR5 stick is that same standard length regardless of kit, only
  // the heatsink height varies — so building the outline from the same constant guarantees it
  // always matches, instead of drifting out of sync the way two independently-guessed numbers
  // did (previously the outline was fixed at a length nowhere near what a real, mm-accurate
  // stick renders at, so every installed stick visibly overran its own slot).
  const ramSlotLengthUnits = mmToUnits(RAM_DIMM_SIZE_MM.length);
  const ramSlotHeightUnits = mmToUnits(RAM_DIMM_SIZE_MM.height);
  const ramSlotOutlineGroup = new THREE.Group();
  const ramSlotOutlines = RAM_SLOT_Z.map((z) => {
    const geo = new THREE.BoxGeometry(ramSlotHeightUnits, ramSlotLengthUnits, 0.05);
    const line = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xc4a35a, transparent: true, opacity: 0.32 }));
    geo.dispose();
    line.position.set(0.03, 0, z);
    ramSlotOutlineGroup.add(line);
    return line;
  });
  ramSlotOutlineGroup.position.set(...BASE_POS.ram);
  ramSlotOutlineGroup.visible = false;
  scene.add(ramSlotOutlineGroup);

  // Fills left to right (ascending index) rather than centering the populated slots — matches
  // how a real board's slots would actually be populated one at a time, and gives setRamModules
  // a natural stagger order for the per-stick fly-in below.
  function ramSlotIndices(count: number): number[] {
    const n = Math.max(0, Math.min(count, RAM_SLOT_Z.length));
    return Array.from({ length: n }, (_, i) => i);
  }

  // `count` is the selected motherboard's real DIMM slot count (0 hides every outline — no
  // motherboard selected means there's no board to show slots on).
  function setMoboRamSlots(count: number) {
    ramSlotOutlineGroup.visible = count > 0;
    const active = ramSlotIndices(count);
    ramSlotOutlines.forEach((line, i) => {
      line.visible = active.includes(i);
    });
  }

  // Short drop-in-place tween for a single newly-populated DIMM slot — local to the slot group,
  // composes fine with the ram mesh's own parent-level scale/position animation (see
  // toggleComponent) since THREE nests transforms naturally.
  function flyInRamSlot(slot: THREE.Group) {
    const start = Date.now();
    const dur = 380;
    const fromY = 0.4;
    function tick() {
      const p = Math.min(1, (Date.now() - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      slot.position.y = fromY * (1 - eased);
      slot.scale.setScalar(0.35 + 0.65 * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    tick();
  }

  // ---- Reference can ----
  let canVisible = false;
  const canGroup = buildCanMesh();
  canGroup.visible = false;
  scene.add(canGroup);

  function positionCan() {
    const { w, h } = lastCaseSize;
    const radius = mmToUnits(CAN_DIAMETER_MM) / 2;
    const height = mmToUnits(CAN_HEIGHT_MM);
    canGroup.position.set(w / 2 + radius + 0.4, floorMesh.position.y + height / 2 + 0.02, 0);
  }

  function refreshCanDimensions() {
    clearDimensionGroup('can');
    if (!canVisible || !dimensionsVisible) return;
    const set = buildDimensionSet([
      { axis: 'y', mm: CAN_HEIGHT_MM },
      { axis: 'x', mm: CAN_DIAMETER_MM, label: `Ø ${(CAN_DIAMETER_MM / 10).toFixed(1)} cm` },
    ]);
    set.position.copy(canGroup.position);
    scene.add(set);
    dimensionGroups.can = set;
  }

  function setCanVisible(visible: boolean) {
    canVisible = visible;
    positionCan();
    canGroup.visible = visible;
    refreshCanDimensions();
  }

  // ---- Case fans ----
  // The page owns which positions/sizes/counts are picked (constrained by the selected case's
  // real fanMounts spec); this just rebuilds the meshes from scratch whenever that changes or
  // the case itself is resized, since a full rebuild is simpler and cheap enough here than
  // trying to diff/reuse individual fan meshes across a count or size change.
  let fanConfig: Partial<Record<FanMountPosition, { count: number; sizeMm: number }>> = {};
  const fanGroup = new THREE.Group();
  scene.add(fanGroup);

  function rebuildFans() {
    fanGroup.clear();
    (Object.keys(fanConfig) as FanMountPosition[]).forEach((position) => {
      const cfg = fanConfig[position];
      if (!cfg || cfg.count <= 0) return;
      for (let i = 0; i < cfg.count; i++) {
        const fan = buildFanMesh(cfg.sizeMm);
        const { pos, rot } = fanTransform(position, i, cfg.count, lastCaseSize);
        fan.position.set(...pos);
        fan.rotation.set(...rot);
        fanGroup.add(fan);
      }
    });
  }

  function setFans(config: Partial<Record<FanMountPosition, { count: number; sizeMm: number }>>) {
    fanConfig = config;
    rebuildFans();
  }

  // mobo/cpu/cooler/ram move as a rigid group, sharing whatever Z the motherboard itself sits
  // at — and that Z is pinned to the *selected case's* actual rear wall (z=-d/2, see buildCase)
  // rather than BASE_POS.mobo's fixed constant, so the now rear-facing I/O shield ports (see
  // buildComponentMesh's 'mobo' case) actually reach the rear cutout instead of floating
  // somewhere in the case's open interior. halfDepth reads the motherboard's own real depth
  // (E-ATX's 330mm vs Mini-ITX's 170mm sit differently even in the same case) once a real SKU's
  // sizeScale is on file; before that, it falls back to the unscaled placeholder's own extent.
  const MOBO_REAR_CLEARANCE = 0.04;
  function moboAnchoredZ(): number {
    const mobo = objects.mobo;
    const nat = naturalSize.mobo;
    const halfDepth = mobo && nat ? (nat.z * mobo.sizeScale.z) / 2 : 0.75;
    // +d/2 is the rear wall (see buildCase's `rear` panel) — the case's front sits at -d/2.
    return lastCaseSize.d / 2 - MOBO_REAR_CLEARANCE - halfDepth;
  }

  function resetComponentPositions() {
    const moboZ = moboAnchoredZ();
    (Object.keys(BASE_POS) as Exclude<CompId, 'case'>[]).forEach((id) => {
      const obj = objects[id];
      if (!obj) return;
      const base = BASE_POS[id];
      const z = id === 'mobo' || id === 'cpu' || id === 'cooler' || id === 'ram' ? moboZ + (base[2] - BASE_POS.mobo[2]) : base[2];
      obj.finalPos.set(base[0], base[1], z);
      if (obj.selected) {
        obj.targetPos.copy(obj.finalPos);
        obj.mesh.position.copy(obj.finalPos);
      }
    });
    // The empty-DIMM-slot outlines are a standalone group (see ramSlotOutlineGroup below), not
    // one of the objects looped above, so they need their own copy of the same ram Z — otherwise
    // they stay parked at BASE_POS.ram's static Z forever while the real ram object moves with
    // the mobo assembly's case-anchored Z, drifting apart on any case/motherboard but the exact
    // one BASE_POS.ram's constants happened to be tuned against.
    ramSlotOutlineGroup.position.set(BASE_POS.ram[0], BASE_POS.ram[1], moboZ + (BASE_POS.ram[2] - BASE_POS.mobo[2]));
  }

  function updateCase(w: number, h: number, d: number) {
    lastCaseSize = { w, h, d };
    buildCase(w, h, d);
    if (objects.case) {
      objects.case.mesh = caseGroup;
      objects.case.finalPos.set(0, 0, 0);
      if (objects.case.selected) {
        caseGroup.visible = true;
        objects.case.targetPos.set(0, 0, 0);
      }
    }
    resetComponentPositions();
    positionCan();
    refreshCanDimensions();
    rebuildFans();
  }

  // sizeScale is set by a prior setSizeScale(id, specs) call (see changeSelection in the page,
  // which always calls it before installing a part) — true-to-size scale doesn't depend on
  // which case is selected, so there is nothing case-relative left to apply here.
  function toggleComponent(id: CompId, nextSelected: boolean) {
    const obj = objects[id];
    if (!obj) return;
    obj.selected = nextSelected;
    if (!nextSelected) clearDimensionGroup(id);
    if (id === 'case') {
      caseGroup.visible = true;
      obj.targetPos.copy(nextSelected ? obj.finalPos : obj.startPos);
      obj.moveFrom = caseGroup.position.clone();
      obj.scaleFrom = caseGroup.scale.clone();
      obj.targetScale.copy(nextSelected ? new THREE.Vector3(1, 1, 1) : new THREE.Vector3(0.001, 0.001, 0.001));
      obj.moveStart = Date.now();
      obj.moveDur = nextSelected ? 650 : 550;
      obj.exiting = !nextSelected;
      return;
    }
    const mesh = obj.mesh;
    mesh.visible = true;
    if (nextSelected) {
      mesh.position.copy(obj.startPos);
      mesh.scale.setScalar(0.001);
      obj.targetPos = obj.finalPos.clone();
      obj.targetScale = new THREE.Vector3(obj.sizeScale.x, obj.sizeScale.y, obj.sizeScale.z);
      obj.exiting = false;
      let i = 0;
      mesh.traverse((child) => {
        const m = child as THREE.Mesh;
        if (m.isMesh && obj.selMats[i]) {
          if (!obj.baseMats.length) obj.baseMats.push(m.material as THREE.Material);
          m.material = obj.selMats[i];
          i++;
        }
      });
    } else {
      obj.targetPos = obj.startPos.clone();
      obj.targetScale = new THREE.Vector3(0.001, 0.001, 0.001);
      obj.exiting = true;
      let i = 0;
      mesh.traverse((child) => {
        const m = child as THREE.Mesh;
        if (m.isMesh && obj.baseMats[i]) {
          m.material = obj.baseMats[i];
          i++;
        }
      });
    }
    obj.moveFrom = mesh.position.clone();
    obj.scaleFrom = mesh.scale.clone();
    obj.moveStart = Date.now();
    obj.moveDur = nextSelected ? 650 : 550;
    controls.autoRotate = false;
  }

  function toggleGlass(hidden: boolean) {
    glassHidden = hidden;
    if (!glassMesh) return;
    const from = (glassMesh.material as THREE.MeshStandardMaterial).opacity;
    const to = hidden ? 0 : GLASS_REST_OPACITY;
    const dur = 420;
    const start = Date.now();
    if (!hidden) glassMesh.visible = true;
    function tick() {
      if (!glassMesh) return;
      const p = Math.min(1, (Date.now() - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      (glassMesh.material as THREE.MeshStandardMaterial).opacity = from + (to - from) * eased;
      if (p < 1) requestAnimationFrame(tick);
      else if (hidden) glassMesh.visible = false;
    }
    tick();
  }

  let completionRunning = false;
  function triggerCompletion() {
    completionRunning = true;
    controls.autoRotate = false;
    controls.enabled = false;
    cb.onCompletionStart?.();
    const startPos = camera.position.clone();
    const r = Math.max(startPos.length(), 7.5);
    const frontPos = new THREE.Vector3(r, 1.8, 0.3);
    const dur = 780;
    const start = Date.now();
    function align() {
      const p = Math.min(1, (Date.now() - start) / dur);
      const eased = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      camera.position.lerpVectors(startPos, frontPos, eased);
      camera.lookAt(0, 0.2, 0);
      controls.update();
      if (p < 1) requestAnimationFrame(align);
      else {
        controls.enabled = true;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 4.2;
        let steps = 0;
        const decay = setInterval(() => {
          steps++;
          const st = Math.min(1, steps * 0.035);
          controls.autoRotateSpeed = 4.2 * Math.pow(1 - st, 2) + 0.4;
          if (st >= 1) clearInterval(decay);
        }, 80);
        setTimeout(() => {
          completionRunning = false;
          cb.onCompletionEnd?.();
        }, 4200);
      }
    }
    align();
  }

  // ---- Hover picking ----
  // Prioritizes non-case components over the case shell itself: the case's panels are large
  // planes that geometrically wrap every component, so without this a ray through the glass
  // toward e.g. the GPU would report "case" (the nearer, mostly-transparent panel) instead of
  // the part actually under the cursor.
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();

  function pickComponentAt(clientX: number, clientY: number): CompId | null {
    const rect = renderer.domElement.getBoundingClientRect();
    pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNDC, camera);

    const nonCaseIds = SLOTS.filter((id) => id !== 'case' && objects[id]?.selected && objects[id]?.mesh.visible);
    const nonCaseMeshes = nonCaseIds.map((id) => objects[id]!.mesh);
    const hits = raycaster.intersectObjects(nonCaseMeshes, true);
    if (hits.length) {
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj) {
        const found = nonCaseIds.find((id) => objects[id]?.mesh === obj);
        if (found) return found;
        obj = obj.parent;
      }
    }

    if (objects.case?.selected && objects.case.mesh.visible) {
      const caseHits = raycaster.intersectObject(objects.case.mesh, true);
      if (caseHits.length) return 'case';
    }
    return null;
  }

  let running = true;
  // The tab-hidden case is already free (rAF self-throttles to ~1fps in a backgrounded tab),
  // but a canvas merely scrolled out of view keeps rendering every frame at full rate — the
  // sidebar-heavy Build page and the checkout recap both put this canvas well below the fold
  // on short viewports. IntersectionObserver skips the actual render work while it's offscreen;
  // requestAnimationFrame itself keeps ticking (cheap) so it resumes instantly once back in view.
  let inView = true;
  const visibilityObserver = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
    },
    { threshold: 0 },
  );
  visibilityObserver.observe(container);
  const clock = new THREE.Clock();
  function tick() {
    if (!running) return;
    requestAnimationFrame(tick);
    if (document.hidden || !inView) return;
    const t = clock.getElapsedTime();

    if (motionOn) {
      ringSpins.forEach(({ mesh, spin }) => {
        mesh.rotation.z += spin;
      });
      motes.forEach((m) => {
        m.mesh.position.y = m.basePos.y + Math.sin(t * 0.5 + m.phase) * 0.18;
        m.mesh.position.x = m.basePos.x + Math.cos(t * 0.35 + m.phase) * 0.12;
        (m.mesh.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(t * 0.8 + m.phase) * 0.25;
      });
    }

    Object.values(objects).forEach((obj) => {
      if (!obj) return;
      if (obj.moveStart != null && obj.moveFrom && obj.scaleFrom) {
        const dur = obj.moveDur || 600;
        const p = Math.min(1, (Date.now() - obj.moveStart) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        obj.mesh.position.lerpVectors(obj.moveFrom, obj.targetPos, eased);
        obj.mesh.scale.lerpVectors(obj.scaleFrom, obj.targetScale, eased);
        if (p >= 1) {
          obj.moveStart = undefined;
          if (obj.exiting) obj.mesh.visible = false;
        }
      } else if (obj.selected && obj !== objects.case) {
        obj.mesh.position.y = obj.finalPos.y + Math.sin(t + obj.mesh.id * 1.17) * 0.012;
      }
    });

    controls.update();
    renderer.render(scene, camera);
  }
  tick();

  function onResize() {
    const w = container.clientWidth || W;
    const h = container.clientHeight || H;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);
  // The container's box can also change size for reasons that never fire a window 'resize'
  // event — e.g. useIsMobile resolving from its desktop-first default to `true` a beat after
  // this scene is created, which swaps the container from a full-height flex box to a fixed
  // 46vh one. Without watching the element itself, the renderer/camera stay sized for the
  // container's very first (pre-mobile) layout forever, which both crops and stretches the
  // picture once the box actually shrinks.
  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(container);

  // Computes and stores this part's true-to-size scale from its real-mm specs, applying it
  // immediately if it's already installed (a same-category SKU swap, e.g. GPU already on and
  // the user picks a different card — toggleComponent only runs the install/remove animation
  // on a selected-state change, so a swap needs its own path to pick up the new part's real
  // size without replaying the fly-in). For a first-time install, the page calls this before
  // toggleComponent(id, true), so the stored sizeScale is already correct when the install
  // animation reads it.
  function setSizeScale(id: CompId, specs: DimensionSpec[]) {
    const obj = objects[id];
    if (!obj || id === 'case') return;
    const sizeScale = sizeScaleFromSpecs(id, specs);
    obj.sizeScale = sizeScale;
    if (obj.selected && obj.moveStart == null) {
      obj.mesh.scale.set(sizeScale.x, sizeScale.y, sizeScale.z);
    }
    // A different motherboard form factor changes moboAnchoredZ's own real half-depth (E-ATX's
    // 330mm vs Mini-ITX's 170mm), so the whole rear-anchored mobo/cpu/cooler/ram group needs to
    // slide to match — same reason updateCase re-runs this when the case itself changes.
    if (id === 'mobo') resetComponentPositions();
  }

  // Tips the GPU wrapper onto its side for a riser-mounted vertical case (world Z, where its
  // length normally sits, becomes world Y) and moves it into that layout's own chamber. The
  // page decides `vertical` from the selected case's name and keeps the dimension annotation's
  // axis in sync separately (setComponentDimensions/dimensionSpecsFor) — this only touches the
  // mesh, not the quoted measurement.
  function setGpuOrientation(vertical: boolean) {
    const obj = objects.gpu;
    if (!obj) return;
    obj.mesh.rotation.set(vertical ? -Math.PI / 2 : 0, 0, 0);
    const pos = new THREE.Vector3(...(vertical ? GPU_VERTICAL_POS : BASE_POS.gpu));
    obj.finalPos.copy(pos);
    if (obj.selected && obj.moveStart == null) {
      obj.mesh.position.copy(pos);
      obj.targetPos.copy(pos);
    }
  }

  // Shows exactly `count` of the ram mesh's 4 fixed DIMM slots, left to right, so the viewport
  // reflects the selected kit's real stick count. Slots newly turning on fly in one at a time
  // (staggered by iteration order, i.e. left to right) rather than all popping in at once.
  function setRamModules(count: number) {
    const obj = objects.ram;
    if (!obj) return;
    const slots = (obj.mesh.userData.ramSlots as THREE.Group[] | undefined) ?? [];
    const active = ramSlotIndices(count);
    let staggerIndex = 0;
    slots.forEach((slot, i) => {
      const shouldShow = active.includes(i);
      if (shouldShow && !slot.visible) {
        const delay = staggerIndex * 140;
        staggerIndex++;
        setTimeout(() => {
          slot.visible = true;
          flyInRamSlot(slot);
        }, delay);
      } else if (!shouldShow) {
        slot.visible = false;
      }
    });
  }

  // Wires up an entire saved build in one call — the checkout page's read-only preview has no
  // per-part UI to drive toggleComponent/setSizeScale/etc. incrementally the way the Build
  // page's own state effects do, it just has a finished (selected, selections, compDb) snapshot
  // to render as-is. Case size and GPU orientation are applied first since every other part's
  // final position depends on them (see moboAnchoredZ/resetComponentPositions above).
  function applyBuildSnapshot(
    compDb: Partial<Record<CompId, Component[]>>,
    selected: Partial<Record<CompId, boolean>>,
    selections: Partial<Record<CompId, string>>,
  ) {
    function findComp(id: CompId): Component | undefined {
      const list = compDb[id] || [];
      return list.find((c) => c.name === selections[id]) || list[0];
    }
    const caseComp = findComp('case');
    const gpuVertical = caseHasVerticalGpuMount(caseComp?.name);
    if (caseComp) {
      const size = caseUnitsFor(caseComp, caseComp.category || 'Mid Tower');
      updateCase(size.w, size.h, size.d);
    }
    setGpuOrientation(gpuVertical);
    SLOTS.forEach((id) => {
      const comp = findComp(id);
      if (comp) {
        setSizeScale(id, dimensionSpecsFor(id, comp, gpuVertical));
        if (id === 'ram') setRamModules(ramModuleCount(comp));
        if (id === 'mobo') setMoboRamSlots(moboRamSlotCount(comp));
      }
      toggleComponent(id, !!selected[id] && !!comp);
    });
    controls.autoRotate = true;
  }

  return {
    toggleComponent,
    updateCase,
    toggleGlass,
    triggerCompletion,
    pickComponentAt,
    setSizeScale,
    setGpuOrientation,
    setRamModules,
    setMoboRamSlots,
    setComponentDimensions,
    setDimensionsVisible,
    setCanVisible,
    setFans,
    applyBuildSnapshot,
    setMotion(on: boolean) {
      motionOn = on;
      ambientGroup.visible = on;
    },
    isCompletionRunning: () => completionRunning,
    getCaseSizeFor: (category: string) => SIZES[category] || SIZES['Mid Tower'],
    dispose() {
      running = false;
      window.removeEventListener('resize', onResize);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      (Object.keys(dimensionGroups) as (CompId | 'can')[]).forEach(clearDimensionGroup);
      // renderer.dispose() only frees the WebGL context itself — every geometry, material, and
      // texture built for this scene (case, components, motes, floor, dimension annotations)
      // stays resident in GPU memory until explicitly disposed too. Walking the whole scene
      // graph catches everything actually attached, rather than re-listing every group by name.
      disposeSceneContents(scene);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    },
  };
}

export type BuildScene = ReturnType<typeof createBuildScene>;
export { SIZES as CASE_SIZES };
