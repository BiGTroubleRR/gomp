'use client';

// Admin-only 3D alignment tuning — the successor to an earlier dev-only, session-local panel.
// This one is real, persistent, and production: it writes to the `alignment_tuning` Supabase
// table (see src/lib/supabase/alignment-tuning.ts), which /build fetches once and then follows
// live via Realtime (src/app/build/page.tsx), so a change made here reaches every configurator
// tab — open now or opened later — without a deploy. Gated purely by living under /admin, behind
// the same Clerk admin check as every other admin tab (see src/lib/admin-auth.ts) — a visitor to
// /build never sees this UI or ships it in their bundle.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { DEFAULT_ALIGNMENT_TUNING, type AlignmentTunableId, type AlignmentTuning } from '@/lib/build-scene';
import { fetchAlignmentTuning, saveAlignmentTuning } from '@/lib/supabase/alignment-tuning';

const SUBTEXT = '#8A8378';
const ACCENT = '#6E1423';
const mono: CSSProperties = { fontFamily: 'var(--font-mono)' };

const AXIS_LABEL = ['X', 'Y', 'Z'] as const;
const TUNABLE_IDS: { id: AlignmentTunableId; label: string }[] = [
  { id: 'cpu', label: 'CPU' },
  { id: 'cooler', label: 'Cooler' },
  { id: 'ram', label: 'RAM' },
  { id: 'storage', label: 'Storage' },
];

// Merges a partial saved row over the scene's own defaults, so every field always has a value
// to show — mirrors how build-scene.ts's applyAlignmentTuning treats a partial row.
function withDefaults(partial: Partial<AlignmentTuning> | null): AlignmentTuning {
  return {
    basePos: {
      cpu: partial?.basePos?.cpu ? [...partial.basePos.cpu] : [...DEFAULT_ALIGNMENT_TUNING.basePos.cpu],
      cooler: partial?.basePos?.cooler ? [...partial.basePos.cooler] : [...DEFAULT_ALIGNMENT_TUNING.basePos.cooler],
      ram: partial?.basePos?.ram ? [...partial.basePos.ram] : [...DEFAULT_ALIGNMENT_TUNING.basePos.ram],
      storage: partial?.basePos?.storage ? [...partial.basePos.storage] : [...DEFAULT_ALIGNMENT_TUNING.basePos.storage],
    } as Record<AlignmentTunableId, [number, number, number]>,
    moboRearClearance: partial?.moboRearClearance ?? DEFAULT_ALIGNMENT_TUNING.moboRearClearance,
    moboSideClearance: partial?.moboSideClearance ?? DEFAULT_ALIGNMENT_TUNING.moboSideClearance,
    aioTubeSpacing: partial?.aioTubeSpacing ?? DEFAULT_ALIGNMENT_TUNING.aioTubeSpacing,
    aioTubeRadius: partial?.aioTubeRadius ?? DEFAULT_ALIGNMENT_TUNING.aioTubeRadius,
    aioBendOffset: partial?.aioBendOffset ? [...partial.aioBendOffset] : [...DEFAULT_ALIGNMENT_TUNING.aioBendOffset],
  };
}

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
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ ...mono, fontSize: 11, color: SUBTEXT, width: 90, flexShrink: 0 }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} style={{ flex: 1, accentColor: ACCENT }} />
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!Number.isNaN(v)) onChange(v);
        }}
        style={{ ...mono, width: 68, fontSize: 12, color: '#1C1C1A', background: '#fff', border: '1px solid rgba(28,28,26,0.15)', borderRadius: 4, padding: '3px 5px' }}
      />
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: 1, margin: '20px 0 8px' }}>{children}</div>;
}

export default function AdminAlignmentPanel() {
  const [tuning, setTuning] = useState<AlignmentTuning | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAlignmentTuning().then((partial) => {
      if (!cancelled) setTuning(withDefaults(partial));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function persist(next: AlignmentTuning) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setStatus('saving');
    saveTimer.current = setTimeout(() => {
      saveAlignmentTuning(next)
        .then(() => setStatus('saved'))
        .catch(() => setStatus('error'));
    }, 250);
  }

  function updateBasePos(id: AlignmentTunableId, axis: 0 | 1 | 2, value: number) {
    setTuning((prev) => {
      if (!prev) return prev;
      const next: AlignmentTuning = { ...prev, basePos: { ...prev.basePos, [id]: [...prev.basePos[id]] as [number, number, number] } };
      next.basePos[id][axis] = value;
      persist(next);
      return next;
    });
  }

  function updateField<K extends 'moboRearClearance' | 'moboSideClearance' | 'aioTubeSpacing' | 'aioTubeRadius'>(key: K, value: number) {
    setTuning((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      persist(next);
      return next;
    });
  }

  function updateAioBendAxis(axis: 0 | 1 | 2, value: number) {
    setTuning((prev) => {
      if (!prev) return prev;
      const aioBendOffset: [number, number, number] = [...prev.aioBendOffset];
      aioBendOffset[axis] = value;
      const next: AlignmentTuning = { ...prev, aioBendOffset };
      persist(next);
      return next;
    });
  }

  function handleReset() {
    const next = withDefaults(null);
    setTuning(next);
    persist(next);
  }

  if (!tuning) {
    return <div style={{ ...mono, fontSize: 12, color: SUBTEXT, padding: '20px 0' }}>Loading…</div>;
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <p style={{ ...mono, fontSize: 12, color: SUBTEXT, margin: 0, lineHeight: 1.5, maxWidth: 380 }}>
          Adjusts /build's 3D scene alignment for everyone, live — no deploy needed. Open /build in another tab to watch changes land.
        </p>
        <a href="/build" target="_blank" rel="noopener noreferrer" style={{ ...mono, fontSize: 12, color: ACCENT, whiteSpace: 'nowrap', marginLeft: 16 }}>
          Open configurator ↗
        </a>
      </div>
      <div style={{ ...mono, fontSize: 11, color: status === 'error' ? '#B3261E' : SUBTEXT, height: 16, marginTop: 6 }}>
        {status === 'saving' && 'Saving…'}
        {status === 'saved' && 'Saved — live on /build'}
        {status === 'error' && 'Save failed — check connection and retry'}
      </div>

      <SectionTitle>Position offsets (from mobo)</SectionTitle>
      {TUNABLE_IDS.map(({ id, label }) => (
        <div key={id} style={{ marginBottom: 10 }}>
          <div style={{ ...mono, fontSize: 12, fontWeight: 600, color: '#1C1C1A', marginBottom: 4 }}>{label}</div>
          {tuning.basePos[id].map((v, axis) => (
            <NumberField key={axis} label={AXIS_LABEL[axis]} value={v} min={-2} max={2} step={0.005} onChange={(val) => updateBasePos(id, axis as 0 | 1 | 2, val)} />
          ))}
        </div>
      ))}

      <SectionTitle>Mobo anchoring</SectionTitle>
      <NumberField label="Rear clearance" value={tuning.moboRearClearance} min={0} max={0.5} step={0.005} onChange={(v) => updateField('moboRearClearance', v)} />
      <NumberField label="Side clearance" value={tuning.moboSideClearance} min={0} max={0.5} step={0.005} onChange={(v) => updateField('moboSideClearance', v)} />

      <SectionTitle>AIO tube routing</SectionTitle>
      <NumberField label="Spacing" value={tuning.aioTubeSpacing} min={0} max={0.3} step={0.005} onChange={(v) => updateField('aioTubeSpacing', v)} />
      <NumberField label="Radius" value={tuning.aioTubeRadius} min={0.002} max={0.08} step={0.002} onChange={(v) => updateField('aioTubeRadius', v)} />
      <div style={{ ...mono, fontSize: 12, fontWeight: 600, color: '#1C1C1A', margin: '6px 0 4px' }}>Bend offset</div>
      {tuning.aioBendOffset.map((v, axis) => (
        <NumberField key={axis} label={AXIS_LABEL[axis]} value={v} min={-1} max={1} step={0.01} onChange={(val) => updateAioBendAxis(axis as 0 | 1 | 2, val)} />
      ))}

      <button
        onClick={handleReset}
        style={{
          ...mono, marginTop: 16, fontSize: 12, fontWeight: 600, color: '#1C1C1A',
          background: '#fff', border: '1px solid rgba(28,28,26,0.15)', borderRadius: 6, padding: '8px 16px', cursor: 'pointer',
        }}
      >
        Reset all to defaults
      </button>
    </div>
  );
}
