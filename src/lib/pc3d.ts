// Lightweight three.js preview of a prebuilt GOMP, styled like the /build configurator
// (translucent case, glass side panel on +X, motherboard on the back wall, gold-ringed fans),
// in the homepage's dark / racing-green palette.
//
// Two entry points:
//  - createPc3DViewer(container)  live, orbitable scene for the homepage spotlight card
//  - renderPcSnapshots(specs)     one-off transparent PNG thumbnails for cards and lists,
//                                 so the page never runs more than one live WebGL scene.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type Pc3DSpec = {
  case: 'full' | 'mid';
  cooler: 'aio' | 'air';
  rad?: 240 | 280 | 360; // AIO radiator size in mm
  gpuMm: number; // card length in mm
  gpuFans: 0 | 2 | 3; // 0 = water-block card
  ram: 1 | 2; // number of sticks
  ramColor: number; // heatspreader colour
};

const MM = (v: number) => v / 105; // same mm-per-unit scale as the configurator
const CASES = { full: { w: 2.3, h: 5.2, d: 4.6 }, mid: { w: 2.0, h: 4.5, d: 4.2 } } as const;
const COL = { green: 0x1f8a55, gold: 0xc9a95e, bg: 0x0c110f };

const mat = (color: number, o: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.5, ...o });
const glow = (color: number, k = 1.6) =>
  mat(color, { emissive: color, emissiveIntensity: k, roughness: 0.4, metalness: 0.1 });
const box = (x: number, y: number, z: number, m: THREE.Material) => new THREE.Mesh(new THREE.BoxGeometry(x, y, z), m);

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Ring lies in the XY plane and faces +Z. userData.spin is the blade group to rotate.
function fan(r: number) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.07, 10, 48), mat(COL.gold, { metalness: 0.85, roughness: 0.25 })));
  g.add(new THREE.Mesh(new THREE.TorusGeometry(r * 0.9, r * 0.035, 8, 48), glow(COL.green, 1.8)));
  const blades = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const piv = new THREE.Group();
    piv.rotation.z = (i * Math.PI * 2) / 7;
    const b = box(r * 0.74, r * 0.3, 0.015, mat(0x1b2c23, { metalness: 0.3 }));
    b.position.x = r * 0.46;
    b.rotation.x = 0.55;
    piv.add(b);
    blades.add(piv);
  }
  g.add(blades);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.22, r * 0.22, 0.06, 20), mat(COL.gold, { metalness: 0.85, roughness: 0.2 }));
  hub.rotation.x = Math.PI / 2;
  g.add(hub);
  g.userData.spin = blades;
  return g;
}

type PcGroup = THREE.Group & { userData: { fans: THREE.Object3D[]; h: number } };

function buildPC(s: Pc3DSpec): PcGroup {
  const { w, h, d } = CASES[s.case] ?? CASES.mid;
  const g = new THREE.Group() as PcGroup;
  const fans: THREE.Object3D[] = [];
  const addFan = (f: THREE.Group) => {
    fans.push(f.userData.spin as THREE.Object3D);
    g.add(f);
  };

  // Case shell
  const panel = () =>
    new THREE.MeshStandardMaterial({ color: 0x18201c, roughness: 0.72, metalness: 0.18, side: THREE.DoubleSide, transparent: true, opacity: 0.62, depthWrite: false });
  const plane = (a: number, b: number) => new THREE.Mesh(new THREE.PlaneGeometry(a, b), panel());
  const back = plane(d, h); back.rotation.y = Math.PI / 2; back.position.x = -w / 2; g.add(back);
  const top = plane(w, d); top.rotation.x = Math.PI / 2; top.position.y = h / 2; g.add(top);
  const bot = plane(w, d); bot.rotation.x = -Math.PI / 2; bot.position.y = -h / 2; g.add(bot);
  const front = plane(w, h); front.position.z = -d / 2; g.add(front);
  const rear = plane(w, h); rear.position.z = d / 2; g.add(rear);
  g.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), new THREE.LineBasicMaterial({ color: COL.green, transparent: true, opacity: 0.75 })));
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(d, h),
    new THREE.MeshStandardMaterial({ color: 0xc9dee2, transparent: true, opacity: 0.08, roughness: 0.06, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false }),
  );
  glass.rotation.y = -Math.PI / 2; glass.position.x = w / 2 + 0.006; g.add(glass);
  ([[-1, -1], [-1, 1], [1, -1], [1, 1]] as const).forEach(([a, b]) => {
    const f = box(0.28, 0.08, 0.28, mat(0x111614));
    f.position.set(a * (w / 2 - 0.2), -h / 2 - 0.04, b * (d / 2 - 0.3));
    g.add(f);
  });

  // Motherboard (ATX 244 x 305 mm) on the back wall, flush to the rear
  const mW = MM(244), mH = MM(305), mx = -w / 2 + 0.1, my = h / 2 - 0.3 - mH / 2, mz = d / 2 - 0.2 - mW / 2;
  const mobo = box(0.05, mH, mW, mat(0x0f2d19, { roughness: 0.7, metalness: 0.2 })); mobo.position.set(mx, my, mz); g.add(mobo);
  const io = box(0.08, 0.9, 0.3, mat(0x8a8a90, { metalness: 0.85, roughness: 0.3 })); io.position.set(mx + 0.06, my + mH / 2 - 0.55, mz + mW / 2 - 0.2); g.add(io);
  const slot = box(0.06, 0.06, MM(90), mat(0x22223a)); slot.position.set(mx + 0.05, my - 0.45, mz + 0.2); g.add(slot);

  // CPU
  const cy = my + mH / 2 - 0.85, cz = mz + 0.15;
  const cpu = box(0.06, 0.42, 0.42, mat(0xb7b2a6, { metalness: 0.9, roughness: 0.25 })); cpu.position.set(mx + 0.055, cy, cz); g.add(cpu);

  // RAM: 4 slots beside the socket, sticks in slots 2 and 4 (or just 2)
  for (let i = 0; i < 4; i++) {
    const filled = s.ram === 2 ? i === 1 || i === 3 : i === 1;
    const z = cz - 0.6 - i * 0.12;
    if (filled) {
      const st = box(MM(44), MM(133), 0.07, mat(s.ramColor, { metalness: 0.75, roughness: 0.28 })); st.position.set(mx + 0.03 + MM(22), cy, z); g.add(st);
      const led = box(0.03, MM(133), 0.075, glow(COL.green, 1.4)); led.position.set(mx + 0.03 + MM(44) + 0.015, cy, z); g.add(led);
    } else {
      const sl = box(0.05, MM(133), 0.05, mat(0x1a1a22)); sl.position.set(mx + 0.05, cy, z); g.add(sl);
    }
  }

  // GPU
  const gL = Math.min(MM(s.gpuMm), d - 0.35), gW = MM(137), gT = s.gpuFans === 3 ? 0.58 : 0.46;
  const gx = mx + 0.03 + gW / 2, gy = my - 0.45 - gT / 2 - 0.05, gz = d / 2 - 0.12 - gL / 2;
  const shroud = box(gW, gT, gL, mat(0x1a1c20, { metalness: 0.72, roughness: 0.18 })); shroud.position.set(gx, gy, gz); g.add(shroud);
  const bp = box(gW, 0.03, gL, mat(0x262a30, { metalness: 0.95, roughness: 0.13 })); bp.position.set(gx, gy + gT / 2 + 0.015, gz); g.add(bp);
  const strip = box(0.02, 0.05, gL * 0.78, glow(COL.green, 2)); strip.position.set(gx + gW / 2 + 0.011, gy + gT * 0.2, gz); g.add(strip);
  const logo = box(0.021, 0.06, 0.3, glow(COL.gold, 1)); logo.position.set(gx + gW / 2 + 0.012, gy - gT * 0.15, gz - gL * 0.25); g.add(logo);
  if (s.gpuFans) {
    const r = Math.min(0.5, gL / (2 * s.gpuFans) - 0.04);
    for (let i = 0; i < s.gpuFans; i++) {
      const f = fan(r);
      f.rotation.x = Math.PI / 2;
      f.position.set(gx, gy - gT / 2 - 0.012, gz - gL / 2 + ((i + 0.5) * gL) / s.gpuFans);
      addFan(f);
    }
  } else {
    // Water-block card: glowing coolant channel instead of fans
    const wb = box(gW * 0.8, 0.04, gL * 0.85, glow(COL.green, 1.2)); wb.position.set(gx, gy - gT / 2 - 0.02, gz); g.add(wb);
  }

  // PSU shroud
  const shH = 0.85;
  const shr = box(w - 0.04, shH, d - 0.04, mat(0x0d120f, { metalness: 0.3, roughness: 0.5 })); shr.position.set(0, -h / 2 + shH / 2, 0); g.add(shr);
  const line = box(0.01, 0.03, d * 0.55, glow(COL.gold, 0.9)); line.position.set(w / 2 - 0.015, -h / 2 + shH - 0.14, 0); g.add(line);

  // Front intake fans + rear exhaust
  for (let y = -h / 2 + shH + 0.62; y + 0.58 < h / 2 - 0.05; y += 1.2) {
    const f = fan(0.55); f.position.set(0.1, y, -d / 2 + 0.09); addFan(f);
  }
  const rf = fan(0.5); rf.position.set(0.1, my + mH / 2 - 0.55, d / 2 - 0.09); addFan(rf);

  // CPU cooler
  if (s.cooler === 'aio') {
    const radMm = s.rad ?? 360;
    const len = MM(radMm), rx = 0.3, ry = h / 2 - 0.2;
    const rad = box(MM(120), 0.27, len, mat(0x1c1c1c, { metalness: 0.7, roughness: 0.35 })); rad.position.set(rx, ry, -d / 2 + 0.25 + len / 2); g.add(rad);
    const n = Math.round(radMm / 120);
    for (let i = 0; i < n; i++) {
      const f = fan(0.52); f.rotation.x = Math.PI / 2; f.position.set(rx, ry - 0.2, -d / 2 + 0.25 + ((i + 0.5) * len) / n); addFan(f);
    }
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 32), mat(0x0a0a0a, { metalness: 0.85, roughness: 0.2 }));
    pump.rotation.z = Math.PI / 2; pump.position.set(mx + 0.16, cy, cz); g.add(pump);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 10, 40), glow(COL.green, 2.2)); ring.rotation.y = Math.PI / 2; ring.position.set(mx + 0.245, cy, cz); g.add(ring);
    const cap = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), glow(COL.gold, 0.5)); cap.rotation.y = Math.PI / 2; cap.position.set(mx + 0.247, cy, cz); g.add(cap);
    const tubeM = mat(0x2a2a2a, { roughness: 0.6, metalness: 0.1 });
    [-0.08, 0.08].forEach((o) => {
      const c = new THREE.CatmullRomCurve3([
        new THREE.Vector3(mx + 0.25, cy + o, cz + 0.18),
        new THREE.Vector3(rx - 0.1, cy + 0.55 + o, cz + 0.3),
        new THREE.Vector3(rx - 0.2, ry - 0.1, -d / 2 + 0.25 + len * 0.55 + o),
      ]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 24, 0.035, 8), tubeM));
    });
  } else {
    const base = box(0.12, 0.45, 0.45, mat(0x3a3a3a, { metalness: 0.6, roughness: 0.35 })); base.position.set(mx + 0.14, cy, cz); g.add(base);
    const finM = mat(0x8a8a90, { metalness: 0.75, roughness: 0.3 }), x0 = mx + 0.25, tH = MM(158) - 0.2;
    for (let i = 0; i < 26; i++) {
      const p = box(0.012, 1.1, 0.5, finM); p.position.set(x0 + 0.3 + (i * (tH - 0.3)) / 26, cy, cz); g.add(p);
    }
    const pipeM = mat(0xc4823a, { metalness: 0.85, roughness: 0.25 });
    [-0.3, -0.1, 0.1, 0.3].forEach((o) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, tH, 10), pipeM);
      p.rotation.z = Math.PI / 2; p.position.set(x0 + tH / 2, cy + o, cz + 0.1); g.add(p);
    });
    const topCap = box(0.04, 1.12, 0.52, mat(COL.gold, { metalness: 0.85, roughness: 0.25 })); topCap.position.set(x0 + tH, cy, cz); g.add(topCap);
    const f = fan(0.52); f.position.set(x0 + tH / 2 + 0.1, cy, cz - 0.33); addFan(f);
  }

  const inner = new THREE.PointLight(COL.green, 3, 5); inner.position.set(0.3, 0, 0); g.add(inner);
  g.userData = { fans, h };
  return g;
}

function disposeTree(o: THREE.Object3D) {
  o.traverse((m) => {
    const mesh = m as THREE.Mesh;
    mesh.geometry?.dispose();
    const mt = mesh.material;
    if (mt) (Array.isArray(mt) ? mt : [mt]).forEach((x) => x.dispose());
  });
}

function createStage(width: number, height: number, transparent = false) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: transparent, preserveDrawingBuffer: transparent });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  const scene = new THREE.Scene();
  if (!transparent) scene.background = new THREE.Color(COL.bg);
  scene.add(new THREE.AmbientLight(0xf5ecd8, 1.3));
  const sun = new THREE.DirectionalLight(0xffffff, 2.3); sun.position.set(5, 10, 5); scene.add(sun);
  const side = new THREE.PointLight(COL.green, 3, 24); side.position.set(-4, 1, -3); scene.add(side);
  const warm = new THREE.PointLight(0xffe4c0, 0.8, 15); warm.position.set(4, -2, 4); scene.add(warm);
  const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);

  let floor: THREE.Mesh | null = null;
  let grid: THREE.GridHelper | null = null;
  if (!transparent) {
    floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x0f1613 }));
    floor.rotation.x = -Math.PI / 2; scene.add(floor);
    grid = new THREE.GridHelper(40, 80, 0x2a3a31, 0x1c2822);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.5;
    scene.add(grid);
  }

  let pc: PcGroup | null = null;
  function setBuild(spec: Pc3DSpec) {
    if (pc) { scene.remove(pc); disposeTree(pc); }
    pc = buildPC(spec);
    scene.add(pc);
    const h = pc.userData.h;
    if (floor && grid) { floor.position.y = -h / 2 - 0.09; grid.position.y = floor.position.y + 0.01; }
    const dir = new THREE.Vector3(7, 2.9, 2.6).normalize();
    camera.position.copy(dir.multiplyScalar(h * 2.15));
    camera.lookAt(0, -0.1, 0);
  }
  function dispose() {
    if (pc) disposeTree(pc);
    floor?.geometry.dispose();
    renderer.dispose();
  }
  return { renderer, scene, camera, setBuild, dispose, getPc: () => pc };
}

export type Pc3DViewer = { show: (spec: Pc3DSpec) => void; dispose: () => void };

export function createPc3DViewer(container: HTMLElement): Pc3DViewer {
  const reduced = prefersReducedMotion();
  const rect = container.getBoundingClientRect();
  const st = createStage(rect.width || 340, rect.height || 425);
  const canvas = st.renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%';
  container.appendChild(canvas);

  const controls = new OrbitControls(st.camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.target.set(0, -0.1, 0);
  controls.autoRotate = !reduced;
  controls.autoRotateSpeed = 1.1;
  let resume: ReturnType<typeof setTimeout> | undefined;
  controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(resume); container.dataset.touched = '1'; });
  controls.addEventListener('end', () => { if (!reduced) resume = setTimeout(() => { controls.autoRotate = true; }, 4000); });

  const ro = new ResizeObserver(() => {
    const r = container.getBoundingClientRect();
    if (!r.width) return;
    st.renderer.setSize(r.width, r.height, false);
    st.camera.aspect = r.width / r.height;
    st.camera.updateProjectionMatrix();
  });
  ro.observe(container);

  let visible = true;
  const io = new IntersectionObserver((e) => { visible = e[0]?.isIntersecting ?? true; });
  io.observe(container);

  let raf = 0, last = performance.now();
  const loop = (t: number) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    if (!visible) return;
    controls.update();
    const pc = st.getPc();
    if (!reduced && pc) pc.userData.fans.forEach((b) => { b.rotation.z += dt * 7; });
    st.renderer.render(st.scene, st.camera);
  };
  raf = requestAnimationFrame(loop);

  return {
    show(spec) {
      st.setBuild(spec);
      controls.target.set(0, -0.1, 0);
      controls.update();
    },
    dispose() {
      cancelAnimationFrame(raf);
      clearTimeout(resume);
      ro.disconnect();
      io.disconnect();
      controls.dispose();
      st.dispose();
      canvas.remove();
    },
  };
}

// Renders each spec once into a transparent PNG data URL (keyed by your own id).
export function renderPcSnapshots(items: { id: string; spec: Pc3DSpec }[], width = 280, height = 336): Record<string, string> {
  const st = createStage(width, height, true);
  const out: Record<string, string> = {};
  for (const { id, spec } of items) {
    st.setBuild(spec);
    st.renderer.render(st.scene, st.camera);
    out[id] = st.renderer.domElement.toDataURL('image/png');
  }
  st.dispose();
  st.renderer.forceContextLoss();
  return out;
}
