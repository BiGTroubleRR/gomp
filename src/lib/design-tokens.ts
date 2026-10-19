// Canonical design tokens for GOMP's site — the one place to change the palette or font stack.
// The site runs a dark scheme (near-black pages, green-tinted panels, cream text, green + gold
// accents); the exact values come from the homepage concept PDF's own vector data. Import from here
// instead of re-declaring a literal, so a future redesign only has to touch this file (and the
// matching `--gomp-*` custom properties in src/app/globals.css, which cannot import from TS).
//
// The font values are the CSS custom properties next/font/google registers in src/app/layout.tsx
// (Nova Square / DM Sans / JetBrains Mono) — they only resolve inside this app's rendered pages.
// src/lib/email/resend.ts deliberately keeps its own literal light palette and web-safe fonts: an
// inbox can't load next/font, and the confirmation email must stay readable on a light mail client.

// ---- Surfaces ----
export const PAGE_BG = '#0D0D0C'; // page background — near-black
export const PANEL_BG = '#131A17'; // card / panel surface — green-tinted dark
export const SURFACE_ALT = '#0C110F'; // recessed surface (inputs, footer, utility bar)
export const SURFACE_RAISED = '#1A231F'; // hovered / raised panel, chips

// ---- Text ----
export const INK = '#EBE6DA'; // primary text (cream)
export const MUTED = '#98A39D'; // secondary text
export const FAINT = '#6B7570'; // tertiary text
export const SUBTEXT = '#7E8984'; // admin-only secondary text

// ---- Accents ----
export const ACCENT = '#3FAE74'; // green: emphasized text, prices, active states, borders
export const ACCENT_BRIGHT = '#5FB98A'; // lighter green (hover, tier-B text)
export const ACCENT_FILL = '#1F8A55'; // solid green for button/chip backgrounds (pair with ON_ACCENT)
export const ACCENT_DEEP = '#0F5C3A'; // dark green: nav bar start, pressed states
export const ACCENT_GRADIENT = 'linear-gradient(135deg, #0F5C3A 0%, #2F9E66 100%)'; // buttons, nav bar
export const ON_ACCENT = '#FDFAF4'; // text that sits on ACCENT_FILL / ACCENT_GRADIENT / GOLD fills
export const GOLD = '#C4A35A'; // brand gold: highlights, badges, "Legendu"
export const GOLD_LIGHT = '#E3C47F'; // gold highlight / gradient end

// ---- Lines ----
export const BORDER = 'rgba(235,230,218,0.10)'; // hairline border — cream at 10% opacity
export const BORDER_STRONG = 'rgba(235,230,218,0.20)';

export const FONT_SERIF = 'var(--font-serif)'; // Nova Square — display/headings
export const FONT_SANS = 'var(--font-sans)'; // DM Sans — body text
export const FONT_MONO = 'var(--font-mono)'; // JetBrains Mono — numerals, reference codes, technical labels

// Many places hand-type tinted shadows/glows as their own rgba() literal — this derives the same
// color from a token at a given alpha instead, so it can't drift out of sync with the palette.
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
