// Canonical design tokens for GOMP's site — the one place to change the palette or font
// stack. No Tailwind/shared theme exists here: every page/component previously re-declared
// its own local copy of the exact same hex values (MAROON/GOLD/INK/MUTED/PAGE_BG/PANEL_BG,
// sometimes under different local names like BG/PANEL). Import from here instead of
// re-declaring a new literal, so a future redesign only has to change one file to repaint
// the whole site consistently.
//
// The font values are the CSS custom properties next/font/google registers in
// src/app/layout.tsx (Nova Square / DM Sans / JetBrains Mono) — they only resolve inside this
// app's own rendered pages. src/lib/email/resend.ts's HTML email intentionally keeps its own
// literal, web-safe font stack instead of importing these, since an inbox can't load
// next/font or resolve CSS custom properties at all.

export const MAROON = '#6E1423'; // primary brand accent — bordeaux/wine
export const GOLD = '#C4A35A'; // secondary accent — gold
export const INK = '#1C1C1A'; // primary text
export const MUTED = '#7A7469'; // secondary/muted text
export const FAINT = '#A09890'; // tertiary/faintest text
export const SUBTEXT = '#8A8378'; // admin-only secondary text (slightly lighter than MUTED)
export const PAGE_BG = '#F5F0E6'; // page background — cream/beige
export const PANEL_BG = '#FDFAF4'; // card/panel background — lighter cream
export const BORDER = 'rgba(28,28,26,0.1)'; // hairline border — INK at 10% opacity

export const FONT_SERIF = 'var(--font-serif)'; // Nova Square — display/headings
export const FONT_SANS = 'var(--font-sans)'; // DM Sans — body text
export const FONT_MONO = 'var(--font-mono)'; // JetBrains Mono — numerals, reference codes, technical labels

// Many pages hand-type MAROON-tinted shadows/glows as their own rgba() literal (e.g.
// 'rgba(110,20,35,0.35)') — this derives the same color from MAROON at a given alpha instead,
// so it can't silently drift out of sync if the brand color ever changes.
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
