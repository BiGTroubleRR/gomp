'use client';

// LAB (hidden, not linked): geometry audit of the /build 3D configurator. For every combination a customer can
// actually pick (case x board form factor x GPU x cooler x PSU x RAM x fan config, filtered with the site's own
// fitsInCase rules) it runs the real layout maths (src/lib/lab/layout.ts), turns every part into an axis-aligned
// box, and checks: parts outside the case, parts penetrating each other, fan stacks colliding, GPU I/O end, ...
// Results are grouped by rule + parts and exposed as window.__auditResult for scripted reading.
import { useEffect, useState } from 'react';
import { caseUnitsFor, dimensionSpecsFor, MM_PER_UNIT, mmToUnits, moboRamSlotCount, ramModuleCount, type DimensionSpec } from '@/lib/build-scene';
import { caseFitsFormFactor, caseHasVerticalGpuMount, fitsInCase, type Component, type ComponentDb, type FanMountPosition, type FormFactor } from '@/lib/component-db-seed';
import { computeLayout, fanTransform, DEFAULT_INPUTS, type CaseSize, type PartInputs, type V3 } from '@/lib/lab/layout';
import { fetchComponentDb } from '@/lib/supabase/components';

type Box = { part: string; group: string; lo: V3; hi: V3 };
type FanCfg = Partial<Record<FanMountPosition, { count: number; sizeMm: number }>>;

const TINY_CASE_DEPTH = 1.6; // mirrors scene-v2.ts
const FAN_T = 0.14; // rendered fan thickness (units)
const RAD_FAN_R = 0.52; // hard-coded in parts.ts buildCooler
const TOL = 0.04; // units (~4 mm) penetration tolerated everywhere
const CONTACT_TOL = 0.15; // parts that legitimately touch (board + what is mounted on it)

const mm = (u: number) => Math.round(u * MM_PER_UNIT);
const boxC = (part: string, group: string, c: V3, s: V3): Box => ({ part, group, lo: [c[0] - s[0] / 2, c[1] - s[1] / 2, c[2] - s[2] / 2], hi: [c[0] + s[0] / 2, c[1] + s[1] / 2, c[2] + s[2] / 2] });
const swapYZ = (specs: DimensionSpec[]): DimensionSpec[] => specs.map((s) => (s.axis === 'y' ? { ...s, axis: 'z' } : s.axis === 'z' ? { ...s, axis: 'y' } : s));
const canonicalGpuSpecs = (specs: DimensionSpec[]): DimensionSpec[] => {
  const length = specs.find((s) => s.annotate !== false && (s.axis === 'y' || s.axis === 'z'));
  return length?.axis === 'y' ? swapYZ(specs) : specs;
};

// Pairs that legitimately touch (plugged in / mounted on each other) get the larger tolerance.
const CONTACT = new Set(['cpu|mobo', 'mobo|ram', 'gpu|mobo', 'mobo|storage', 'cooler-body|cpu', 'cooler-body|mobo', 'cooler-tower|cpu', 'cooler-tower|mobo', 'cooler-tower|ram', 'cpu|ram']);
const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

type Hit = { rule: string; a: string; b: string; note?: string };
type Agg = { rule: string; a: string; b: string; note?: string; total: number; weight: number; byCase: Record<string, { count: number; weight: number; maxMm: number; example: string }> };

function defaultFans(c: Component, fanDb: Component[]): FanCfg {
  const out: FanCfg = {};
  (c.fanMounts || []).forEach((m) => {
    if (!m.preinstalledCount) return;
    const f = m.preinstalledFanName ? fanDb.find((x) => x.name === m.preinstalledFanName) : undefined;
    out[m.position] = { count: m.preinstalledCount, sizeMm: f?.fanSizeMm ?? m.sizesMm[0] };
  });
  return out;
}
function maxFans(c: Component): FanCfg {
  const out: FanCfg = {};
  (c.fanMounts || []).forEach((m) => {
    out[m.position] = { count: m.maxCount, sizeMm: Math.max(...m.sizesMm) };
  });
  return out;
}

function dedupe<T extends Component>(list: T[], key: (c: T) => string): { rep: T; n: number; names: string[] }[] {
  const m = new Map<string, { rep: T; n: number; names: string[] }>();
  list.forEach((c) => {
    const k = key(c);
    const e = m.get(k);
    if (e) {
      e.n++;
      e.names.push(c.name);
    } else m.set(k, { rep: c, n: 1, names: [c.name] });
  });
  return [...m.values()];
}

function analyse(caseComp: Component, mobo: Component, gpu: Component, cooler: Component, psu: Component, ram: Component, fansIn: FanCfg, fanLabel: string): Hit[] & { mmOf?: Map<string, number> } {
  const hits: (Hit & { mm: number })[] = [];
  const add = (rule: string, a: string, b: string, depthUnits: number, note?: string) => hits.push({ rule, a, b, note, mm: mm(depthUnits) });

  const size = caseUnitsFor(caseComp, caseComp.category || 'Mid Tower');
  const cs: CaseSize = { w: size.w, h: size.h, d: size.d };
  if (!(caseComp.caseWidthMm && caseComp.caseHeightMm && caseComp.caseDepthMm)) add('data', 'case', 'case', 0, 'case has no mm dimensions: category fallback size used');

  // ---- inputs exactly as scene-v2 derives them
  const rawGpu = canonicalGpuSpecs(dimensionSpecsFor('gpu', gpu, false));
  const requestedVertical = caseHasVerticalGpuMount(caseComp.name);
  const lenMm = rawGpu.find((s) => s.axis === 'z' && s.scalesMesh !== false)?.mm;
  let vertical = requestedVertical || cs.d <= TINY_CASE_DEPTH;
  if (!vertical && lenMm) {
    const len = mmToUnits(lenMm);
    vertical = !(len <= cs.d - 0.27) && len <= cs.h - 0.3;
  }
  const coolerSpecs = dimensionSpecsFor('cooler', cooler);
  const aio = cooler.coolerType ? cooler.coolerType === 'aio' : !!cooler.coolerRadiatorMm;
  const inp: PartInputs = {
    ...DEFAULT_INPUTS,
    specs: {
      mobo: dimensionSpecsFor('mobo', mobo),
      ram: dimensionSpecsFor('ram', ram),
      gpu: vertical ? swapYZ(rawGpu) : rawGpu,
      storage: dimensionSpecsFor('storage', { id: 's', name: 's', price: 0, specs: '', tier: 'B' } as Component),
      psu: dimensionSpecsFor('psu', psu),
      cooler: coolerSpecs,
    },
    cooler: { type: aio ? 'aio' : 'air', radiatorMm: cooler.coolerRadiatorMm ?? DEFAULT_INPUTS.cooler.radiatorMm, heightMm: coolerSpecs.find((s) => s.axis === 'x')?.mm ?? cooler.coolerHeightMm ?? DEFAULT_INPUTS.cooler.heightMm },
    ram: { sticks: ramModuleCount(ram), slots: moboRamSlotCount(mobo) },
    gpuVertical: vertical,
  };
  const L = computeLayout(cs, inp);
  // same as scene-v2 rebuildFans: an AIO radiator replaces the case fans on the face it is mounted to
  const fans: FanCfg = { ...fansIn };
  if (aio) delete fans[L.cooler.radiator.mount];
  void fanLabel;

  // ---- boxes (case frame, units)
  const boxes: Box[] = [];
  boxes.push(boxC('mobo', 'mobo', L.mobo.pos, [L.mobo.dims.x, L.mobo.dims.y, L.mobo.dims.z]));
  boxes.push(boxC('cpu', 'cpu', L.cpu.pos, [L.cpu.dims.x, L.cpu.dims.y, L.cpu.dims.z]));
  L.ram.filled.forEach((i) => boxes.push(boxC('ram', `ram${i}`, L.ram.pos[i], [L.ram.dims.x, L.ram.dims.y, L.ram.dims.z])));
  boxes.push(boxC('gpu', 'gpu', L.gpu.pos, [L.gpu.dims.x, L.gpu.dims.y, L.gpu.dims.z]));
  boxes.push(boxC('storage', 'storage', L.storage.pos, [L.storage.dims.x, L.storage.dims.y, L.storage.dims.z]));
  boxes.push(boxC('psu', 'psu', L.psu.pos, [L.psu.dims.x, L.psu.dims.y, L.psu.dims.z]));
  const A = L.cooler.anchor;
  if (!aio) {
    boxes.push(boxC('cooler-tower', 'tower', A, [L.cooler.towerLen, 1.1, 0.5]));
    boxes.push(boxC('cooler-fan', 'towerfan', [A[0] + 0.1, A[1], A[2] - 0.33], [2 * 0.52, 2 * 0.52, FAN_T]));
  } else {
    boxes.push(boxC('cooler-body', 'pump', A, [0.17, 0.48, 0.48]));
    const r = L.cooler.radiator;
    const radW = mmToUnits(120) * 0.94;
    const front = r.mount === 'front';
    boxes.push(boxC('radiator', 'rad', r.pos, front ? [radW, r.length, r.thickness] : [radW, r.thickness, r.length]));
    for (let i = 0; i < r.fans; i++) {
      const along = -r.length / 2 + ((i + 0.5) * r.length) / r.fans;
      boxes.push(
        front
          ? boxC('radiator-fan', `radfan${i}`, [r.pos[0], r.pos[1] + along, r.pos[2] + r.thickness / 2 + 0.07], [2 * RAD_FAN_R, 2 * RAD_FAN_R, FAN_T])
          : boxC('radiator-fan', `radfan${i}`, [r.pos[0], r.pos[1] - r.thickness / 2 - 0.07, r.pos[2] + along], [2 * RAD_FAN_R, FAN_T, 2 * RAD_FAN_R]),
      );
    }
  }
  // GPU I/O bracket: parts.ts puts it at local -z end (flat) / bottom end (vertical)
  {
    const d = L.gpu.dims;
    if (!L.gpu.vertical) {
      boxes.push(boxC('gpu-io', 'gpuio', [L.gpu.pos[0], L.gpu.pos[1], L.gpu.pos[2] + d.z / 2 + 0.01], [d.x, d.y * 0.9, 0.02]));
      const gap = cs.d / 2 - (L.gpu.pos[2] + d.z / 2 + 0.01);
      if (gap > 0.3) add('gpu-io', 'gpu-io', 'case-rear', gap - 0.3, `I/O bracket is ${mm(gap)} mm from the rear wall`);
    } else {
      boxes.push(boxC('gpu-io', 'gpuio', [L.gpu.pos[0], L.gpu.pos[1] - d.y / 2 - 0.01, L.gpu.pos[2]], [d.x, 0.02, d.z * 0.9]));
    }
  }
  // case fans
  const caseFanBoxes: Box[] = [];
  (Object.keys(fans) as FanMountPosition[]).forEach((pos) => {
    const cfg = fans[pos];
    if (!cfg || cfg.count <= 0) return;
    const D = mmToUnits(cfg.sizeMm);
    const span = pos === 'front' || pos === 'rear' || pos === 'side' ? cs.h : cs.d;
    if (cfg.count * D > span) add('data-fans', `case-fans:${pos}`, `case-fans:${pos}`, cfg.count * D - span, `${cfg.count}x${cfg.sizeMm}mm fans need ${mm(cfg.count * D)} mm of a ${mm(span)} mm panel (drawn smaller)`);
    for (let i = 0; i < cfg.count; i++) {
      const { pos: p, diameter } = fanTransform(pos, i, cfg.count, cs, cfg.sizeMm, pos === 'side' ? L.sideFanRange : undefined);
      if (diameter <= 0) continue;
      const s: V3 = pos === 'front' || pos === 'rear' ? [diameter, diameter, FAN_T] : pos === 'top' || pos === 'bottom' ? [diameter, FAN_T, diameter] : [FAN_T, diameter, diameter];
      const b = boxC(`case-fans:${pos}`, `cf-${pos}-${i}`, p, s);
      caseFanBoxes.push(b);
      boxes.push(b);
    }
  });

  // ---- R1 containment (parts that must be inside the shell; outside-mounted case fans excluded except side fans)
  const lo: V3 = [-cs.w / 2, -cs.h / 2, -cs.d / 2];
  const hi: V3 = [cs.w / 2, cs.h / 2, cs.d / 2];
  const axisName = ['width (toward glass/tray)', 'height', 'depth'];
  boxes.forEach((b) => {
    if (b.part.startsWith('case-fans:') && b.part !== 'case-fans:side') return;
    for (let k = 0; k < 3; k++) {
      const over = Math.max(lo[k] - b.lo[k], b.hi[k] - hi[k]);
      if (over > TOL) add('outside', b.part, 'case', over, `exceeds the case interior in ${axisName[k]}`);
    }
  });
  // ---- R2 penetration between solid parts
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (a.part === b.part && !a.part.startsWith('case-fans:')) continue;
      let minDepth = Infinity;
      for (let k = 0; k < 3; k++) minDepth = Math.min(minDepth, Math.min(a.hi[k], b.hi[k]) - Math.max(a.lo[k], b.lo[k]));
      const tol = CONTACT.has(pairKey(a.part, b.part)) ? CONTACT_TOL : TOL;
      if (minDepth > tol) add('overlap', a.part, b.part, minDepth);
    }
  }
  return hits as never;
}

export default function AuditPage() {
  const [status, setStatus] = useState('loading catalogue…');
  const [rows, setRows] = useState<Agg[]>([]);
  const [meta, setMeta] = useState<Record<string, number | string>>({});

  useEffect(() => {
    let dead = false;
    (async () => {
      const db: ComponentDb = await fetchComponentDb({ force: true });
      const live = (c: Component) => c.isLive !== false;
      const cases = db.case.filter(live);
      const gpus = dedupe(db.gpu.filter(live), (c) => `${c.gpuLengthMm}|${c.gpuSlotWidth}|${c.gpuWidthMm}`);
      const coolers = dedupe(db.cooler.filter(live), (c) => `${c.coolerType}|${c.coolerRadiatorMm}|${c.coolerHeightMm}`);
      const psus = dedupe(db.psu.filter(live), (c) => `${c.psuLengthMm}`);
      const rams = dedupe(db.ram.filter(live), (c) => `${ramModuleCount(c)}|${c.ramHeightMm}`);
      const moboFF = dedupe(db.mobo.filter(live), (c) => `${c.formFactor}`);
      const agg = new Map<string, Agg>();
      let combos = 0;
      let worked = 0;
      const total = cases.length;
      for (const cs of cases) {
        for (const ff of moboFF) {
          if (!caseFitsFormFactor(cs.category, ff.rep.formFactor as FormFactor)) continue;
          for (const g of gpus) {
            if (!fitsInCase('gpu', g.rep, cs)) continue;
            for (const co of coolers) {
              if (!fitsInCase('cooler', co.rep, cs)) continue;
              for (const p of psus) {
                if (!fitsInCase('psu', p.rep, cs)) continue;
                for (const r of rams) {
                  for (const [fanLabel, fans] of [['default fans', defaultFans(cs, db.fan)], ['max fans', maxFans(cs)]] as [string, FanCfg][]) {
                    combos++;
                    const weight = ff.n * g.n * co.n * p.n * r.n;
                    const hits = analyse(cs, ff.rep, g.rep, co.rep, p.rep, r.rep, fans, fanLabel) as unknown as (Hit & { mm: number })[];
                    const seen = new Set<string>();
                    hits.forEach((h) => {
                      const sig = h.rule === 'outside' ? `${h.rule}|${h.a}|${h.note}` : `${h.rule}|${h.a}|${h.b}`;
                      if (seen.has(sig + cs.name)) return;
                      seen.add(sig + cs.name);
                      let e = agg.get(sig);
                      if (!e) agg.set(sig, (e = { rule: h.rule, a: h.a, b: h.b, note: h.note, total: 0, weight: 0, byCase: {} }));
                      e.total++;
                      e.weight += weight;
                      const bc = (e.byCase[cs.name] ||= { count: 0, weight: 0, maxMm: 0, example: '' });
                      bc.count++;
                      bc.weight += weight;
                      if (h.mm >= bc.maxMm) {
                        bc.maxMm = h.mm;
                        bc.example = `${ff.rep.formFactor} · ${g.names[0]}${g.n > 1 ? ` (+${g.n - 1} same size)` : ''} · ${co.names[0]}${co.n > 1 ? ` (+${co.n - 1})` : ''} · ${p.names[0]} · ${r.rep.name.slice(0, 28)} · ${fanLabel}`;
                      }
                    });
                  }
                  if (combos - worked > 1500) {
                    worked = combos;
                    if (dead) return;
                    setStatus(`running… ${combos.toLocaleString()} layouts`);
                    await new Promise((res) => setTimeout(res, 0));
                  }
                }
              }
            }
          }
        }
      }
      const out = [...agg.values()].sort((a, b) => b.weight - a.weight);
      const m = { cases: total, gpuShapes: gpus.length, coolerShapes: coolers.length, psuShapes: psus.length, ramShapes: rams.length, formFactors: moboFF.length, layouts: combos };
      (window as unknown as Record<string, unknown>).__auditResult = { meta: m, rows: out };
      if (!dead) {
        setRows(out);
        setMeta(m);
        setStatus('done');
      }
    })().catch((e) => setStatus(`error: ${e instanceof Error ? e.message : String(e)}`));
    return () => {
      dead = true;
    };
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: 'var(--font-sans)', color: '#EBE6DA', background: '#0A0F0D', minHeight: '100vh', fontSize: 13 }}>
      <h1 style={{ fontSize: 20, margin: '0 0 6px' }}>3D configurator audit (lab)</h1>
      <div style={{ opacity: 0.7, marginBottom: 12 }}>{status} · {Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join(' · ')}</div>
      {rows.map((r) => (
        <div key={`${r.rule}|${r.a}|${r.b}|${r.note}`} style={{ borderTop: '1px solid #223', padding: '8px 0' }}>
          <b>[{r.rule}] {r.a} × {r.b}</b> — {r.total} layouts, ~{r.weight} selectable builds{r.note ? ` — ${r.note}` : ''}
          {Object.entries(r.byCase).map(([c, v]) => (
            <div key={c} style={{ opacity: 0.75, marginLeft: 14 }}>{c}: {v.count} · max {v.maxMm} mm · {v.example}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
