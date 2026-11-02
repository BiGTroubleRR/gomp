// PROTOTYPE (lab). Part designs for the v2 scene, in the homepage model's design language (translucent
// dark-green shell with green edges, gold-ringed fans with a green glow ring, glowing RAM / GPU strips, AIO
// pump ring + tubes, fin-stack air tower with heatpipes). Unlike the production meshes these are built
// directly at their real-mm size from the layout (no "scale a placeholder to the quoted size" step).
// Every builder returns { group, anchor }: `group`'s children are in a local frame centred on `anchor`
// (a world position from computeLayout), so the scene can fly a part in by moving only its group.
import * as THREE from 'three';
import { box, COL, fan, glow, mat } from '@/lib/pc3d';
import { mmToUnits } from '@/lib/build-scene';
import type { FanMountPosition } from '@/lib/component-db-seed';
import { fanTransform, type CaseSize, type Layout, type V3 } from './layout';

export type Part = { group: THREE.Group; anchor: V3 };

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const at = (o: THREE.Object3D, p: V3) => {
  o.position.set(p[0], p[1], p[2]);
  return o;
};
const put = (parent: THREE.Object3D, o: THREE.Object3D, p: V3) => {
  parent.add(at(o, p));
  return o;
};

// ---- case shell: translucent panels + green edges + glass side + inner glow + feet -------------------
export function buildShell(c: CaseSize): THREE.Group {
  const { w, h, d } = c;
  const g = new THREE.Group();
  const panel = () => new THREE.MeshStandardMaterial({ color: 0x18201c, roughness: 0.72, metalness: 0.18, side: THREE.DoubleSide, transparent: true, opacity: 0.62, depthWrite: false });
  const plane = (a: number, b: number) => new THREE.Mesh(new THREE.PlaneGeometry(a, b), panel());
  const back = plane(d, h);
  back.rotation.y = Math.PI / 2;
  back.position.x = -w / 2;
  const top = plane(w, d);
  top.rotation.x = Math.PI / 2;
  top.position.y = h / 2;
  const bot = plane(w, d);
  bot.rotation.x = -Math.PI / 2;
  bot.position.y = -h / 2;
  const front = plane(w, h);
  front.rotation.y = Math.PI;
  front.position.z = -d / 2;
  const rear = plane(w, h);
  rear.position.z = d / 2;
  g.add(back, top, bot, front, rear);
  g.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), new THREE.LineBasicMaterial({ color: COL.green, transparent: true, opacity: 0.75 })));
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(d, h),
    new THREE.MeshStandardMaterial({ color: 0xc9dee2, transparent: true, opacity: 0.08, roughness: 0.06, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false }),
  );
  glass.rotation.y = -Math.PI / 2;
  glass.position.x = w / 2 + 0.006;
  g.add(glass);
  g.userData.glass = glass;
  const feet = new THREE.Group();
  feet.userData.caseFeet = true;
  ([[-1, -1], [-1, 1], [1, -1], [1, 1]] as const).forEach(([a, b]) => {
    const f = box(0.28, 0.08, 0.28, mat(0x111614));
    f.position.set(a * (w / 2 - 0.2), -h / 2 - 0.04, b * (d / 2 - 0.3));
    feet.add(f);
  });
  g.add(feet);
  const inner = new THREE.PointLight(COL.green, 3, 5);
  g.add(inner);
  return g;
}

// ---- case fans (front / top / rear / bottom / side mounts) -------------------------------------------
export function buildFanMounts(config: Partial<Record<FanMountPosition, { count: number; sizeMm: number }>>, c: CaseSize, sideCenterZ?: number): THREE.Group {
  const g = new THREE.Group();
  g.userData.caseFans = true;
  (Object.keys(config) as FanMountPosition[]).forEach((position) => {
    const cfg = config[position];
    if (!cfg || cfg.count <= 0) return;
    for (let i = 0; i < cfg.count; i++) {
      const f = fan(mmToUnits(cfg.sizeMm) / 2);
      const { pos, rot } = fanTransform(position, i, cfg.count, c, cfg.sizeMm, position === 'side' ? sideCenterZ : undefined);
      f.position.set(...pos);
      f.rotation.set(...rot);
      g.add(f);
    }
  });
  return g;
}

// ---- motherboard: PCB, I/O shield, VRM blocks, chipset, PCIe slot, DIMM slots ------------------------
export function buildMobo(L: Layout): Part {
  const { dims, pos, slotZ } = L.mobo;
  const g = new THREE.Group();
  g.add(box(dims.x, dims.y, dims.z, mat(0x1b4d2e, { roughness: 0.7, metalness: 0.2 })));
  // rear I/O shield (top-rear corner of the board)
  put(g, box(0.08, Math.min(0.9, dims.y * 0.3), 0.3, mat(0x8a8a90, { metalness: 0.85, roughness: 0.3 })), [0.06, dims.y / 2 - Math.min(0.9, dims.y * 0.3) / 2 - 0.05, dims.z / 2 - 0.15]);
  // VRM heatsinks around the socket
  const sockY = L.cpu.pos[1] - pos[1];
  const sockZ = L.cpu.pos[2] - pos[2];
  put(g, box(0.1, 0.5, 0.18, mat(0x20262a, { metalness: 0.7, roughness: 0.4 })), [0.07, Math.min(sockY + 0.5, dims.y / 2 - 0.3), sockZ]);
  put(g, box(0.1, 0.18, 0.5, mat(0x20262a, { metalness: 0.7, roughness: 0.4 })), [0.07, sockY, Math.min(sockZ + 0.5, dims.z / 2 - 0.3)]);
  // chipset block
  put(g, box(0.08, 0.34, 0.34, mat(0x2a2f33, { metalness: 0.6, roughness: 0.4 })), [0.07, -dims.y * 0.28, dims.z * 0.18]);
  // PCIe slot (the lower, long one the GPU plugs into)
  put(g, box(0.06, 0.06, mmToUnits(90), mat(0x22223a)), [0.05, L.gpu.vertical ? -dims.y * 0.2 : L.gpu.pos[1] - pos[1] - L.gpu.dims.y / 2 - 0.02, dims.z / 2 - 0.2 - mmToUnits(45)]);
  // DIMM slots (one per slot; filled ones are covered by the RAM part)
  slotZ.forEach((z) => {
    put(g, box(0.05, mmToUnits(133), 0.05, mat(0x1a1a22)), [0.04, L.ram.pos[0][1] - pos[1], z - pos[2]]);
  });
  return { group: g, anchor: pos };
}

// ---- CPU ----------------------------------------------------------------------------------------------
export function buildCpu(L: Layout): Part {
  const { dims, pos } = L.cpu;
  const g = new THREE.Group();
  g.add(box(dims.x, dims.y, dims.z, mat(0xb7b2a6, { metalness: 0.9, roughness: 0.25 })));
  put(g, box(0.02, dims.y * 0.8, dims.z * 0.8, mat(0x6f6a5f, { metalness: 0.8, roughness: 0.4 })), [dims.x / 2, 0, 0]);
  return { group: g, anchor: pos };
}

// ---- RAM sticks (only the filled slots) ---------------------------------------------------------------
export function buildRam(L: Layout, color: number): Part {
  const { dims, pos, filled } = L.ram;
  const ps = filled.map((i) => pos[i]);
  const anchor: V3 = [ps.reduce((s, p) => s + p[0], 0) / ps.length, ps[0][1], ps.reduce((s, p) => s + p[2], 0) / ps.length];
  const g = new THREE.Group();
  ps.forEach((p) => {
    const st = box(dims.x - 0.03, dims.y, dims.z, mat(color, { metalness: 0.75, roughness: 0.28 }));
    at(st, sub([p[0] - 0.015, p[1], p[2]], anchor));
    g.add(st);
    const led = box(0.03, dims.y, dims.z, glow(COL.green, 1.6));
    at(led, sub([p[0] + dims.x / 2 - 0.015, p[1], p[2]], anchor));
    g.add(led);
  });
  return { group: g, anchor };
}

// ---- GPU: built horizontally (length Z, thickness Y, fans/ports facing -Y), rotated when vertical ------
export function gpuFansFor(name: string | undefined): 0 | 2 | 3 {
  const n = name ?? '';
  if (/waterforce|\bwb\b|water|\bhydro\b/i.test(n)) return 0;
  if (/dual|\b2x\b|\bturbo\b|\bwindforce 2/i.test(n)) return 2;
  return 3;
}

export function buildGpu(L: Layout, fanCount: 0 | 2 | 3): Part {
  const { dims, pos, vertical } = L.gpu;
  const gW = dims.x;
  const gL = vertical ? dims.y : dims.z;
  const gT = vertical ? dims.z : dims.y;
  const inner = new THREE.Group();
  put(inner, box(gW, gT - 0.03, gL, mat(0x1a1c20, { metalness: 0.72, roughness: 0.18 })), [0, -0.015, 0]);
  put(inner, box(gW, 0.03, gL, mat(0x262a30, { metalness: 0.95, roughness: 0.13 })), [0, gT / 2 - 0.015, 0]);
  put(inner, box(0.02, 0.05, gL * 0.78, glow(COL.green, 2)), [gW / 2 + 0.011, gT * 0.2, 0]);
  put(inner, box(0.021, 0.06, 0.3, glow(COL.gold, 1)), [gW / 2 + 0.012, -gT * 0.15, -gL * 0.25]);
  // I/O bracket at the rear end of the card
  put(inner, box(gW, gT * 0.9, 0.02, mat(0x888078, { metalness: 0.94, roughness: 0.2 })), [0, 0, -gL / 2 - 0.01]);
  if (fanCount) {
    const r = Math.min(0.5, gL / (2 * fanCount) - 0.04);
    for (let i = 0; i < fanCount; i++) {
      const f = fan(r);
      f.rotation.x = Math.PI / 2;
      f.position.set(0, -gT / 2 + 0.035, -gL / 2 + ((i + 0.5) * gL) / fanCount);
      inner.add(f);
    }
  } else {
    put(inner, box(gW * 0.8, 0.04, gL * 0.85, glow(COL.green, 1.2)), [0, -gT / 2 + 0.01, 0]);
  }
  if (vertical) inner.rotation.x = -Math.PI / 2;
  const g = new THREE.Group();
  g.add(inner);
  return { group: g, anchor: pos };
}

// ---- storage (M.2 stick) ------------------------------------------------------------------------------
export function buildStorage(L: Layout): Part {
  const { dims, pos } = L.storage;
  const g = new THREE.Group();
  g.add(box(dims.x, dims.y, dims.z, mat(0x10151a, { roughness: 0.5, metalness: 0.4 })));
  put(g, box(0.03, dims.y * 0.82, dims.z * 0.4, mat(0x3a3f44, { metalness: 0.8, roughness: 0.3 })), [dims.x / 2 + 0.01, 0, dims.z * 0.18]);
  put(g, box(0.02, dims.y * 0.6, dims.z * 0.14, mat(0x1f8a55, { emissive: 0x1f8a55, emissiveIntensity: 0.6, roughness: 0.5 })), [dims.x / 2 + 0.005, 0, -dims.z * 0.3]);
  return { group: g, anchor: pos };
}

// ---- PSU ----------------------------------------------------------------------------------------------
export function buildPsu(L: Layout): Part {
  const { dims, pos } = L.psu;
  const g = new THREE.Group();
  g.add(box(dims.x, dims.y, dims.z, mat(0x0d120f, { metalness: 0.3, roughness: 0.5 })));
  put(g, box(dims.x * 0.7, 0.03, dims.z * 0.55, glow(COL.gold, 0.9)), [0, dims.y / 2 - 0.005, 0]);
  const grill = new THREE.Mesh(new THREE.TorusGeometry(Math.min(dims.x, dims.z) * 0.3, 0.012, 8, 36), mat(0x2a3a31));
  grill.rotation.x = Math.PI / 2;
  grill.position.set(0, -dims.y / 2 + 0.012, 0);
  g.add(grill);
  return { group: g, anchor: pos };
}

// ---- cooler: air tower (fins + heatpipes + fan) or AIO (pump + ring + radiator + fans + tubes) --------
export function buildCooler(L: Layout, type: 'air' | 'aio', c: CaseSize): Part {
  const { anchor } = L.cooler;
  const g = new THREE.Group();
  if (type === 'air') {
    const tH = L.cooler.towerLen;
    const base = box(0.1, 0.45, 0.45, mat(0x3a3a3a, { metalness: 0.6, roughness: 0.35 }));
    base.position.x = -tH / 2 + 0.05;
    g.add(base);
    // Fins as one InstancedMesh (a tower is 20+ identical plates).
    const fins = Math.max(8, Math.round(tH * 7));
    const finMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 1.1, 0.5), mat(0x8a8a90, { metalness: 0.75, roughness: 0.3 }), fins);
    const fm = new THREE.Matrix4();
    for (let i = 0; i < fins; i++) {
      fm.makeTranslation(-tH / 2 + 0.14 + (i * (tH - 0.2)) / fins, 0, 0);
      finMesh.setMatrixAt(i, fm);
    }
    g.add(finMesh);
    const pipeM = mat(0xc4823a, { metalness: 0.85, roughness: 0.25 });
    [-0.3, -0.1, 0.1, 0.3].forEach((o) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, tH - 0.1, 10), pipeM);
      p.rotation.z = Math.PI / 2;
      p.position.set(0.05, o, 0.1);
      g.add(p);
    });
    const cap = box(0.04, 1.12, 0.52, mat(COL.gold, { metalness: 0.85, roughness: 0.25 }));
    cap.position.x = tH / 2 - 0.02;
    g.add(cap);
    const f = fan(0.52);
    f.position.set(0.1, 0, -0.33);
    g.add(f);
    return { group: g, anchor };
  }
  // AIO: pump at the anchor; radiator is case-frame, converted to this local frame
  const pumpR = L.cooler.radius;
  const pump = new THREE.Mesh(new THREE.CylinderGeometry(pumpR, pumpR, 0.16, 32), mat(0x0a0a0a, { metalness: 0.85, roughness: 0.2 }));
  pump.rotation.z = Math.PI / 2;
  g.add(pump);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(pumpR - 0.04, 0.025, 10, 40), glow(COL.green, 2.2));
  ring.rotation.y = Math.PI / 2;
  ring.position.x = 0.085;
  g.add(ring);
  const cap = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), glow(COL.gold, 0.5));
  cap.rotation.y = Math.PI / 2;
  cap.position.x = 0.087;
  g.add(cap);
  const rad = L.cooler.radiator;
  const rp = sub(rad.pos, anchor);
  const radBox = box(mmToUnits(120), 0.27, rad.length, mat(0x1c1c1c, { metalness: 0.7, roughness: 0.35 }));
  at(radBox, rp);
  g.add(radBox);
  const frontZ = rp[2] - rad.length / 2;
  for (let i = 0; i < rad.fans; i++) {
    const f = fan(0.52);
    f.rotation.x = Math.PI / 2;
    f.position.set(rp[0], rp[1] - 0.2, frontZ + ((i + 0.5) * rad.length) / rad.fans);
    g.add(f);
  }
  const tubeM = mat(0x2a2a2a, { roughness: 0.6, metalness: 0.1 });
  [-0.08, 0.08].forEach((o) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.09, o, 0.18),
      new THREE.Vector3(rp[0] - 0.1, (rp[1] * 0.55) + o, rp[2] * 0.4 + 0.3),
      new THREE.Vector3(rp[0] - 0.2, rp[1] - 0.1, rp[2] + o),
    ]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.035, 8), tubeM));
  });
  void c;
  return { group: g, anchor };
}
