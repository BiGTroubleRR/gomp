'use client';

// Animated dropdown used by the /build configurator (step categories, motherboard socket / form factor).
// Styled with the site's tokens (dark green panels, green accent), animated with motion, and keyboard
// accessible: Arrow keys move, Enter / Space pick, Escape closes, a click outside closes. The menu is
// absolutely positioned under the trigger, so it works inside the configurator's scrolling sidebar.
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ACCENT, ACCENT_FILL, INK, MUTED, PANEL_BG } from '@/lib/design-tokens';

export type DropdownOption = {
  value: string;
  label: string;
  // Small marker after the label (e.g. a check for a step that already has a part picked).
  done?: boolean;
};

export default function AnimatedDropdown({
  value,
  options,
  onChange,
  ariaLabel,
  caption,
  maxMenuHeight = 280,
  style,
}: {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  // Small caps caption inside the trigger, above the current value (e.g. "Socket").
  caption?: string;
  maxMenuHeight?: number;
  style?: CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const reduce = useReducedMotion();
  const uid = useId();

  const selectedIdx = Math.max(0, options.findIndex((o) => o.value === value));
  const selected = options[selectedIdx];

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // Keep the keyboard-highlighted row in view inside the scrolling menu.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIdx]);

  function openMenu() {
    setActiveIdx(selectedIdx);
    setOpen(true);
  }
  function pick(i: number) {
    const o = options[i];
    if (o) onChange(o.value);
    setOpen(false);
  }
  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(options.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActiveIdx(0); }
    else if (e.key === 'End') { e.preventDefault(); setActiveIdx(options.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(activeIdx); }
    else if (e.key === 'Tab') setOpen(false);
  }

  const d = reduce ? 0 : 0.16;

  return (
    <div ref={rootRef} style={{ position: 'relative', ...style }}>
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${uid}-list`}
        aria-label={ariaLabel}
        aria-activedescendant={open ? `${uid}-opt-${activeIdx}` : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, textAlign: 'left',
          padding: caption ? '6px 12px' : '9px 12px', minHeight: 40, borderRadius: 8, cursor: 'pointer',
          border: `1px solid ${open ? ACCENT : 'rgba(235,230,218,0.2)'}`,
          background: open ? 'rgba(63,174,116,0.08)' : 'rgba(235,230,218,0.05)',
          boxShadow: open ? '0 0 0 3px rgba(63,174,116,0.16)' : 'none',
          color: INK, fontFamily: 'var(--font-sans)', transition: 'border-color .15s, background .15s, box-shadow .15s',
        }}
      >
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {caption && (
            <span style={{ fontSize: 9.5, fontWeight: 700, color: MUTED, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{caption}</span>
          )}
          <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {selected?.label}
          </span>
        </span>
        <motion.svg
          aria-hidden
          width="14"
          height="14"
          viewBox="0 0 14 14"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: d }}
          style={{ flex: 'none', color: open ? ACCENT : MUTED }}
        >
          <path d="M3 5.25 7 9l4-3.75" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            ref={listRef}
            id={`${uid}-list`}
            role="listbox"
            aria-label={ariaLabel}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: d, ease: 'easeOut' }}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 40, margin: 0, padding: 4, listStyle: 'none',
              maxHeight: maxMenuHeight, overflowY: 'auto', transformOrigin: 'top center',
              background: PANEL_BG, border: '1px solid rgba(235,230,218,0.16)', borderRadius: 10,
              boxShadow: '0 14px 34px rgba(0,0,0,0.5), 0 0 0 1px rgba(63,174,116,0.06)',
            }}
          >
            {options.map((o, i) => {
              const isSel = o.value === value;
              const isActive = i === activeIdx;
              return (
                <motion.li
                  key={o.value}
                  id={`${uid}-opt-${i}`}
                  data-idx={i}
                  role="option"
                  aria-selected={isSel}
                  initial={reduce ? false : { opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.14, delay: reduce ? 0 : Math.min(i, 8) * 0.02 }}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => pick(i)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 10px', borderRadius: 7,
                    cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: isSel ? 600 : 400,
                    color: isSel ? '#FDFAF4' : INK,
                    background: isSel ? ACCENT_FILL : isActive ? 'rgba(235,230,218,0.08)' : 'transparent',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
                  {o.done && !isSel && <span aria-hidden style={{ color: ACCENT, fontSize: 11 }}>✓</span>}
                  {isSel && <span aria-hidden style={{ fontSize: 12 }}>●</span>}
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
