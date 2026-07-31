'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export type CompDbEntry = { name: string; price?: number; specs?: string; category?: string; tier?: string };
export type CompDb = Partial<Record<'mobo' | 'cpu' | 'cooler' | 'ram' | 'gpu' | 'storage' | 'psu' | 'case', CompDbEntry[]>>;

type Config = {
  selected: Partial<Record<string, boolean>>;
  selections: Partial<Record<string, string>>;
  compDb: CompDb;
};

const CASE_SIZES: Record<string, { w: number; h: number; d: number }> = {
  'Full Tower': { w: 2.3, h: 5.5, d: 2.2 },
  'Mid Tower': { w: 2.0, h: 4.5, d: 2.0 },
  'Mini Tower': { w: 1.7, h: 3.9, d: 1.8 },
  SFF: { w: 1.4, h: 3.2, d: 1.5 },
};

function getCaseSize(comp?: CompDbEntry) {
  if (comp?.category && CASE_SIZES[comp.category]) return CASE_SIZES[comp.category];
  const s = comp?.specs || '';
  if (s.indexOf('Full-Tower') !== -1 || s.indexOf('Full Tower') !== -1) return CASE_SIZES['Full Tower'];
  if (s.indexOf('Mid-Tower') !== -1 || s.indexOf('Mid Tower') !== -1) return CASE_SIZES['Mid Tower'];
  if (s.indexOf('Micro-ATX') !== -1) return CASE_SIZES['Mini Tower'];
  if (s.indexOf('Mini-ITX') !== -1) return CASE_SIZES['SFF'];
  return CASE_SIZES['Mid Tower'];
}

const BASE_POS: Record<string, [number, number, number]> = {
  mobo: [-0.88, 0.2, 0.0],
  cpu: [-0.78, 0.65, 0.1],
  cooler: [-0.42, 0.75, 0.1],
  ram: [-0.8, 0.85, -0.09],
  gpu: [-0.45, -0.5, 0.1],
  storage: [-0.8, 0.08, 0.37],
  psu: [0.1, -1.88, 0.0],
};

function buildComponentMesh(T2: typeof THREE, id: string): THREE.Object3D | null {
  switch (id) {
    case 'mobo': {
      const g = new T2.Group();
      g.add(new T2.Mesh(new T2.BoxGeometry(0.04, 2.8, 1.5), new T2.MeshStandardMaterial({ color: 0x0f2d19, roughness: 0.7 })));
      const vrm = new T2.Mesh(new T2.BoxGeometry(0.09, 0.15, 0.36), new T2.MeshStandardMaterial({ color: 0x111120, roughness: 0.3, metalness: 0.7 }));
      vrm.position.set(0.06, 1.28, -0.32);
      g.add(vrm);
      const pcie = new T2.Mesh(new T2.BoxGeometry(0.06, 0.06, 0.88), new T2.MeshStandardMaterial({ color: 0x22223a }));
      pcie.position.set(0.05, -0.48, 0.08);
      g.add(pcie);
      return g;
    }
    case 'cpu': {
      const g = new T2.Group();
      g.add(new T2.Mesh(new T2.BoxGeometry(0.1, 0.3, 0.3), new T2.MeshStandardMaterial({ color: 0xb09010, roughness: 0.12, metalness: 0.95 })));
      const sub = new T2.Mesh(new T2.BoxGeometry(0.06, 0.36, 0.36), new T2.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 }));
      sub.position.x = -0.02;
      g.add(sub);
      return g;
    }
    case 'cooler': {
      const g = new T2.Group();
      g.add(new T2.Mesh(new T2.BoxGeometry(0.36, 0.36, 0.38), new T2.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.2, metalness: 0.85 })));
      const lcd = new T2.Mesh(
        new T2.CircleGeometry(0.12, 16),
        new T2.MeshStandardMaterial({ color: 0x6e1423, emissive: 0x6e1423, emissiveIntensity: 1.0, side: T2.DoubleSide }),
      );
      lcd.rotation.y = Math.PI / 2;
      lcd.position.x = 0.185;
      g.add(lcd);
      return g;
    }
    case 'ram': {
      const g = new T2.Group();
      const pcbM = new T2.MeshStandardMaterial({ color: 0x001825, roughness: 0.6 });
      const sM = new T2.MeshStandardMaterial({ color: 0x6e1423, roughness: 0.2, metalness: 0.7, emissive: 0x0a1520, emissiveIntensity: 0.3 });
      [-0.11, 0.0].forEach((z) => {
        const s = new T2.Mesh(new T2.BoxGeometry(0.04, 1.0, 0.08), pcbM);
        s.position.z = z;
        g.add(s);
        const h = new T2.Mesh(new T2.BoxGeometry(0.05, 0.62, 0.09), sM);
        h.position.set(0.005, 0.2, z);
        g.add(h);
      });
      return g;
    }
    case 'gpu': {
      const g = new T2.Group();
      const bodyMat = new T2.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.18, metalness: 0.72 });
      const ribMat = new T2.MeshStandardMaterial({ color: 0x252830, roughness: 0.1, metalness: 0.9 });
      const pcbMat = new T2.MeshStandardMaterial({ color: 0x081318, roughness: 0.85, metalness: 0.1 });
      const bpMat = new T2.MeshStandardMaterial({ color: 0x1c1e24, roughness: 0.13, metalness: 0.95 });
      const bracketMat = new T2.MeshStandardMaterial({ color: 0x888078, roughness: 0.2, metalness: 0.94 });
      const goldMat = new T2.MeshStandardMaterial({ color: 0xc4a030, roughness: 0.1, metalness: 1.0 });
      const portMat = new T2.MeshStandardMaterial({ color: 0x030305, roughness: 0.98 });
      const darkMat = new T2.MeshStandardMaterial({ color: 0x0a0b0e, roughness: 0.28, metalness: 0.5 });
      const pcb = new T2.Mesh(new T2.BoxGeometry(0.028, 0.2, 0.84), pcbMat);
      g.add(pcb);
      const bp = new T2.Mesh(new T2.BoxGeometry(0.012, 0.2, 0.84), bpMat);
      bp.position.x = -0.02;
      g.add(bp);
      const shroud = new T2.Mesh(new T2.BoxGeometry(0.27, 0.268, 0.82), bodyMat);
      shroud.position.x = 0.149;
      g.add(shroud);
      const topCham = new T2.Mesh(new T2.BoxGeometry(0.272, 0.022, 0.82), ribMat);
      topCham.position.set(0.149, 0.145, 0);
      g.add(topCham);
      const botCham = new T2.Mesh(new T2.BoxGeometry(0.272, 0.012, 0.82), ribMat);
      botCham.position.set(0.149, -0.138, 0);
      g.add(botCham);
      const faceX = 0.285;
      const hBar = new T2.Mesh(new T2.BoxGeometry(0.009, 0.016, 0.82), ribMat);
      hBar.position.set(faceX, 0.02, 0);
      g.add(hBar);
      [-0.225, 0.225].forEach((z) => {
        const R = 0.112;
        const bezel = new T2.Mesh(new T2.TorusGeometry(R, 0.011, 16, 48), ribMat);
        bezel.rotation.y = Math.PI / 2;
        bezel.position.set(faceX, 0, z);
        g.add(bezel);
        const hub = new T2.Mesh(
          new T2.CylinderGeometry(0.024, 0.024, 0.022, 20),
          new T2.MeshStandardMaterial({ color: 0x303038, roughness: 0.1, metalness: 0.92 }),
        );
        hub.rotation.z = Math.PI / 2;
        hub.position.set(faceX, 0, z);
        g.add(hub);
      });
      const bkt = new T2.Mesh(new T2.BoxGeometry(0.282, 0.248, 0.013), bracketMat);
      bkt.position.set(0.141, 0, -0.414);
      g.add(bkt);
      [
        { y: 0.07, h: 0.044 },
        { y: 0.01, h: 0.044 },
        { y: -0.048, h: 0.044 },
        { y: -0.104, h: 0.029 },
      ].forEach((p) => {
        const port = new T2.Mesh(new T2.BoxGeometry(0.011, p.h, 0.007), portMat);
        port.position.set(0.085, p.y, -0.421);
        g.add(port);
      });
      const pwr = new T2.Mesh(new T2.BoxGeometry(0.028, 0.046, 0.098), darkMat);
      pwr.position.set(0.0, 0.127, -0.305);
      g.add(pwr);
      const pcie2 = new T2.Mesh(new T2.BoxGeometry(0.008, 0.033, 0.188), goldMat);
      pcie2.position.set(0.0, -0.12, -0.272);
      g.add(pcie2);
      g.rotation.z = -Math.PI / 2;
      return g;
    }
    case 'storage': {
      const g = new T2.Group();
      g.add(new T2.Mesh(new T2.BoxGeometry(0.04, 0.08, 0.22), new T2.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.4, metalness: 0.5 })));
      const stk = new T2.Mesh(new T2.BoxGeometry(0.044, 0.07, 0.2), new T2.MeshStandardMaterial({ color: 0x6e1423 }));
      stk.position.x = 0.004;
      g.add(stk);
      return g;
    }
    case 'psu': {
      const g = new T2.Group();
      g.add(new T2.Mesh(new T2.BoxGeometry(0.65, 0.42, 1.52), new T2.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.5, metalness: 0.3 })));
      const gr = new T2.Mesh(new T2.CircleGeometry(0.14, 12), new T2.MeshStandardMaterial({ color: 0x1a1a1a, side: T2.DoubleSide }));
      gr.rotation.y = Math.PI / 2;
      gr.position.set(-0.345, 0, 0);
      g.add(gr);
      return g;
    }
  }
  return null;
}

function buildCaseMesh(T: typeof THREE, w: number, h: number, d: number) {
  const grp = new T.Group();
  const geo = new T.BoxGeometry(w, h, d);
  grp.add(new T.Mesh(geo, new T.MeshStandardMaterial({ color: 0xe8e2d6, transparent: true, opacity: 0.12, roughness: 0.9 })));
  grp.add(new T.LineSegments(new T.EdgesGeometry(geo, 1), new T.LineBasicMaterial({ color: 0x6e1423, transparent: true, opacity: 0.45 })));
  const glass = new T.Mesh(new T.PlaneGeometry(d, h), new T.MeshStandardMaterial({ color: 0xede8e0, transparent: true, opacity: 0.025, side: T.DoubleSide }));
  glass.rotation.y = -Math.PI / 2;
  glass.position.x = w / 2 + 0.005;
  grp.add(glass);
  return grp;
}

// Static (non-interactive), slowly auto-rotating 3D preview of a saved build's case + parts.
// Ported from gomp-case3d.js. Deliberately lighter than the Build page's live configurator:
// no camera fly-in, no OrbitControls, no sparkle FX — just case + component meshes, rotating.
export default function Case3DViewer({ config }: { config: Config | null }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !config) return;

    const compDb = config.compDb || {};
    const selections = config.selections || {};
    const selected = config.selected || {};
    const caseList = (compDb.case || []) as CompDbEntry[];
    const caseComp = caseList.find((c) => c.name === selections.case) || caseList[0];
    if (!selected.case && !caseComp) return;

    const size = getCaseSize(caseComp);
    const W = container.clientWidth || 320;
    const H = container.clientHeight || 320;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:block;';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    const camDir = new THREE.Vector3(4.2, 2.2, 5.2).normalize();
    const lookAt = new THREE.Vector3(0, 0.2, 0);

    scene.add(new THREE.AmbientLight(0xf5ecd8, 1.9));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(5, 10, 5);
    scene.add(sun);

    const group = new THREE.Group();
    group.add(buildCaseMesh(THREE, size.w, size.h, size.d));

    const sx = size.w / 2.0;
    const sy = size.h / 4.5;
    const sz = size.d / 2.0;
    Object.keys(BASE_POS).forEach((id) => {
      if (!selected[id]) return;
      const mesh = buildComponentMesh(THREE, id);
      if (!mesh) return;
      const base = BASE_POS[id];
      mesh.position.set(base[0] * sx, base[1] * sy, base[2] * sz);
      group.add(mesh);
    });
    scene.add(group);

    function frameCamera() {
      if (!container) return;
      const w = container.clientWidth || W;
      const h = container.clientHeight || H;
      const aspect = w / h;
      camera.aspect = aspect;
      const vFov = (camera.fov * Math.PI) / 180;
      const halfW = size.w / 2 + 0.3;
      const halfH = size.h / 2 + 0.3;
      const distV = halfH / Math.tan(vFov / 2);
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
      const distH = halfW / Math.tan(hFov / 2);
      const dist = Math.max(distV, distH, 1.5);
      camera.position.copy(camDir).multiplyScalar(dist).add(lookAt);
      camera.lookAt(lookAt);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    frameCamera();

    let running = true;
    const clock = new THREE.Clock();
    function tick() {
      if (!running) return;
      requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);
      group.rotation.y += dt * 0.35;
      renderer.render(scene, camera);
    }
    tick();

    window.addEventListener('resize', frameCamera);

    return () => {
      running = false;
      window.removeEventListener('resize', frameCamera);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [config]);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }} />;
}
