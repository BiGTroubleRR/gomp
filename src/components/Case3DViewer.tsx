'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { createBuildScene, type CompId } from '@/lib/build-scene';
import type { Component } from '@/lib/component-db-seed';

export type CompDb = Partial<Record<CompId, Component[]>>;

type Config = {
  selected: Partial<Record<string, boolean>>;
  selections: Partial<Record<string, string>>;
  compDb: CompDb;
};

// Mirrors checkout/page.tsx's own CAT constant — kept local rather than imported/shared, same
// small-label-map duplication already tolerated elsewhere in this codebase (e.g. CAT_LABEL in
// src/app/page.tsx).
const CAT_LABEL: Record<CompId, string> = {
  mobo: 'Motherboard',
  cpu: 'CPU',
  cooler: 'CPU Cooler',
  ram: 'RAM',
  gpu: 'GPU',
  storage: 'Storage',
  psu: 'PSU',
  case: 'Case',
};

const MAROON = '#6E1423';
const INK = '#1C1C1A';
const MUTED = '#7A7469';
const PANEL_BG = '#FDFAF4';

// Renders the saved build using the exact same engine as the Build page's live configurator
// (build-scene.ts's createBuildScene + applyBuildSnapshot) instead of a separate simplified
// stand-in, so what the customer sees at checkout matches what they actually assembled. Wired
// up once from a finished snapshot rather than driven incrementally — checkout has no per-part
// UI to call toggleComponent/setSizeScale/etc. as the user picks things, it just has the final
// (selected, selections, compDb) state to render as-is.
export default function Case3DViewer({ config }: { config: Config | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ReturnType<typeof createBuildScene> | null>(null);
  const [hoverId, setHoverId] = useState<CompId | null>(null);
  // Viewport-fixed coordinates (clientX/clientY), not container-relative — the tooltip is
  // portaled to document.body (see the return below) specifically to escape checkout/page.tsx's
  // own overflow: hidden wrapper around this component, so it needs viewport coordinates to match.
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !config) return;

    // oscillate: true — a slow, bounded back-and-forth sway instead of /build's continuous
    // auto-rotate, so the case shows every angle without spinning forever next to a form someone's
    // filling in (see the oscillate branch in build-scene.ts's tick()).
    const scene = createBuildScene(container, { oscillate: true });
    scene.applyBuildSnapshot(config.compDb, config.selected, config.selections);
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
      setHoverId(null);
      setHoverPos(null);
    };
  }, [config]);

  // A separate, sibling overlay handles pointer events rather than enabling them on the 3D
  // container itself — that container's canvas has OrbitControls listening directly on it
  // (independent of React), so making it pointer-permeable would also let a visitor drag-orbit
  // the model, fighting the oscillate animation every frame. This overlay only feeds hover
  // position into pickComponentAt/setHoverOutline; the canvas underneath stays non-interactive.
  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const id = sceneRef.current?.pickComponentAt(e.clientX, e.clientY) ?? null;
    setHoverId(id);
    setHoverPos({ x: e.clientX, y: e.clientY });
    sceneRef.current?.setHoverOutline(id);
  }

  function handlePointerLeave() {
    setHoverId(null);
    setHoverPos(null);
    sceneRef.current?.setHoverOutline(null);
  }

  const hoverList = hoverId ? config?.compDb[hoverId] : undefined;
  const hoverComp = hoverList?.find((c) => c.name === config?.selections[hoverId!]) ?? hoverList?.[0];

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* overflow: hidden lives here, scoped to just the canvas — not on the outer wrapper above,
          which also holds the tooltip below. The tooltip can need to render past this box's own
          edges (flipped to the cursor's left near the right edge of the viewport); putting
          overflow: hidden on a shared ancestor would clip it there too, regardless of whether that
          position is actually within the visible viewport. */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div ref={containerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      </div>
      <div
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}
      />
      {hoverId &&
        hoverComp &&
        hoverPos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              // Flips to the cursor's left once the tooltip's usual right-hand placement would
              // run past the viewport's edge — portaled to document.body specifically so this
              // (and the coordinates below) are relative to the real viewport, not clipped by
              // checkout/page.tsx's own overflow: hidden wrapper around this component.
              left: window.innerWidth - hoverPos.x < 14 + 220 ? hoverPos.x - 14 - 220 : hoverPos.x + 14,
              top: hoverPos.y + 14,
              zIndex: 1000,
              pointerEvents: 'none',
              background: PANEL_BG,
              border: '0.5px solid rgba(28,28,26,0.15)',
              borderLeft: `3px solid ${MAROON}`,
              borderRadius: 3,
              padding: '6px 10px',
              boxShadow: '0 6px 16px rgba(28,28,26,0.18)',
              maxWidth: 220,
            }}
          >
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: MUTED }}>
              {CAT_LABEL[hoverId]}
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, color: INK }}>{hoverComp.name}</div>
          </div>,
          document.body,
        )}
    </div>
  );
}
