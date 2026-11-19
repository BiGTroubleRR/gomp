'use client';

// Small on/off switch (role="switch") used for the configurator's budget filter. The label is part of the
// click target; `children` (e.g. an InfoTip) sits next to it and is not.
import type { ReactNode } from 'react';
import { ACCENT_FILL, MUTED } from '@/lib/design-tokens';

export default function ToggleSwitch({
  checked,
  onChange,
  label,
  labelStyle,
  children,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  labelStyle?: React.CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative', flex: 'none', width: 36, height: 20, padding: 0, borderRadius: 10, cursor: 'pointer',
          border: `1px solid ${checked ? '#3FAE74' : 'rgba(235,230,218,0.3)'}`,
          background: checked ? ACCENT_FILL : 'rgba(235,230,218,0.1)',
          boxShadow: checked ? '0 0 10px rgba(63,174,116,0.45)' : 'none',
          transition: 'background .2s, border-color .2s, box-shadow .2s',
        }}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute', top: 2, left: 2, width: 14, height: 14, borderRadius: '50%',
            background: checked ? '#FDFAF4' : MUTED, transform: `translateX(${checked ? 16 : 0}px)`,
            transition: 'transform .2s cubic-bezier(.4,0,.2,1), background .2s',
          }}
        />
      </button>
      <span
        onClick={() => onChange(!checked)}
        style={{ cursor: 'pointer', userSelect: 'none', fontFamily: 'var(--font-sans)', fontSize: 11.5, color: MUTED, ...labelStyle }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}
