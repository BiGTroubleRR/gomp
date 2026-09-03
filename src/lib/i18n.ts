import type { Lang } from './gomp-storage';

// Small helper for the common "this raw data item carries en/sk/cz text fields, pick the
// current language's one" pattern, replacing hand-rolled 3-way ternaries scattered across
// pages. Not a replacement for a page's own T/TRANSLATIONS dict lookup — just for per-item
// fields on raw data arrays (e.g. a build's tagline in three languages).
export function pick<T>(lang: Lang, v: { en: T; sk: T; cz: T }): T {
  return v[lang] ?? v.en;
}
