// Shared accent color for Gomp Budget Builds (GBB) — the used/secondhand-parts section.
// Deliberately only swaps the site's bordeaux/maroon accent (#6E1423) for a deep forest green;
// gold, ink, and the cream/parchment neutrals stay exactly as they are everywhere else, so this
// reads as "the same site, a different department" rather than a different brand.
export const GBB_GREEN = '#1F4A3D';
export const GBB_GREEN_RGB = '31,74,61';
export const GBB_GREEN_DARK = '#163830'; // hover/active state, mirrors how bordeaux buttons darken on press
export const GBB_GREEN_TINT = (opacity: number) => `rgba(${GBB_GREEN_RGB},${opacity})`;
