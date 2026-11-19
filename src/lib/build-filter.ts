// Pure helpers behind /build's component search and budget filter. No React, no three.js: plain functions
// of data, so the picker lists, the search box and the budget cap all agree (and can be tested with
// `npm test`). Prices here are always the customer-facing, VAT-inclusive figure the cards show
// (effectiveSitePriceCzk — it respects an Admin price override), never the stored net price.
import {
  caseFitsFormFactor,
  effectiveSitePriceCzk,
  fitsInCase,
  type Category,
  type Component,
} from './component-db-seed';

export type Picks = Partial<Record<Category, Component>>;
export type Catalog = Partial<Record<Category, Component[]>>;

// The eight categories a complete build needs (fans aren't a pick — they ship with the case).
export const BUDGET_SLOTS: Category[] = ['mobo', 'cpu', 'cooler', 'ram', 'gpu', 'storage', 'psu', 'case'];

// ---- search ---------------------------------------------------------------------------------------------

// Lower-case and drop accents, so "gigabyte", "Skriňa" and "skrina" all match the way people type them.
export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

// Every word of the query must appear somewhere in the part's name, spec line or structured fields
// (socket, form factor, DDR generation and speed, case size), in any order: "rtx 5080 gigabyte" and
// "ddr5 6400" both work.
export function matchesQuery(comp: Component, query: string): boolean {
  const words = normalizeText(query).split(/[\s,]+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = normalizeText(
    [
      comp.name,
      comp.specs,
      comp.category,
      comp.socket,
      comp.formFactor,
      comp.ramGeneration ? `ddr${comp.ramGeneration}` : '',
      comp.ramSpeedMhz ? String(comp.ramSpeedMhz) : '',
    ]
      .filter(Boolean)
      .join(' '),
  );
  return words.every((w) => haystack.includes(w));
}

export function searchComponents<T extends Component>(list: T[], query: string): T[] {
  return query.trim() ? list.filter((c) => matchesQuery(c, query)) : list;
}

// ---- hard compatibility ---------------------------------------------------------------------------------

// The parts of `category` that can physically go with what is already picked: CPU and board must share a
// socket, and the case must take the board's form factor and every picked GPU / cooler / PSU. UI-only
// filters (manufacturer, socket chips, DDR generation, case size tab…) are NOT applied here — they stay in
// the page — so this is the full set the budget reserve can draw on.
export function compatibleCandidates(category: Category, catalog: Catalog, picks: Picks): Component[] {
  const list = catalog[category] || [];
  switch (category) {
    case 'case': {
      let out = list;
      if (picks.mobo?.formFactor) out = out.filter((c) => caseFitsFormFactor(c.category, picks.mobo?.formFactor));
      (['gpu', 'cooler', 'psu'] as const).forEach((other) => {
        const pick = picks[other];
        if (pick) out = out.filter((c) => fitsInCase(other, pick, c));
      });
      return out;
    }
    case 'cpu':
      return picks.mobo?.socket ? list.filter((c) => c.socket === picks.mobo?.socket) : list;
    case 'gpu':
    case 'cooler':
    case 'psu':
      return picks.case ? list.filter((c) => fitsInCase(category, c, picks.case)) : list;
    case 'mobo': {
      let out = list;
      if (picks.cpu?.socket) out = out.filter((c) => c.socket === picks.cpu?.socket);
      if (picks.case?.category) out = out.filter((c) => caseFitsFormFactor(picks.case?.category, c.formFactor));
      return out;
    }
    default:
      return list;
  }
}

// ---- budget ---------------------------------------------------------------------------------------------

export function priceGross(comp: Component, vatRatePct: number): number {
  return effectiveSitePriceCzk(comp, vatRatePct);
}

// The most a part of `category` may cost and still leave a complete build possible inside the budget:
//   budget − fans paid for − every OTHER picked part − the cheapest compatible part of each category that
//   is still empty.
// The reserve for empty categories is the point: without it an expensive CPU would swallow the budget and
// leave nothing for the GPU. The category's own current pick is excluded, so swapping a part is judged
// against what the swap would cost. Can be negative (the rest of the build already overruns the budget).
export function budgetCapFor(
  category: Category,
  opts: { budgetGross: number; catalog: Catalog; picks: Picks; vatRatePct: number; extraSpendGross?: number },
): number {
  const { budgetGross, catalog, picks, vatRatePct, extraSpendGross = 0 } = opts;
  let cap = budgetGross - extraSpendGross;
  for (const other of BUDGET_SLOTS) {
    if (other === category) continue;
    const pick = picks[other];
    if (pick) {
      cap -= priceGross(pick, vatRatePct);
      continue;
    }
    const candidates = compatibleCandidates(other, catalog, picks);
    if (candidates.length) cap -= Math.min(...candidates.map((c) => priceGross(c, vatRatePct)));
  }
  return cap;
}

// Splits a list into what fits under `cap` and how many were hidden. `keep` exempts parts that must always
// stay visible (the one currently picked).
export function applyBudgetCap<T extends Component>(
  list: T[],
  cap: number,
  vatRatePct: number,
  keep?: (c: T) => boolean,
): { shown: T[]; hidden: number } {
  const shown: T[] = [];
  let hidden = 0;
  for (const c of list) {
    if (keep?.(c) || priceGross(c, vatRatePct) <= cap) shown.push(c);
    else hidden++;
  }
  return { shown, hidden };
}
