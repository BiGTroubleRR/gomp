'use client';

// PROTOTYPE (lab): hidden test page for the v2 configurator scene (src/lib/lab/*). It drives the production
// scene (createBuildScene) and the v2 scene (createBuildSceneV2) with IDENTICAL calls, side by side, so the
// two can be compared part by part. Nothing here is linked from the site and /build is untouched.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  caseUnitsFor,
  createBuildScene,
  dimensionSpecsFor,
  ramModuleCount,
  moboRamSlotCount,
  SLOTS,
  type BuildScene,
  type CompId,
} from '@/lib/build-scene';
import { createBuildSceneV2, type BuildSceneV2 } from '@/lib/lab/scene-v2';
import { caseHasVerticalGpuMount, fitProblem } from '@/lib/lab/fit';
import { fetchComponentDb } from '@/lib/supabase/components';
import type { Component, FanMountPosition } from '@/lib/component-db-seed';
import { ACCENT, BORDER, GOLD, INK, MUTED, PAGE_BG, PANEL_BG, SURFACE_ALT } from '@/lib/design-tokens';

// The methods both scenes share (compile-time proof of API parity for the core set).
type CoreApi = Pick<
  BuildScene,
  | 'toggleComponent'
  | 'updateCase'
  | 'toggleGlass'
  | 'pickComponentAt'
  | 'setHoverOutline'
  | 'setSizeScale'
  | 'setGpuOrientation'
  | 'setRamModules'
  | 'setMoboRamSlots'
  | 'setComponentDimensions'
  | 'setDimensionsVisible'
  | 'setFans'
  | 'applyBuildSnapshot'
  | 'setMotion'
  | 'setCanVisible'
  | 'triggerCompletion'
  | 'getCaseSizeFor'
  | 'dispose'
>;

const LABEL: Record<CompId, string> = { mobo: 'Motherboard', cpu: 'CPU', cooler: 'Cooler', ram: 'RAM', gpu: 'GPU', storage: 'Storage', psu: 'PSU', case: 'Case' };
const FAN_POSITIONS: FanMountPosition[] = ['front', 'top', 'rear', 'bottom', 'side'];
type View = 'split' | 'new' | 'old';
type FanCfg = Record<FanMountPosition, { count: number; sizeMm: number }>;
const NO_FANS: FanCfg = { front: { count: 0, sizeMm: 120 }, top: { count: 0, sizeMm: 120 }, rear: { count: 0, sizeMm: 120 }, bottom: { count: 0, sizeMm: 120 }, side: { count: 0, sizeMm: 120 } };

const panel = { background: PANEL_BG, border: `1px solid ${BORDER}`, borderRadius: 4, padding: 14 } as const;
const btn = { background: SURFACE_ALT, color: INK, border: `1px solid ${BORDER}`, borderRadius: 3, padding: '7px 12px', cursor: 'pointer', fontSize: 12 } as const;

export default function Lab3D() {
  const [db, setDb] = useState<Partial<Record<CompId, Component[]>> | null>(null);
  const [sel, setSel] = useState<Partial<Record<CompId, string>>>({});
  const [installed, setInstalled] = useState<Partial<Record<CompId, boolean>>>({});
  const [glassHidden, setGlassHidden] = useState(false);
  const [dims, setDims] = useState(true);
  const [vertical, setVertical] = useState(false); // "force vertical" — beyond what the case/size rules already decide
  const [can, setCan] = useState(false);
  const [motion, setMotion] = useState(true);
  const [gpuMount, setGpuMount] = useState<boolean | null>(null);
  const [fans, setFans] = useState<FanCfg>(NO_FANS);
  const [view, setView] = useState<View>('split');
  const [hover, setHover] = useState<{ id: CompId; x: number; y: number; which: string } | null>(null);
  const [calls, setCalls] = useState<{ calls: number; triangles: number } | null>(null);
  const [report, setReport] = useState<string[]>([]);

  const oldRef = useRef<HTMLDivElement>(null);
  const newRef = useRef<HTMLDivElement>(null);
  const oldScene = useRef<BuildScene | null>(null);
  const newScene = useRef<BuildSceneV2 | null>(null);
  const state = useRef({ db, sel, installed, glassHidden, dims, vertical, fans });
  useEffect(() => {
    state.current = { db, sel, installed, glassHidden, dims, vertical, fans };
  });

  useEffect(() => {
    fetchComponentDb().then((d) => {
      const live: Partial<Record<CompId, Component[]>> = {};
      SLOTS.forEach((id) => (live[id] = (d[id] ?? []).filter((c) => c.isLive !== false)));
      setDb(live);
      const first: Partial<Record<CompId, string>> = {};
      SLOTS.forEach((id) => {
        if (live[id]?.[0]) first[id] = live[id]![0].name;
      });
      setSel(first);
    });
  }, []);

  const comp = useCallback((id: CompId) => state.current.db?.[id]?.find((c) => c.name === state.current.sel[id]), []);

  // Push one slot's current selection (size / variant) into a scene, exactly like /build does on change.
  const applySelection = useCallback(
    (scene: CoreApi, id: CompId, override?: Component) => {
      const c = override ?? comp(id);
      if (!c) return;
      if (id === 'case') {
        const size = caseUnitsFor(c, c.category || 'Mid Tower');
        scene.updateCase(size.w, size.h, size.d);
      }
      scene.setSizeScale(id, dimensionSpecsFor(id, c, state.current.vertical), c);
      if (id === 'ram') scene.setRamModules(ramModuleCount(c));
      if (id === 'mobo') scene.setMoboRamSlots(moboRamSlotCount(c));
    },
    [comp],
  );

  const scenes = useCallback(() => [oldScene.current, newScene.current].filter(Boolean) as CoreApi[], []);

  // ---- mount / unmount scenes with the view switch ----
  useEffect(() => {
    if (!db) return;
    const s = state.current;
    const full = (scene: CoreApi) => {
      scene.toggleGlass(s.glassHidden);
      scene.setDimensionsVisible(s.dims);
      scene.setFans(s.fans);
      scene.setGpuOrientation(s.vertical);
      scene.applyBuildSnapshot(db, s.installed, s.sel);
    };
    if ((view === 'old' || view === 'split') && oldRef.current) {
      oldScene.current = createBuildScene(oldRef.current as HTMLDivElement);
      full(oldScene.current);
    }
    if ((view === 'new' || view === 'split') && newRef.current) {
      newScene.current = createBuildSceneV2(newRef.current as HTMLDivElement);
      full(newScene.current);
    }
    return () => {
      oldScene.current?.dispose();
      newScene.current?.dispose();
      oldScene.current = null;
      newScene.current = null;
    };
  }, [db, view]);

  useEffect(() => {
    const t = setInterval(() => {
      const sc = newScene.current;
      if (!sc) return;
      setCalls(sc.info());
      setGpuMount(sc.getGpuVertical());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // ---- handlers ----
  // Like /build: the case drives GPU orientation (riser cases), and the 3D scene adds its own rule for tiny
  // cases / cards too long to lie flat (see effectiveGpuVertical in scene-v2.ts).
  function orient(caseC: Component | undefined, force: boolean) {
    scenes().forEach((s) => s.setGpuOrientation(force || caseHasVerticalGpuMount(caseC?.name)));
  }
  // Picking a new case re-checks every part that has to physically fit it (GPU length, cooler, PSU, board):
  // a part that no longer fits is swapped for the first one that does.
  function choose(id: CompId, name: string) {
    const list = (cid: CompId) => db?.[cid] ?? [];
    const nextSel = { ...sel, [id]: name };
    const changed: [CompId, Component][] = [];
    const pickedCase = id === 'case' ? list('case').find((c) => c.name === name) : list('case').find((c) => c.name === sel.case);
    const picked = list(id).find((c) => c.name === name);
    if (picked) changed.push([id, picked]);
    if (id === 'case' && pickedCase) {
      (['mobo', 'gpu', 'cooler', 'psu'] as const).forEach((fid) => {
        const cur = list(fid).find((c) => c.name === sel[fid]);
        if (cur && fitProblem(fid, cur, pickedCase) === null) return;
        const alt = list(fid).find((c) => fitProblem(fid, c, pickedCase) === null);
        if (alt) {
          nextSel[fid] = alt.name;
          changed.push([fid, alt]);
        }
      });
    }
    setSel(nextSel);
    scenes().forEach((s) => {
      changed.forEach(([cid, c]) => applySelection(s, cid, c));
    });
    orient(pickedCase, vertical);
  }
  function install(id: CompId, on: boolean, delay = 0) {
    setInstalled((p) => ({ ...p, [id]: on }));
    scenes().forEach((s) => s.toggleComponent(id, on, delay));
  }
  function installAll(on: boolean) {
    const order: CompId[] = ['case', 'mobo', 'cpu', 'cooler', 'ram', 'gpu', 'storage', 'psu'];
    order.forEach((id, i) => install(id, on, i * 160));
  }
  function setFan(pos: FanMountPosition, patch: Partial<{ count: number; sizeMm: number }>) {
    const next = { ...fans, [pos]: { ...fans[pos], ...patch } };
    setFans(next);
    scenes().forEach((s) => s.setFans(next));
  }
  function onMove(e: React.PointerEvent, which: 'old' | 'new') {
    const scene = which === 'old' ? oldScene.current : newScene.current;
    if (!scene) return;
    const id = scene.pickComponentAt(e.clientX, e.clientY);
    scene.setHoverOutline(id);
    setHover(id ? { id, x: e.clientX, y: e.clientY, which } : null);
  }

  // ---- sizing parity: v2 mesh extents vs the catalog mm that dimensionSpecsFor quotes ----
  function runSizing() {
    const s = newScene.current;
    if (!s) return setReport(['Switch to a view that includes the New scene first.']);
    const lines: string[] = [];
    SLOTS.forEach((id) => {
      const c = comp(id);
      if (!c || !installed[id]) return;
      const m = s.measure(id);
      if (!m) return;
      dimensionSpecsFor(id, c, s.getGpuVertical())
        .filter((sp) => sp.scalesMesh !== false)
        .forEach((sp) => {
          const got = m[sp.axis];
          const err = ((got - sp.mm) / sp.mm) * 100;
          lines.push(`${Math.abs(err) <= 5 ? '✓' : '✗'} ${LABEL[id]} · ${sp.axis.toUpperCase()}: want ${sp.mm.toFixed(0)} mm, mesh ${got.toFixed(0)} mm (${err >= 0 ? '+' : ''}${err.toFixed(1)}%) — ${c.name}`);
        });
    });
    setReport(lines.length ? lines : ['Install some parts first.']);
  }

  const hoverComp = hover ? db?.[hover.id]?.find((c) => c.name === sel[hover.id]) : undefined;
  const api = useMemo(
    () => [
      ['toggleComponent (fly-in / out)', true], ['updateCase', true], ['toggleGlass', true], ['pickComponentAt', true], ['setHoverOutline', true],
      ['setSizeScale (real mm, air/AIO swap)', true], ['setGpuOrientation', true], ['setRamModules', true], ['setMoboRamSlots', true],
      ['setComponentDimensions', true], ['setDimensionsVisible', true], ['setFans', true], ['applyBuildSnapshot', true], ['setMotion', true],
      ['triggerCompletion', true], ['setCanVisible', true], ['applyAlignmentTuning (as offsets)', true],
    ] as [string, boolean][],
    [],
  );

  return (
    <div style={{ background: PAGE_BG, color: INK, minHeight: '100vh', padding: 16, fontFamily: 'var(--font-sans)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 12 }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 22, color: GOLD }}>Lab · 3D configurator v2</h1>
        <span style={{ fontSize: 12, color: MUTED }}>Same API, homepage-model designs. Left = production scene, right = v2. v2 is the default on /build (?scene=v1 = old scene).</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '330px 1fr', gap: 14, alignItems: 'start' }}>
        {/* ---------------- controls ---------------- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={panel}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {(['split', 'new', 'old'] as View[]).map((v) => (
                <button key={v} onClick={() => setView(v)} style={{ ...btn, borderColor: view === v ? ACCENT : BORDER, color: view === v ? ACCENT : INK }}>
                  {v === 'split' ? 'Split' : v === 'new' ? 'New only' : 'Old only'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button style={btn} onClick={() => installAll(true)}>Install all</button>
              <button style={btn} onClick={() => installAll(false)}>Remove all</button>
              <button style={btn} onClick={runSizing}>Check sizes (mm)</button>
              <button style={btn} onClick={() => scenes().forEach((s) => s.triggerCompletion())}>Completion</button>
              <button style={{ ...btn, borderColor: can ? ACCENT : BORDER }} onClick={() => { setCan(!can); scenes().forEach((s) => s.setCanVisible(!can)); }}>Can for scale</button>
              <button style={{ ...btn, borderColor: motion ? BORDER : ACCENT }} onClick={() => { setMotion(!motion); scenes().forEach((s) => s.setMotion(!motion)); }}>{motion ? 'Motion on' : 'Motion off'}</button>
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, fontSize: 12 }}>
              <label><input type="checkbox" checked={glassHidden} onChange={(e) => { setGlassHidden(e.target.checked); scenes().forEach((s) => s.toggleGlass(e.target.checked)); }} /> Hide glass</label>
              <label><input type="checkbox" checked={dims} onChange={(e) => { setDims(e.target.checked); scenes().forEach((s) => s.setDimensionsVisible(e.target.checked)); }} /> Dimensions</label>
              <label title="Riser cases and tiny cases already go vertical on their own; this forces it for any case"><input type="checkbox" checked={vertical} onChange={(e) => { setVertical(e.target.checked); orient(db?.case?.find((c) => c.name === sel.case), e.target.checked); }} /> Force vertical GPU</label>
            </div>
          </div>

          <div style={panel}>
            {!db && <div style={{ color: MUTED, fontSize: 12 }}>Loading catalog…</div>}
            {db &&
              SLOTS.map((id) => (
                <div key={id} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <input type="checkbox" checked={!!installed[id]} onChange={(e) => install(id, e.target.checked)} aria-label={`install ${LABEL[id]}`} />
                  <select value={sel[id] ?? ''} onChange={(e) => choose(id, e.target.value)} style={{ background: SURFACE_ALT, color: INK, border: `1px solid ${BORDER}`, padding: 5, fontSize: 12, minWidth: 0 }}>
                    {(db[id] ?? []).map((c) => {
                      const caseC = db.case?.find((x) => x.name === sel.case);
                      const problem = id === 'case' ? null : fitProblem(id, c, caseC);
                      return (
                        <option key={c.id} value={c.name} disabled={!!problem}>{problem ? '✗ ' : ''}{LABEL[id]}: {c.name}{problem ? ` — ${problem}` : ''}</option>
                      );
                    })}
                  </select>
                </div>
              ))}
          </div>

          <div style={panel}>
            <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: MUTED, marginBottom: 8 }}>Case fans</div>
            {FAN_POSITIONS.map((pos) => (
              <div key={pos} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr', gap: 8, alignItems: 'center', marginBottom: 6, fontSize: 12 }}>
                <span>{pos}</span>
                <select value={fans[pos].count} onChange={(e) => setFan(pos, { count: Number(e.target.value) })} style={{ background: SURFACE_ALT, color: INK, border: `1px solid ${BORDER}`, padding: 4 }}>
                  {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n} fan{n === 1 ? '' : 's'}</option>)}
                </select>
                <select value={fans[pos].sizeMm} onChange={(e) => setFan(pos, { sizeMm: Number(e.target.value) })} style={{ background: SURFACE_ALT, color: INK, border: `1px solid ${BORDER}`, padding: 4 }}>
                  {[120, 140].map((n) => <option key={n} value={n}>{n} mm</option>)}
                </select>
              </div>
            ))}
          </div>

          <div style={panel}>
            <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: MUTED, marginBottom: 8 }}>API parity</div>
            {api.map(([name, ok]) => (
              <div key={name} style={{ fontSize: 12, color: ok ? INK : MUTED }}>{ok ? '✓' : '–'} {name}{ok ? '' : ' (deferred, stubbed)'}</div>
            ))}
            <div style={{ marginTop: 10, fontSize: 12, color: MUTED }}>
              GPU mount (new scene): {gpuMount == null ? '—' : gpuMount ? 'vertical' : 'horizontal'}<br />
              New scene: {calls ? `${calls.calls} draw calls · ${calls.triangles.toLocaleString()} triangles` : '—'} (the old scene doesn’t expose renderer stats)
            </div>
          </div>

          {report.length > 0 && (
            <div style={{ ...panel, fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.6, maxHeight: 260, overflow: 'auto' }}>
              {report.map((l, i) => <div key={i} style={{ color: l.startsWith('✗') ? '#E5736B' : INK }}>{l}</div>)}
            </div>
          )}
        </div>

        {/* ---------------- viewports ---------------- */}
        <div style={{ display: 'grid', gridTemplateColumns: view === 'split' ? '1fr 1fr' : '1fr', gap: 12 }}>
          {(view === 'old' || view === 'split') && (
            <div>
              <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: MUTED, marginBottom: 6 }}>Old (production scene)</div>
              <div ref={oldRef} onPointerMove={(e) => onMove(e, 'old')} onPointerLeave={() => { oldScene.current?.setHoverOutline(null); setHover(null); }} style={{ position: 'relative', height: 'calc(100vh - 110px)', minHeight: 420, border: `1px solid ${BORDER}`, overflow: 'hidden' }} />
            </div>
          )}
          {(view === 'new' || view === 'split') && (
            <div>
              <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: GOLD, marginBottom: 6 }}>New (v2 prototype)</div>
              <div ref={newRef} onPointerMove={(e) => onMove(e, 'new')} onPointerLeave={() => { newScene.current?.setHoverOutline(null); setHover(null); }} style={{ position: 'relative', height: 'calc(100vh - 110px)', minHeight: 420, border: `1px solid ${BORDER}`, overflow: 'hidden' }} />
            </div>
          )}
        </div>
      </div>

      {hover && (
        <div style={{ position: 'fixed', left: hover.x + 14, top: hover.y + 14, background: PANEL_BG, border: `1px solid ${GOLD}`, padding: '6px 10px', fontSize: 12, pointerEvents: 'none', zIndex: 50 }}>
          <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase' }}>{LABEL[hover.id]} · {hover.which}</div>
          <div>{hoverComp?.name ?? '—'}</div>
        </div>
      )}
    </div>
  );
}
