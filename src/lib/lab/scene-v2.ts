// createBuildSceneV2: the configurator's scene controller re-implemented on top of the homepage model's
// part designs. It keeps the SAME method names and semantics as createBuildScene in src/lib/build-scene.ts
// so a page can drive either one with identical calls. /build uses it by default (/build?scene=v1 falls
// back to the original scene); the lab page shows both side by side. Only the meshes (parts.ts) and the
// layout (layout.ts) are new.
//
// Implemented: part fly-in/out + selection glow, case swap, real-mm sizing, air/AIO variants, RAM sticks /
// slots, GPU horizontal/vertical (with automatic vertical for tiny cases and cards too long to lie flat),
// case fans, glass, hover pick + hull outline, dimension labels, reference can, completion animation,
// ambient decoration + motion toggle, off-screen render pause, front-mounted AIO radiator (as production),
// Admin alignment tuning (applied as offsets from the production defaults — see tuningFromAlignment).
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  buildCanMesh,
  DEFAULT_ALIGNMENT_TUNING,
  type AlignmentTuning,
  CAN_DIAMETER_MM,
  CAN_HEIGHT_MM,
  caseUnitsFor,
  cm,
  dimensionSpecsFor,
  MM_PER_UNIT,
  mmToUnits,
  moboRamSlotCount,
  ramModuleCount,
  SIZES,
  SLOTS,
  type CompId,
  type DimensionSpec,
  type SceneCallbacks,
} from '@/lib/build-scene';
import type { Component, FanMountPosition } from '@/lib/component-db-seed';
import { COL, disposeTree } from '@/lib/pc3d';
import { computeLayout, DEFAULT_INPUTS, tuningFromAlignment, type CaseSize, type PartInputs, type V3 } from './layout';
import { buildCooler, buildCpu, buildFanMounts, buildGpu, buildMobo, buildPsu, buildRam, buildShell, buildStorage, gpuFansFor, type Part } from './parts';

type PartId = Exclude<CompId, 'case'>;
type Move = { from: THREE.Vector3; to: THREE.Vector3; fromS: number; toS: number; t0: number; dur: number; exiting: boolean };
type Rec = { group: THREE.Group; selected: boolean; anchor: V3; move: Move | null };
type FanConfig = Partial<Record<FanMountPosition, { count: number; sizeMm: number }>>;

const IN_MS = 650;
const OUT_MS = 550;
// Interior depth (units) at or below which a case is "very small" and can only take a vertical GPU.
const TINY_CASE_DEPTH = 1.6;

function startOffset(id: PartId): V3 {
  return [id === 'psu' ? 0 : 8, id === 'cooler' ? 8 : 0, id === 'mobo' || id === 'storage' ? -8 : 0];
}

const swapYZ = (specs: DimensionSpec[]): DimensionSpec[] => specs.map((s) => (s.axis === 'y' ? { ...s, axis: 'z' } : s.axis === 'z' ? { ...s, axis: 'y' } : s));
// GPU specs arrive oriented for whatever mount the caller had at the time (length on Y when vertical, on Z when
// flat). Stored canonically (flat: length Z, thickness Y) so the result never depends on call order.
const canonicalGpuSpecs = (specs: DimensionSpec[]): DimensionSpec[] => {
  const length = specs.find((s) => s.annotate !== false && (s.axis === 'y' || s.axis === 'z'));
  return length?.axis === 'y' ? swapYZ(specs) : specs;
};

function labelSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.font = '600 30px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(13,13,12,0.92)';
  ctx.strokeText(text, 128, 34);
  ctx.fillStyle = '#EBE6DA';
  ctx.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.scale.set(0.9, 0.225, 1);
  sprite.renderOrder = 10;
  return sprite;
}

export function createBuildSceneV2(container: HTMLDivElement, cb: SceneCallbacks = {}) {
  const W = container.clientWidth || 800;
  const H = container.clientHeight || 600;

  // ---- stage: same renderer / camera / lights / floor as the production scene ---------------------
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(W, H);
  renderer.setClearColor(COL.bg);
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COL.bg);
  const camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 100);
  camera.position.set(7.0, 2.9, 2.6).normalize().multiplyScalar(4.5 * 2.4);
  camera.lookAt(0, 0.2, 0);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0, 0.2, 0);
  controls.enablePan = false;
  controls.minDistance = 4;
  controls.maxDistance = 16;
  controls.autoRotate = !cb.oscillate;
  controls.autoRotateSpeed = 0.4;
  const oscillateBaseTheta = cb.oscillate ? new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target)).theta : 0;

  scene.add(new THREE.AmbientLight(0xf5ecd8, 1.3));
  const sun = new THREE.DirectionalLight(0xffffff, 2.3);
  sun.position.set(5, 10, 5);
  scene.add(sun);
  const sideLight = new THREE.PointLight(0x1f8a55, 3, 24);
  sideLight.position.set(-4, 1, -3);
  scene.add(sideLight);
  const warm = new THREE.PointLight(0xffe4c0, 0.8, 15);
  warm.position.set(4, -2, 4);
  scene.add(warm);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x0f1613 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const grid = new THREE.GridHelper(40, 80, 0x2a3a31, 0x1c2822);
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.5;
  scene.add(grid);

  // ---- ambient decoration (same rings / motes as the production scene) ------------------------------
  const ambientGroup = new THREE.Group();
  scene.add(ambientGroup);
  const ringSpins: { mesh: THREE.Mesh; spin: number }[] = [];
  (
    [
      [-0.87, -1.2, 4.92],
      [-4.76, 2.0, 2.75],
      [-5.98, 0.3, -0.52],
      [-3.54, -1.8, -3.54],
      [-0.48, 3.0, -5.48],
      [3.2, 3.4, -1.0],
    ] as V3[]
  ).forEach((pos, i) => {
    const color = i % 2 === 0 ? 0x3fae74 : 0xc4a35a;
    const outer = new THREE.Mesh(new THREE.TorusGeometry(2.6 + (i % 3) * 0.3, 0.008, 8, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22 }));
    outer.position.set(...pos);
    outer.rotation.set(i * 0.7, i * 0.4 + 0.3, i * 0.2);
    ambientGroup.add(outer);
    ringSpins.push({ mesh: outer, spin: (i % 2 === 0 ? 1 : -1) * 0.0008 });
    const inner = new THREE.Mesh(new THREE.TorusGeometry(1.8 + (i % 3) * 0.2, 0.006, 8, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.13 }));
    inner.position.set(...pos);
    inner.rotation.set(i * 0.7, i * 0.4 + 0.3, i * 0.2 + 0.9);
    ambientGroup.add(inner);
    ringSpins.push({ mesh: inner, spin: (i % 2 === 0 ? 1 : -1) * 0.0006 });
  });
  const motes = (
    [
      { pos: [-2.6, 2.4, -1.0], color: 0x3fae74, size: 0.028 },
      { pos: [-3.4, 1.2, 3.2], color: 0xc4a35a, size: 0.022 },
      { pos: [-1.2, -0.8, 4.0], color: 0x3fae74, size: 0.02 },
      { pos: [-5.2, 2.8, -2.0], color: 0xc4a35a, size: 0.024 },
      { pos: [-4.0, -1.4, -4.2], color: 0x3fae74, size: 0.018 },
      { pos: [1.4, 2.6, -3.0], color: 0xc4a35a, size: 0.02 },
    ] as { pos: V3; color: number; size: number }[]
  ).map((m, i) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(m.size, 10, 10), new THREE.MeshBasicMaterial({ color: m.color, transparent: true, opacity: 0.55 }));
    mesh.position.set(...m.pos);
    ambientGroup.add(mesh);
    return { mesh, basePos: new THREE.Vector3(...m.pos), phase: i * 1.3 };
  });

  // ---- state -----------------------------------------------------------------------------------------
  let caseSize: CaseSize = { w: SIZES['Mid Tower'].w, h: SIZES['Mid Tower'].h, d: SIZES['Mid Tower'].d };
  const inputs: PartInputs = { ...DEFAULT_INPUTS, specs: {}, cooler: { ...DEFAULT_INPUTS.cooler }, ram: { ...DEFAULT_INPUTS.ram } };
  const comps: Partial<Record<CompId, Component>> = {};
  let fanConfig: FanConfig = {};
  let glassHidden = false;
  let dimsVisible = true;
  let motionOn = true;
  let canVisible = false;
  let spinners: THREE.Object3D[] = [];
  let running = true;
  let inView = true;
  let completionRunning = false;
  // GPU orientation: what the page asked for, and the (raw, as-supplied) specs for that orientation. The
  // orientation actually used is derived — see effectiveGpuVertical.
  let requestedVertical = false;
  let rawGpuSpecs: DimensionSpec[] = [];

  // hover outline (declared early: rebuilds clear it, and they run during the initial build)
  const raycaster = new THREE.Raycaster();
  const outline = new THREE.Group();
  scene.add(outline);
  const outlineHullMat = new THREE.MeshBasicMaterial({ color: 0xc4a35a, side: THREE.BackSide, transparent: true, opacity: 0.85, depthWrite: false });
  const edgeGeoms: THREE.BufferGeometry[] = [];
  const outlineEdgeMat = new THREE.LineBasicMaterial({ color: 0xc4a35a, transparent: true, opacity: 0.95 });

  const layout = () => computeLayout(caseSize, inputs);
  const tag = (root: THREE.Object3D, id: CompId) => root.traverse((o) => (o.userData.slot = id));

  // A GPU lies flat unless the page asks for vertical, the case is tiny, or the card is too long to lie flat
  // but does fit standing up. (Mirrors fit.ts's gpuMountFor, expressed in scene units.)
  function effectiveGpuVertical(): boolean {
    if (requestedVertical) return true;
    if (caseSize.d <= TINY_CASE_DEPTH) return true;
    const lenMm = rawGpuSpecs.find((s) => s.axis === 'z' && s.scalesMesh !== false)?.mm;
    if (!lenMm) return false;
    const len = mmToUnits(lenMm);
    const horizontalFits = len <= caseSize.d - 0.27;
    const verticalFits = len <= caseSize.h - 0.3;
    return !horizontalFits && verticalFits;
  }
  // Pushes the derived orientation (and the matching spec axes) into the layout inputs. Returns true if it changed.
  function syncGpuInputs(): boolean {
    const eff = effectiveGpuVertical();
    const specs = eff ? swapYZ(rawGpuSpecs) : rawGpuSpecs;
    const changed = eff !== inputs.gpuVertical;
    inputs.gpuVertical = eff;
    inputs.specs.gpu = specs;
    dimSpecs.gpu = specs;
    return changed;
  }

  // ---- case record: shell + case fans animate together ------------------------------------------------
  let shell = buildShell(caseSize);
  let fans = new THREE.Group();
  const caseRec: Rec = { group: new THREE.Group(), selected: false, anchor: [0, 0, 0], move: null };
  caseRec.group.add(shell, fans);
  caseRec.group.visible = false;
  caseRec.group.position.set(0, 20, 0);
  caseRec.group.scale.setScalar(0.001);
  tag(caseRec.group, 'case');
  scene.add(caseRec.group);

  // ---- part records ----------------------------------------------------------------------------------
  const slots = {} as Record<PartId, Rec>;
  function makePart(id: PartId): Part {
    const L = layout();
    switch (id) {
      case 'mobo':
        return buildMobo(L);
      case 'cpu':
        return buildCpu(L);
      case 'cooler':
        return buildCooler(L, inputs.cooler.type, caseSize);
      case 'ram': {
        const n = comps.ram?.name ?? '';
        return buildRam(L, /white/i.test(n) ? 0xe9e6df : /silver/i.test(n) ? 0xb9bcc2 : 0x1d1f22);
      }
      case 'gpu':
        return buildGpu(L, gpuFansFor(comps.gpu?.name));
      case 'storage':
        return buildStorage(L);
      case 'psu':
        return buildPsu(L);
    }
  }

  function collectSpinners() {
    spinners = [];
    scene.traverse((o) => {
      if (o.userData.spin) spinners.push(o.userData.spin as THREE.Object3D);
    });
  }

  // A subtle warm lift on an installed part — only on materials that don't already glow, so the green
  // RAM/GPU/fan accents keep their colour. The original material is kept on the mesh and restored on removal.
  function applySelectionGlow(root: THREE.Object3D, on: boolean) {
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const base = (m.userData.baseMat as THREE.Material | undefined) ?? (m.material as THREE.Material);
      const std = base as THREE.MeshStandardMaterial;
      if (on) {
        if (m.userData.glowMat || !('emissive' in std) || std.emissive.getHex() !== 0) return;
        const g = std.clone();
        g.emissive = new THREE.Color(0x332608);
        g.emissiveIntensity = 0.42;
        m.userData.baseMat = base;
        m.userData.glowMat = g;
        m.material = g;
      } else if (m.userData.glowMat) {
        (m.userData.glowMat as THREE.Material).dispose();
        m.material = m.userData.baseMat as THREE.Material;
        delete m.userData.glowMat;
        delete m.userData.baseMat;
      }
    });
  }

  function rebuild(id: PartId) {
    hoverClear(); // a stale outline would otherwise outlive the mesh it traced
    const rec = slots[id];
    const part = makePart(id);
    const g = part.group;
    tag(g, id);
    if (rec?.group) {
      g.position.copy(rec.group.position);
      g.scale.copy(rec.group.scale);
      g.visible = rec.group.visible;
      scene.remove(rec.group);
      applySelectionGlow(rec.group, false);
      disposeTree(rec.group);
    } else {
      g.position.set(part.anchor[0] + startOffset(id)[0], part.anchor[1] + startOffset(id)[1], part.anchor[2] + startOffset(id)[2]);
      g.scale.setScalar(0.001);
      g.visible = false;
    }
    scene.add(g);
    const next: Rec = { group: g, selected: rec?.selected ?? false, anchor: part.anchor, move: rec?.move ?? null };
    slots[id] = next;
    if (next.selected) applySelectionGlow(g, true);
    if (next.move) {
      // retarget an in-flight animation to the new anchor
      next.move.to = next.move.exiting
        ? new THREE.Vector3(part.anchor[0] + startOffset(id)[0], part.anchor[1] + startOffset(id)[1], part.anchor[2] + startOffset(id)[2])
        : new THREE.Vector3(...part.anchor);
    } else if (next.selected) {
      g.position.set(...part.anchor);
      g.scale.setScalar(1);
      g.visible = true;
    }
    collectSpinners();
    refreshDimensions(id);
  }

  function rebuildAllParts() {
    (['mobo', 'cpu', 'cooler', 'ram', 'gpu', 'storage', 'psu'] as PartId[]).forEach(rebuild);
  }

  function rebuildFans() {
    hoverClear();
    caseRec.group.remove(fans);
    disposeTree(fans);
    const sideZ = slots.mobo?.selected ? layout().sideFanZ ?? undefined : undefined;
    fans = buildFanMounts(fanConfig, caseSize, sideZ);
    tag(fans, 'case');
    caseRec.group.add(fans);
    collectSpinners();
  }

  function applyGlass() {
    const glass = shell.userData.glass as THREE.Mesh | undefined;
    if (!glass) return;
    glass.visible = !glassHidden;
    (glass.material as THREE.MeshStandardMaterial).opacity = glassHidden ? 0 : 0.08;
  }

  function rebuildShell() {
    caseRec.group.remove(shell);
    disposeTree(shell);
    shell = buildShell(caseSize);
    tag(shell, 'case');
    caseRec.group.add(shell);
    applyGlass();
    floor.position.y = -caseSize.h / 2 - 0.1;
    grid.position.y = floor.position.y + 0.05;
    positionCan();
  }

  // ---- reference can ---------------------------------------------------------------------------------
  const canGroup = buildCanMesh();
  canGroup.visible = false;
  scene.add(canGroup);
  function positionCan() {
    const radius = mmToUnits(CAN_DIAMETER_MM) / 2;
    const height = mmToUnits(CAN_HEIGHT_MM);
    canGroup.position.set(caseSize.w / 2 + radius + 0.4, floor.position.y + height / 2 + 0.02, 0);
    canGroup.updateMatrixWorld(true);
  }

  // ---- dimension annotations ------------------------------------------------------------------------
  const dimSpecs: Partial<Record<CompId, DimensionSpec[]>> = {};
  const dimGroups: Partial<Record<CompId | 'can', THREE.Group>> = {};
  const dimMat = new THREE.LineBasicMaterial({ color: 0xc4a35a, transparent: true, opacity: 0.85, depthTest: false });

  function clearDimensions(id: CompId | 'can') {
    const g = dimGroups[id];
    if (!g) return;
    g.traverse((o) => {
      const line = o as THREE.Line;
      if (line.geometry) line.geometry.dispose();
      const sprite = o as THREE.Sprite;
      if (sprite.isSprite) {
        const m = sprite.material as THREE.SpriteMaterial;
        m.map?.dispose();
        m.dispose();
      }
    });
    scene.remove(g);
    delete dimGroups[id];
  }

  // Blueprint-style callouts (extension ticks + a dimension line + a centred label) next to a bounding box.
  function drawSpecs(g: THREE.Group, box: THREE.Box3, specs: DimensionSpec[]) {
    const off = 0.18;
    specs.forEach((spec) => {
      if (spec.annotate === false) return;
      const a = spec.axis;
      const len = mmToUnits(spec.lineLengthMm ?? spec.mm);
      const c = box.getCenter(new THREE.Vector3());
      const o: Record<'x' | 'y' | 'z', number> = { x: c.x, y: c.y, z: c.z };
      const edge: Record<'x' | 'y' | 'z', number> = { x: box.max.x, y: box.max.y, z: box.max.z };
      const lineAt = { ...o };
      const base = { ...o };
      (['x', 'y', 'z'] as const)
        .filter((k) => k !== a)
        .forEach((k) => {
          lineAt[k] = edge[k] + off;
          base[k] = edge[k];
        });
      const p0 = new THREE.Vector3(lineAt.x, lineAt.y, lineAt.z);
      const p1 = p0.clone();
      p0[a] = o[a] - len / 2;
      p1[a] = o[a] + len / 2;
      const b0 = new THREE.Vector3(base.x, base.y, base.z);
      const b1 = b0.clone();
      b0[a] = p0[a];
      b1[a] = p1[a];
      const seg = (pts: THREE.Vector3[]) => {
        const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), dimMat);
        l.renderOrder = 9;
        g.add(l);
      };
      seg([p0, p1]);
      seg([b0, p0]);
      seg([b1, p1]);
      const label = labelSprite(spec.label ?? cm(spec.mm));
      label.position.copy(p0.clone().add(p1).multiplyScalar(0.5));
      g.add(label);
    });
  }

  function refreshDimensions(id: CompId) {
    clearDimensions(id);
    const rec = id === 'case' ? caseRec : slots[id];
    const specs = dimSpecs[id];
    if (!rec || !rec.selected || rec.move || !specs?.length) return;
    const g = new THREE.Group();
    g.visible = dimsVisible;
    const box =
      id === 'case'
        ? new THREE.Box3(new THREE.Vector3(-caseSize.w / 2, -caseSize.h / 2, -caseSize.d / 2), new THREE.Vector3(caseSize.w / 2, caseSize.h / 2, caseSize.d / 2))
        : new THREE.Box3().setFromObject(rec.group);
    drawSpecs(g, box, specs);
    scene.add(g);
    dimGroups[id] = g;
  }

  function refreshCanDimensions() {
    clearDimensions('can');
    if (!canVisible) return;
    const g = new THREE.Group();
    g.visible = dimsVisible;
    drawSpecs(g, new THREE.Box3().setFromObject(canGroup), [
      { axis: 'y', mm: CAN_HEIGHT_MM },
      { axis: 'x', mm: CAN_DIAMETER_MM, label: `Ø ${(CAN_DIAMETER_MM / 10).toFixed(1)} cm` },
    ]);
    scene.add(g);
    dimGroups.can = g;
  }

  // Initial build — after the state above is declared (rebuild() refreshes dimension labels and clears the outline).
  rebuildShell();
  rebuildAllParts();
  rebuildFans();

  // ---- animation / toggling -------------------------------------------------------------------------
  function startMove(rec: Rec, toPos: THREE.Vector3, toScale: number, selected: boolean, delayMs: number, hideOnEnd: boolean) {
    rec.group.visible = true;
    rec.move = { from: rec.group.position.clone(), to: toPos, fromS: rec.group.scale.x, toS: toScale, t0: Date.now() + delayMs, dur: selected ? IN_MS : OUT_MS, exiting: hideOnEnd };
  }

  function toggleComponent(id: CompId, nextSelected: boolean, delayMs = 0) {
    hoverClear();
    if (id === 'case') {
      caseRec.selected = nextSelected;
      if (!nextSelected) clearDimensions('case');
      startMove(caseRec, nextSelected ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3(0, 20, 0), nextSelected ? 1 : 0.001, nextSelected, delayMs, !nextSelected);
      controls.autoRotate = false;
      return;
    }
    const rec = slots[id];
    if (!rec) return;
    rec.selected = nextSelected;
    applySelectionGlow(rec.group, nextSelected);
    if (!nextSelected) clearDimensions(id);
    const off = startOffset(id);
    const start = new THREE.Vector3(rec.anchor[0] + off[0], rec.anchor[1] + off[1], rec.anchor[2] + off[2]);
    if (nextSelected) {
      rec.group.position.copy(start);
      rec.group.scale.setScalar(0.001);
    }
    startMove(rec, nextSelected ? new THREE.Vector3(...rec.anchor) : start, nextSelected ? 1 : 0.001, nextSelected, delayMs, !nextSelected);
    if (id === 'mobo') rebuildFans();
    controls.autoRotate = false;
  }

  function updateCase(w: number, h: number, d: number) {
    caseSize = { w, h, d };
    syncGpuInputs(); // a smaller case can flip the GPU to vertical (and a bigger one back)
    rebuildShell();
    rebuildAllParts();
    rebuildFans();
    refreshDimensions('case');
    refreshCanDimensions();
  }

  function toggleGlass(hidden: boolean) {
    glassHidden = hidden;
    applyGlass();
  }

  function setSizeScale(id: CompId, specs: DimensionSpec[], comp?: Component) {
    if (id === 'case') {
      if (comp) comps.case = comp;
      dimSpecs.case = specs;
      refreshDimensions('case');
      return;
    }
    if (comp) comps[id] = comp;
    if (id === 'gpu') {
      rawGpuSpecs = canonicalGpuSpecs(specs);
      syncGpuInputs();
    } else {
      inputs.specs[id] = specs;
      dimSpecs[id] = specs;
    }
    if (id === 'cooler' && comp) {
      const aio = comp.coolerType ? comp.coolerType === 'aio' : !!comp.coolerRadiatorMm;
      inputs.cooler = {
        type: aio ? 'aio' : 'air',
        radiatorMm: comp.coolerRadiatorMm ?? DEFAULT_INPUTS.cooler.radiatorMm,
        heightMm: specs.find((s) => s.axis === 'x')?.mm ?? comp.coolerHeightMm ?? DEFAULT_INPUTS.cooler.heightMm,
      };
    }
    if (id === 'mobo') {
      rebuildAllParts();
      rebuildFans();
    } else {
      rebuild(id);
      if (id === 'gpu') {
        rebuild('mobo');
        if (inputs.cooler.type === 'aio') rebuild('cooler'); // the card's length decides front vs top radiator
      }
    }
  }

  function setComponentDimensions(id: CompId, specs: DimensionSpec[]) {
    if (id === 'gpu') {
      rawGpuSpecs = canonicalGpuSpecs(specs);
      syncGpuInputs();
    } else {
      dimSpecs[id] = specs;
    }
    refreshDimensions(id);
  }

  function setDimensionsVisible(visible: boolean) {
    dimsVisible = visible;
    (Object.values(dimGroups) as THREE.Group[]).forEach((g) => (g.visible = visible));
  }

  function setGpuOrientation(vertical: boolean) {
    requestedVertical = vertical;
    syncGpuInputs();
    rebuild('gpu');
    rebuild('mobo');
    if (inputs.cooler.type === 'aio') rebuild('cooler');
  }

  function setRamModules(count: number) {
    inputs.ram.sticks = count;
    rebuild('ram');
  }

  function setMoboRamSlots(count: number) {
    inputs.ram.slots = count;
    rebuild('mobo');
    rebuild('ram');
  }

  function setFans(config: FanConfig) {
    fanConfig = config;
    rebuildFans();
  }

  function setCanVisible(visible: boolean) {
    canVisible = visible;
    positionCan();
    canGroup.visible = visible;
    refreshCanDimensions();
  }

  function applyBuildSnapshot(compDb: Partial<Record<CompId, Component[]>>, selected: Partial<Record<CompId, boolean>>, selections: Partial<Record<CompId, string>>) {
    const find = (id: CompId) => (compDb[id] || []).find((c) => c.name === selections[id]) || (compDb[id] || [])[0];
    const caseComp = find('case');
    if (caseComp) {
      const size = caseUnitsFor(caseComp, caseComp.category || 'Mid Tower');
      updateCase(size.w, size.h, size.d);
    }
    SLOTS.forEach((id) => {
      const comp = find(id);
      if (comp) {
        setSizeScale(id, dimensionSpecsFor(id, comp, requestedVertical), comp);
        if (id === 'ram') setRamModules(ramModuleCount(comp));
        if (id === 'mobo') setMoboRamSlots(moboRamSlotCount(comp));
      }
      toggleComponent(id, !!selected[id] && !!comp);
    });
    if (!cb.oscillate) controls.autoRotate = true;
  }

  // ---- completion: swing to the front view, spin up, then ease back to the idle rotation ----------------
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
    const align = () => {
      const p = Math.min(1, (Date.now() - start) / dur);
      const eased = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      camera.position.lerpVectors(startPos, frontPos, eased);
      camera.lookAt(0, 0.2, 0);
      controls.update();
      if (p < 1) {
        requestAnimationFrame(align);
        return;
      }
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
    };
    align();
  }

  // ---- picking / hover outline -----------------------------------------------------------------------
  function hoverClear() {
    outline.children.slice().forEach((c) => outline.remove(c)); // geometries are shared with the real meshes (hull) or owned by the edge lines
    edgeGeoms.splice(0).forEach((g) => g.dispose());
  }

  function pickComponentAt(clientX: number, clientY: number): CompId | null {
    const r = renderer.domElement.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    raycaster.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), camera);
    const targets: THREE.Object3D[] = [];
    (Object.keys(slots) as PartId[]).forEach((id) => {
      if (slots[id].selected && slots[id].group.visible) targets.push(slots[id].group);
    });
    const hit = raycaster.intersectObjects(targets, true).find((h) => (h.object as THREE.Mesh).isMesh);
    if (hit) return (hit.object.userData.slot as CompId) ?? null;
    if (caseRec.selected) {
      const caseTargets: THREE.Object3D[] = [fans, ...shell.children.filter((c) => c.type === 'Group')];
      const ch = raycaster.intersectObjects(caseTargets, true).find((h) => (h.object as THREE.Mesh).isMesh);
      if (ch) return 'case';
    }
    return null;
  }

  // Parts glow via an inflated back-face hull (a clean rim, no postprocessing); instanced meshes (fan blades,
  // cooler fins) copy their instance matrices. The case uses its edge wireframe — wrapping large panels the
  // same way would read as the whole side lighting up.
  function setHoverOutline(id: CompId | null) {
    hoverClear();
    if (!id) return;
    const roots: THREE.Object3D[] = id === 'case' ? [fans, ...shell.children.filter((c) => c.type === 'Group')] : slots[id]?.group.visible ? [slots[id].group] : [];
    roots.forEach((root) => {
      root.updateWorldMatrix(true, true);
      root.traverse((o) => {
        const inst = o as THREE.InstancedMesh;
        const m = o as THREE.Mesh;
        if (inst.isInstancedMesh) {
          const hull = new THREE.InstancedMesh(inst.geometry, outlineHullMat, inst.count);
          hull.instanceMatrix.copy(inst.instanceMatrix);
          inst.getWorldPosition(hull.position);
          inst.getWorldQuaternion(hull.quaternion);
          inst.getWorldScale(hull.scale);
          hull.scale.multiplyScalar(1.04);
          outline.add(hull);
        } else if (m.isMesh && m.geometry) {
          const hull = new THREE.Mesh(m.geometry, outlineHullMat);
          m.getWorldPosition(hull.position);
          m.getWorldQuaternion(hull.quaternion);
          m.getWorldScale(hull.scale);
          hull.scale.multiplyScalar(1.04);
          outline.add(hull);
        }
      });
    });
    if (id === 'case') {
      const g = new THREE.EdgesGeometry(new THREE.BoxGeometry(caseSize.w, caseSize.h, caseSize.d));
      edgeGeoms.push(g);
      const box = new THREE.LineSegments(g, outlineEdgeMat);
      box.matrixAutoUpdate = false;
      box.matrix.copy(caseRec.group.matrixWorld);
      outline.add(box);
    }
  }

  // ---- render loop -----------------------------------------------------------------------------------
  // A canvas scrolled out of view skips the actual render work (rAF itself keeps ticking, cheaply, so it
  // resumes instantly) — same trick as the production scene.
  const visibilityObserver = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
    },
    { threshold: 0 },
  );
  visibilityObserver.observe(container);

  const clock = new THREE.Clock();
  function stepMove(rec: Rec, id: CompId) {
    const m = rec.move;
    if (!m) return;
    const now = Date.now();
    if (now < m.t0) return;
    const p = Math.min(1, (now - m.t0) / m.dur);
    const e = 1 - Math.pow(1 - p, 3);
    rec.group.position.lerpVectors(m.from, m.to, e);
    rec.group.scale.setScalar(m.fromS + (m.toS - m.fromS) * e);
    if (p >= 1) {
      rec.move = null;
      if (m.exiting) rec.group.visible = false;
      else refreshDimensions(id);
    }
  }

  function tick() {
    if (!running) return;
    requestAnimationFrame(tick);
    if (document.hidden || !inView) return;
    const dt = clock.getDelta();
    const t = clock.elapsedTime;
    stepMove(caseRec, 'case');
    (Object.keys(slots) as PartId[]).forEach((id) => stepMove(slots[id], id));
    if (motionOn) {
      spinners.forEach((s) => (s.rotation.z -= dt * 6));
      ringSpins.forEach(({ mesh, spin }) => (mesh.rotation.z += spin));
      motes.forEach((m) => {
        m.mesh.position.y = m.basePos.y + Math.sin(t * 0.5 + m.phase) * 0.18;
        m.mesh.position.x = m.basePos.x + Math.cos(t * 0.35 + m.phase) * 0.12;
        (m.mesh.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(t * 0.8 + m.phase) * 0.25;
      });
    }
    if (cb.oscillate) {
      const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
      sph.theta = oscillateBaseTheta + 0.7 * Math.sin((2 * Math.PI * t) / 20);
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sph));
    }
    controls.update();
    renderer.render(scene, camera);
  }
  tick();

  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(container);

  return {
    toggleComponent,
    updateCase,
    toggleGlass,
    pickComponentAt,
    setHoverOutline,
    setSizeScale,
    setGpuOrientation,
    setRamModules,
    setMoboRamSlots,
    setComponentDimensions,
    setDimensionsVisible,
    setCanVisible,
    setFans,
    applyBuildSnapshot,
    triggerCompletion,
    setMotion(on: boolean) {
      motionOn = on;
      ambientGroup.visible = on;
    },
    getCaseSizeFor: (category: string) => SIZES[category] || SIZES['Mid Tower'],
    isCompletionRunning: () => completionRunning,
    // Admin's saved alignment for the current motherboard form factor (see /build's resolveAlignmentTuning).
    // Each call is the complete override set for that form factor, so it is applied on top of the
    // production defaults rather than merged into whatever the previous form factor had saved.
    applyAlignmentTuning(partial: Partial<AlignmentTuning> = {}) {
      const D = DEFAULT_ALIGNMENT_TUNING;
      const v3 = (v: [number, number, number]): [number, number, number] => [v[0], v[1], v[2]];
      const full: AlignmentTuning = {
        basePos: {
          cpu: v3(partial.basePos?.cpu ?? D.basePos.cpu),
          cooler: v3(partial.basePos?.cooler ?? D.basePos.cooler),
          ram: v3(partial.basePos?.ram ?? D.basePos.ram),
          storage: v3(partial.basePos?.storage ?? D.basePos.storage),
          gpu: v3(partial.basePos?.gpu ?? D.basePos.gpu),
        },
        moboRearClearance: partial.moboRearClearance ?? D.moboRearClearance,
        moboSideClearance: partial.moboSideClearance ?? D.moboSideClearance,
        gpuSideClearance: partial.gpuSideClearance ?? D.gpuSideClearance,
        gpuVerticalBottomClearance: partial.gpuVerticalBottomClearance ?? D.gpuVerticalBottomClearance,
        aioTubeSpacing: partial.aioTubeSpacing ?? D.aioTubeSpacing,
        aioTubeRadius: partial.aioTubeRadius ?? D.aioTubeRadius,
        aioBendOffset: v3(partial.aioBendOffset ?? D.aioBendOffset),
      };
      const next = tuningFromAlignment(full);
      if (JSON.stringify(next) === JSON.stringify(inputs.tuning)) return; // nothing moved: skip the rebuild
      inputs.tuning = next;
      rebuildAllParts();
      rebuildFans();
    },
    // ---- lab-only helpers ----
    info: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }),
    getGpuVertical: () => inputs.gpuVertical,
    // Real-mm extent of an installed part's mesh (at rest), for the sizing-parity check on the lab page.
    measure(id: CompId): { x: number; y: number; z: number } | null {
      if (id === 'case') return { x: caseSize.w * MM_PER_UNIT, y: caseSize.h * MM_PER_UNIT, z: caseSize.d * MM_PER_UNIT };
      const rec = slots[id];
      if (!rec) return null;
      const s = rec.group.scale.x || 1;
      const size = new THREE.Box3().setFromObject(rec.group).getSize(new THREE.Vector3()).divideScalar(s);
      return { x: size.x * MM_PER_UNIT, y: size.y * MM_PER_UNIT, z: size.z * MM_PER_UNIT };
    },
    dispose() {
      running = false;
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      hoverClear();
      (Object.keys(dimGroups) as (CompId | 'can')[]).forEach(clearDimensions);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mt = m.material;
        if (mt) (Array.isArray(mt) ? mt : [mt]).forEach((x) => x.dispose());
      });
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export type BuildSceneV2 = ReturnType<typeof createBuildSceneV2>;
