'use client';

import { useDeviceView } from '@/contexts/DeviceViewContext';

// Icon-only control that lets the user manually preview the phone layout. The monitor and
// phone glyphs are stacked in the same spot; toggling slides+rotates+fades one out while the
// other slides+rotates+fades in from the opposite side — a quick "whoosh" swap rather than a
// plain crossfade, driven entirely by a CSS transition on the transform/opacity that changes
// when `forcePhone` flips (no keyframes needed, so it naturally reverses when toggled back).
export default function DeviceViewToggle({ dark }: { dark?: boolean }) {
  const { forcePhone, toggleForcePhone } = useDeviceView();

  const ink = dark ? 'rgba(245,240,230,0.85)' : '#1C1C1A';
  const whooshEase = 'cubic-bezier(.16,1,.3,1)';

  return (
    <button
      onClick={toggleForcePhone}
      aria-label={forcePhone ? 'Switch to desktop view' : 'Preview phone view'}
      aria-pressed={forcePhone}
      title={forcePhone ? 'Switch to desktop view' : 'Preview phone view'}
      style={{
        position: 'relative',
        width: 30,
        height: 26,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
        flexShrink: 0,
      }}
    >
      {/* Monitor glyph — resting when NOT forced to phone, whooshes out to the left when it is */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        style={{
          position: 'absolute',
          transition: `transform 0.45s ${whooshEase}, opacity 0.3s ${whooshEase}`,
          transform: forcePhone ? 'translateX(-16px) rotate(-24deg) scale(0.6)' : 'translateX(0) rotate(0deg) scale(1)',
          opacity: forcePhone ? 0 : 1,
        }}
      >
        <rect x="2.5" y="4" width="19" height="13" rx="1.5" stroke={ink} strokeWidth="1.5" />
        <path d="M9 20.5h6M12 17.5v3" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
      </svg>

      {/* Phone glyph — resting when forced to phone, whooshes in from the right */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        style={{
          position: 'absolute',
          transition: `transform 0.45s ${whooshEase}, opacity 0.3s ${whooshEase}`,
          transform: forcePhone ? 'translateX(0) rotate(0deg) scale(1)' : 'translateX(16px) rotate(24deg) scale(0.6)',
          opacity: forcePhone ? 1 : 0,
        }}
      >
        <rect x="7" y="2.5" width="10" height="19" rx="2.2" stroke={ink} strokeWidth="1.5" />
        <path d="M11 18.2h2" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  );
}
