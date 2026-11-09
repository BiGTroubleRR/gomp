'use client';

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { ACCENT, BORDER_STRONG, INK, MUTED, PANEL_BG } from '@/lib/design-tokens';

// A small round "i" that shows a short hint next to a heading — instead of printing the hint as a line of
// small grey text. Hover or keyboard focus shows the bubble; on touch (no hover) a tap toggles it, and a tap
// elsewhere or Escape closes it. The bubble is rendered through a portal at fixed viewport coordinates, so
// scrolling / overflow-hidden panels (like the configurator's side panel) can't clip it, and it is clamped
// to the viewport so it never runs off a phone screen.
const BUBBLE_W = 264;
const MARGIN = 12;

type Pos = { left: number; top?: number; bottom?: number; width: number };

export default function InfoTip({ text, label, size = 14, style }: { text: string; label?: string; size?: number; style?: CSSProperties }) {
  const id = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);

  const place = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.min(BUBBLE_W, window.innerWidth - MARGIN * 2);
    const left = Math.max(MARGIN, Math.min(r.left + r.width / 2 - width / 2, window.innerWidth - width - MARGIN));
    // Below the icon by default; above it when the icon sits in the lower half of the screen.
    if (r.top > window.innerHeight * 0.55) setPos({ left, width, bottom: window.innerHeight - r.top + 8 });
    else setPos({ left, width, top: r.bottom + 8 });
  }, []);

  const show = useCallback(() => {
    place();
    setOpen(true);
  }, [place]);
  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!btnRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [open, hide]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={label ?? text}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        // Mouse hover opens/closes; a touch tap (which also fires pointerenter) is handled by onClick instead.
        onPointerEnter={(e) => e.pointerType === 'mouse' && show()}
        onPointerLeave={(e) => e.pointerType === 'mouse' && hide()}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => {
          e.stopPropagation(); // sits inside clickable rows (e.g. the installed-part cards)
          if (open) hide();
          else show();
        }}
        style={{
          flexShrink: 0,
          width: size,
          height: size,
          padding: 0,
          borderRadius: '50%',
          border: `1px solid ${open ? ACCENT : BORDER_STRONG}`,
          background: 'transparent',
          color: open ? ACCENT : MUTED,
          cursor: 'help',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          verticalAlign: 'middle',
          transition: 'color 0.15s, border-color 0.15s',
          textShadow: 'none',
          ...style,
        }}
      >
        <svg width={size * 0.5} height={size * 0.64} viewBox="0 0 6 9" fill="currentColor" aria-hidden="true">
          <circle cx="3" cy="1.2" r="1.05" />
          <rect x="2.1" y="3.2" width="1.8" height="5.2" rx="0.5" />
        </svg>
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            style={{
              position: 'fixed',
              left: pos.left,
              top: pos.top,
              bottom: pos.bottom,
              width: pos.width,
              zIndex: 10000,
              pointerEvents: 'none',
              background: PANEL_BG,
              border: `1px solid ${BORDER_STRONG}`,
              borderRadius: 4,
              padding: '9px 12px',
              boxShadow: '0 12px 32px -8px rgba(0,0,0,0.7)',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              fontWeight: 400,
              lineHeight: 1.5,
              letterSpacing: 0,
              textTransform: 'none',
              textShadow: 'none',
              color: INK,
            }}
          >
            {text}
          </div>,
          document.body,
        )}
    </>
  );
}
