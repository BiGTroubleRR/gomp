// Shared accent color for Gomp Budget Builds (GBB) — the used/secondhand-parts section.
// The storefront accent is now green (see design-tokens.ts), so GBB's own department accent is the
// brand gold instead — matching the gold "Budget Builds" link in the header — which keeps it clearly
// distinct from every green button elsewhere while staying on the same dark palette. Text that sits
// on a gold fill must use GBB_ON_ACCENT (dark), not cream: cream-on-gold is too low contrast.
export const GBB_ACCENT = '#C4A35A';
export const GBB_ACCENT_RGB = '196,163,90';
export const GBB_ACCENT_DARK = '#A88B45'; // hover/active state
export const GBB_ON_ACCENT = '#0D0D0C';
export const GBB_ACCENT_TINT = (opacity: number) => `rgba(${GBB_ACCENT_RGB},${opacity})`;
