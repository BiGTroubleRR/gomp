// Interactive three.js PC-builder scene for the Build page — ported from GOMP_Config.dc.html's
// inline three.js code. Instantiable (not module-singleton) so React can create/dispose it
// cleanly per mount via a useEffect. Owns the renderer/camera/scene/controls and every
// per-component mesh; exposes an imperative API the page's React state changes call into.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type CompId = 'mobo' | 'cpu' | 'cooler' | 'ram' | 'gpu' | 'storage' | 'psu' | 'case';
export const SLOTS: CompId[] = ['mobo', 'cpu', 'cooler', 'ram', 'gpu', 'storage', 'psu', 'case'];

const BASE_POS: Record<Exclude<CompId, 'case'>, [number, number, number]> = {
  mobo: [-0.88, 0.2, 0.0],
  cpu: [-0.78, 0.65, 0.1],
  cooler: [-0.42, 0.75, 0.1],
  ram: [-0.8, 0.85, -0.09],
  gpu: [-0.45, -0.5, 0.1],
  storage: [-0.8, 0.08, 0.37],
  psu: [0.1, -1.88, 0.0],
};

const SIZES: Record<string, { w: number; h: number; d: number }> = {
  'Full Tower': { w: 2.3, h: 5.5, d: 2.2 },
  'Mid Tower': { w: 2.0, h: 4.5, d: 2.0 },
  'Mini Tower': { w: 1.7, h: 3.9, d: 1.8 },
  SFF: { w: 1.4, h: 3.2, d: 1.5 },
};

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
};

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
      const pcbM = new T.MeshStandardMaterial({ color: 0x001825, roughness: 0.6 });
      const sM = new T.MeshStandardMaterial({ color: 0x6e1423, roughness: 0.2, metalness: 0.7, emissive: 0x0a1520, emissiveIntensity: 0.3 });
      const rgbMat = new T.MeshStandardMaterial({ color: 0xc4a35a, emissive: 0xc4a35a, emissiveIntensity: 0.75 });
      [-0.11, 0.0].forEach((z) => {
        const s = new T.Mesh(new T.BoxGeometry(0.04, 1.0, 0.08), pcbM);
        s.position.z = z;
        g.add(s);
        const h = new T.Mesh(new T.BoxGeometry(0.05, 0.62, 0.09), sM);
        h.position.set(0.005, 0.2, z);
        g.add(h);
        const rgb = new T.Mesh(new T.BoxGeometry(0.052, 0.03, 0.09), rgbMat);
        rgb.position.set(0.005, 0.52, z);
        g.add(rgb);
      });
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
      return g;
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
    const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), panelMat());
    front.position.z = d / 2;
    caseGroup.add(front);
    const rear = new THREE.Mesh(new THREE.PlaneGeometry(w, h), panelMat());
    rear.rotation.y = Math.PI;
    rear.position.z = -d / 2;
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
  let compScale = 1;

  (Object.keys(BASE_POS) as Exclude<CompId, 'case'>[]).forEach((id) => {
    const mesh = buildComponentMesh(id);
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
  };

  function scaleComponentPositions() {
    (Object.keys(BASE_POS) as Exclude<CompId, 'case'>[]).forEach((id) => {
      const obj = objects[id];
      if (!obj) return;
      const base = BASE_POS[id];
      obj.finalPos.set(base[0], base[1], base[2]);
      if (obj.selected) {
        obj.targetPos.copy(obj.finalPos);
        obj.mesh.position.copy(obj.finalPos);
        obj.mesh.scale.setScalar(compScale);
      }
    });
  }

  function updateCase(w: number, h: number, d: number) {
    const sx = w / 2.0;
    const sy = h / 4.5;
    const sz = d / 2.0;
    compScale = Math.min(sx, sy, sz);
    buildCase(w, h, d);
    if (objects.case) {
      objects.case.mesh = caseGroup;
      objects.case.finalPos.set(0, 0, 0);
      if (objects.case.selected) {
        caseGroup.visible = true;
        objects.case.targetPos.set(0, 0, 0);
      }
    }
    scaleComponentPositions();
  }

  function toggleComponent(id: CompId, nextSelected: boolean) {
    const obj = objects[id];
    if (!obj) return;
    obj.selected = nextSelected;
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
      obj.targetScale = new THREE.Vector3(compScale, compScale, compScale);
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

  let running = true;
  const clock = new THREE.Clock();
  function tick() {
    if (!running) return;
    requestAnimationFrame(tick);
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

  return {
    toggleComponent,
    updateCase,
    toggleGlass,
    triggerCompletion,
    setMotion(on: boolean) {
      motionOn = on;
      ambientGroup.visible = on;
    },
    isCompletionRunning: () => completionRunning,
    getCaseSizeFor: (category: string) => SIZES[category] || SIZES['Mid Tower'],
    dispose() {
      running = false;
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    },
  };
}

export type BuildScene = ReturnType<typeof createBuildScene>;
export { SIZES as CASE_SIZES };
