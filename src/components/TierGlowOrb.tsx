import { TIER_COLORS, hexToRgba, type Tier } from '@/lib/passmark';

// Spans the card's full height (top: 0, bottom: 0 with no explicit height) rather than a small
// centered circle, so the glow reaches from the card's top edge to its bottom edge. Half of its
// width sits outside the card's left edge; the card's own `overflow: hidden` slices that off,
// leaving a tall glow along the whole left side. zIndex: -1 is what makes it paint behind the
// card's static in-flow content instead of covering it — that only stays scoped to this one card
// (not leaking out to affect siblings or the page underneath) if the card itself sets
// `position: relative; zIndex: 0`, which establishes its own local stacking context.
export default function TierGlowOrb({ tier, width = 200, intense = false }: { tier?: Tier; width?: number; intense?: boolean }) {
  const color = TIER_COLORS[tier ?? 'D'].border;
  // Hovering a card makes the glow both reach further in and burn brighter — the combination is
  // what reads as "glowing more" rather than just a flat color swap. Width/transform/background
  // all animate via the transition below even though their target values are computed in JS per
  // render, not declared as CSS keyframes — the browser still interpolates between old and new.
  const effectiveWidth = intense ? width * 1.3 : width;
  const alpha = intense ? 0.85 : 0.55;
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, width: effectiveWidth,
        transform: `translateX(-${effectiveWidth / 2}px)`,
        background: `radial-gradient(ellipse, ${hexToRgba(color, alpha)} 0%, ${hexToRgba(color, 0)} 72%)`,
        pointerEvents: 'none', zIndex: -1,
        transition: 'width 0.2s ease, transform 0.2s ease, background 0.2s ease',
      }}
    />
  );
}
