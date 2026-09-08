'use client';

// Admin-only 3D alignment tuning — the successor to an earlier dev-only, session-local panel.
// This one is real, persistent, and production: it writes to the `alignment_tuning` Supabase
// table (see src/lib/supabase/alignment-tuning.ts), which /build fetches once and then follows
// live via Realtime (src/app/build/page.tsx), so a change made here reaches every configurator
// tab — open now or opened later — without a deploy. Gated purely by living under /admin, behind
// the same Clerk admin check as every other admin tab (see src/lib/admin-auth.ts) — a visitor to
// /build never sees this UI or ships it in their bundle.
//
// Every field is versioned per motherboard form factor (ATX/E-ATX/mATX/Mini-ITX, see the tab
// strip below) — a linear real-mm scale isn't enough to make an ATX-tuned offset land right on a
// much smaller board, since form factors don't just shrink the same layout, they rearrange it.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { DEFAULT_ALIGNMENT_TUNING, type AlignmentTunableId, type AlignmentTuning } from '@/lib/build-scene';
import type { FormFactor } from '@/lib/component-db-seed';
import { fetchAlignmentTuningConfig, saveAlignmentTuningConfig, type AlignmentTuningConfig } from '@/lib/supabase/alignment-tuning';

const INK = '#1C1C1A';
const SUBTEXT = '#8A8378';
const ACCENT = '#6E1423';
const BORDER = 'rgba(28,28,26,0.1)';
const sans: CSSProperties = { fontFamily: 'var(--font-sans)' };
const mono: CSSProperties = { fontFamily: 'var(--font-mono)' };

const AXIS_LABEL = ['X', 'Y', 'Z'] as const;
const TUNABLE_IDS: { id: AlignmentTunableId; label: string }[] = [
  { id: 'cpu', label: 'CPU' },
  { id: 'cooler', label: 'Cooler' },
  { id: 'ram', label: 'RAM' },
  { id: 'storage', label: 'Storage' },
  { id: 'gpu', label: 'GPU' },
];
// Same order as /build's own form-factor filter buttons.
const FORM_FACTORS: FormFactor[] = ['ATX', 'E-ATX', 'Mini-ITX', 'mATX'];

// Merges a partial saved slice over the scene's own defaults, so every field always has a value
// to show — mirrors how build-scene.ts's applyAlignmentTuning treats a partial row.
function withDefaults(partial: Partial<AlignmentTuning> | null): AlignmentTuning {
  return {
    basePos: {
      cpu: partial?.basePos?.cpu ? [...partial.basePos.cpu] : [...DEFAULT_ALIGNMENT_TUNING.basePos.cpu],
      cooler: partial?.basePos?.cooler ? [...partial.basePos.cooler] : [...DEFAULT_ALIGNMENT_TUNING.basePos.cooler],
      ram: partial?.basePos?.ram ? [...partial.basePos.ram] : [...DEFAULT_ALIGNMENT_TUNING.basePos.ram],
      storage: partial?.basePos?.storage ? [...partial.basePos.storage] : [...DEFAULT_ALIGNMENT_TUNING.basePos.storage],
      gpu: partial?.basePos?.gpu ? [...partial.basePos.gpu] : [...DEFAULT_ALIGNMENT_TUNING.basePos.gpu],
    } as Record<AlignmentTunableId, [number, number, number]>,
    moboRearClearance: partial?.moboRearClearance ?? DEFAULT_ALIGNMENT_TUNING.moboRearClearance,
    moboSideClearance: partial?.moboSideClearance ?? DEFAULT_ALIGNMENT_TUNING.moboSideClearance,
    gpuSideClearance: partial?.gpuSideClearance ?? DEFAULT_ALIGNMENT_TUNING.gpuSideClearance,
    gpuVerticalBottomClearance: partial?.gpuVerticalBottomClearance ?? DEFAULT_ALIGNMENT_TUNING.gpuVerticalBottomClearance,
    aioTubeSpacing: partial?.aioTubeSpacing ?? DEFAULT_ALIGNMENT_TUNING.aioTubeSpacing,
    aioTubeRadius: partial?.aioTubeRadius ?? DEFAULT_ALIGNMENT_TUNING.aioTubeRadius,
    aioBendOffset: partial?.aioBendOffset ? [...partial.aioBendOffset] : [...DEFAULT_ALIGNMENT_TUNING.aioBendOffset],
  };
}

// Scoped via a wrapper class rather than a CSS module (this codebase has no build step for
// those) — needed because a range input's thumb/track can only be restyled through pseudo-
// elements, which plain inline `style={}` objects can't reach.
const SLIDER_CSS = `
.alignment-panel input[type=range] {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: rgba(28,28,26,0.12);
  outline: none;
}
.alignment-panel input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${ACCENT};
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.25);
  cursor: pointer;
}
.alignment-panel input[type=range]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${ACCENT};
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.25);
  cursor: pointer;
}
.alignment-panel input[type=number] {
  -moz-appearance: textfield;
}
.alignment-panel input[type=number]:focus,
.alignment-panel input[type=range]:focus-visible {
  outline: 2px solid ${ACCENT};
  outline-offset: 2px;
}
`;

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '76px 1fr 76px', alignItems: 'center', gap: 14, padding: '7px 0' }}>
      <span style={{ ...sans, fontSize: 12.5, color: SUBTEXT }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!Number.isNaN(v)) onChange(v);
        }}
        style={{
          ...mono, width: '100%', fontSize: 12.5, color: INK, background: '#fff',
          border: `1px solid ${BORDER}`, borderRadius: 6, padding: '5px 7px', textAlign: 'right',
        }}
      />
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
      <div style={{ ...sans, fontSize: 12, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

export default function AdminAlignmentPanel() {
  const [config, setConfig] = useState<Partial<AlignmentTuningConfig> | null>(null);
  const [activeFormFactor, setActiveFormFactor] = useState<FormFactor>('ATX');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const skipNextSave = useRef(true);

  useEffect(() => {
    let cancelled = false;
    fetchAlignmentTuningConfig().then((c) => {
      // Normalize rather than `c ?? {byFormFactor:{}}` — a row saved before this feature existed
      // is a truthy but differently-shaped flat object (no byFormFactor key at all), and `??`
      // only catches null/undefined, so it would otherwise pass that stale shape straight through
      // and every subsequent save would keep carrying its dead top-level fields forward forever.
      if (!cancelled) setConfig({ byFormFactor: c?.byFormFactor ?? {} });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // A single debounced save effect (instead of a persist() call scattered inside every state
  // updater) — a side effect called from within a state-updater function is a React anti-pattern
  // (React may invoke it more than once per update, most visibly under StrictMode) and, worse,
  // leaves every pending save's timer to fire on its own schedule with no unmount cleanup, so a
  // stale tab could clobber a fresher save made elsewhere minutes later. A plain effect keyed on
  // `config` gets both for free: it re-derives its debounce timer from the latest state on every
  // change, and its cleanup (React calls it before every re-run, including on unmount) cancels
  // anything pending.
  useEffect(() => {
    if (!config) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    setStatus('saving');
    const timer = setTimeout(() => {
      saveAlignmentTuningConfig(config)
        .then(() => setStatus('saved'))
        .catch(() => setStatus('error'));
    }, 250);
    return () => clearTimeout(timer);
  }, [config]);

  const activeSlice = withDefaults(config?.byFormFactor?.[activeFormFactor] ?? null);

  // Every edit reads the active form factor's current (defaults-merged) slice, applies one
  // change, and writes the whole resulting slice back — other form factors' entries in
  // byFormFactor are left completely untouched.
  function updateActiveSlice(mutate: (draft: AlignmentTuning) => void) {
    setConfig((prev) => {
      const draft = withDefaults(prev?.byFormFactor?.[activeFormFactor] ?? null);
      mutate(draft);
      return { ...prev, byFormFactor: { ...(prev?.byFormFactor ?? {}), [activeFormFactor]: draft } };
    });
  }

  function updateBasePos(id: AlignmentTunableId, axis: 0 | 1 | 2, value: number) {
    updateActiveSlice((draft) => {
      draft.basePos = { ...draft.basePos, [id]: [...draft.basePos[id]] as [number, number, number] };
      draft.basePos[id][axis] = value;
    });
  }

  function updateField<K extends 'moboRearClearance' | 'moboSideClearance' | 'gpuSideClearance' | 'gpuVerticalBottomClearance' | 'aioTubeSpacing' | 'aioTubeRadius'>(
    key: K,
    value: number,
  ) {
    updateActiveSlice((draft) => {
      draft[key] = value;
    });
  }

  function updateAioBendAxis(axis: 0 | 1 | 2, value: number) {
    updateActiveSlice((draft) => {
      const aioBendOffset: [number, number, number] = [...draft.aioBendOffset];
      aioBendOffset[axis] = value;
      draft.aioBendOffset = aioBendOffset;
    });
  }

  // Clears just the active form factor's slice — other form factors' customizations survive.
  function handleReset() {
    setConfig((prev) => {
      const byFormFactor = { ...(prev?.byFormFactor ?? {}) };
      delete byFormFactor[activeFormFactor];
      return { ...prev, byFormFactor };
    });
  }

  if (!config) {
    return <div style={{ ...mono, fontSize: 12, color: SUBTEXT, padding: '20px 0' }}>Loading…</div>;
  }

  return (
    <div className="alignment-panel" style={{ maxWidth: 560 }}>
      <style>{SLIDER_CSS}</style>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
        <p style={{ ...sans, fontSize: 12.5, color: SUBTEXT, margin: 0, lineHeight: 1.55, maxWidth: 400 }}>
          Adjusts /build&apos;s 3D scene alignment for everyone, live — no deploy needed, versioned separately per motherboard form factor.
          Open /build in another tab to watch changes land.
        </p>
        <a href="/build" target="_blank" rel="noopener noreferrer" style={{ ...sans, fontSize: 12.5, fontWeight: 600, color: ACCENT, whiteSpace: 'nowrap' }}>
          Open configurator ↗
        </a>
      </div>
      <div style={{ ...sans, fontSize: 12, fontWeight: 600, color: status === 'error' ? '#B3261E' : SUBTEXT, height: 18, marginTop: 8 }}>
        {status === 'saving' && 'Saving…'}
        {status === 'saved' && '✓ Saved — live on /build'}
        {status === 'error' && 'Save failed — check connection and retry'}
      </div>

      <div style={{ display: 'flex', gap: 4, margin: '14px 0 18px', background: 'rgba(28,28,26,0.05)', borderRadius: 8, padding: 4 }}>
        {FORM_FACTORS.map((ff) => (
          <button
            key={ff}
            onClick={() => setActiveFormFactor(ff)}
            style={{
              ...sans, flex: 1, fontSize: 12.5, fontWeight: 600, padding: '7px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: activeFormFactor === ff ? '#fff' : 'transparent',
              color: activeFormFactor === ff ? ACCENT : SUBTEXT,
              boxShadow: activeFormFactor === ff ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {ff}
          </button>
        ))}
      </div>

      <Card title="Position offsets (from mobo)">
        {TUNABLE_IDS.map(({ id, label }, i) => (
          <div key={id} style={{ borderTop: i === 0 ? 'none' : `1px solid ${BORDER}`, paddingTop: i === 0 ? 0 : 10, marginTop: i === 0 ? 0 : 10 }}>
            <div style={{ ...sans, fontSize: 13, fontWeight: 600, color: INK, marginBottom: 2 }}>{label}</div>
            {activeSlice.basePos[id].map((v, axis) => (
              <NumberField key={axis} label={AXIS_LABEL[axis]} value={v} min={-2} max={2} step={0.005} onChange={(val) => updateBasePos(id, axis as 0 | 1 | 2, val)} />
            ))}
          </div>
        ))}
      </Card>

      <Card title="Mobo anchoring">
        <NumberField label="Rear clearance" value={activeSlice.moboRearClearance} min={0} max={0.5} step={0.005} onChange={(v) => updateField('moboRearClearance', v)} />
        <NumberField label="Side clearance" value={activeSlice.moboSideClearance} min={0} max={0.5} step={0.005} onChange={(v) => updateField('moboSideClearance', v)} />
      </Card>

      <Card title="GPU vertical (riser) mount">
        <p style={{ ...sans, fontSize: 11.5, color: SUBTEXT, margin: '0 0 8px', lineHeight: 1.5 }}>
          Only applies to riser-mounted vertical GPU cases — the normal horizontal mount uses the GPU row above instead.
        </p>
        <NumberField label="Side clearance" value={activeSlice.gpuSideClearance} min={0} max={0.5} step={0.005} onChange={(v) => updateField('gpuSideClearance', v)} />
        <NumberField label="Bottom clearance" value={activeSlice.gpuVerticalBottomClearance} min={0} max={0.5} step={0.005} onChange={(v) => updateField('gpuVerticalBottomClearance', v)} />
      </Card>

      <Card title="AIO tube routing">
        <NumberField label="Spacing" value={activeSlice.aioTubeSpacing} min={0} max={0.3} step={0.005} onChange={(v) => updateField('aioTubeSpacing', v)} />
        <NumberField label="Radius" value={activeSlice.aioTubeRadius} min={0.002} max={0.08} step={0.002} onChange={(v) => updateField('aioTubeRadius', v)} />
        <div style={{ ...sans, fontSize: 13, fontWeight: 600, color: INK, margin: '10px 0 2px' }}>Bend offset</div>
        {activeSlice.aioBendOffset.map((v, axis) => (
          <NumberField key={axis} label={AXIS_LABEL[axis]} value={v} min={-1} max={1} step={0.01} onChange={(val) => updateAioBendAxis(axis as 0 | 1 | 2, val)} />
        ))}
      </Card>

      <button
        onClick={handleReset}
        style={{
          ...sans, fontSize: 12.5, fontWeight: 600, color: INK,
          background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '9px 18px', cursor: 'pointer',
        }}
      >
        Reset {activeFormFactor} to defaults
      </button>
    </div>
  );
}
