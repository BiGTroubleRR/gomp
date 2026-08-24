// "Build Complete PC" used to just fill every empty slot with whatever the catalog happened to
// list first (see findComp's `list[0]` fallback in build/page.tsx) — no price, no performance,
// no compatibility beyond a couple of hand-rolled fit checks. This module is the actual
// budget -> parts logic: given a target spend and the live catalog, pick a mutually-compatible
// set of components that tries to spend the money where it buys the most.
//
// Deliberately framework-free (no React, no three.js) so it stays a plain, testable function of
// data — build/page.tsx is the only caller, and just applies the result through its existing
// selectCard/toggleComponent plumbing.
import {
  type Category,
  type Component,
  caseFitsFormFactor,
  fitsInCase,
  extractWatts,
  BASE_WATTS,
  moboRamGeneration,
} from './component-db-seed';

// Common budget breakpoints for the slider to snap to, the same "snap to real values, not 1-unit
// steps" convention already used by the RAM min-speed slider — a round, recognizable number
// ("€1500") reads as an intentional choice in a way "€1487" doesn't.
export const BUDGET_STEPS = [600, 800, 1000, 1200, 1500, 1800, 2200, 2600, 3200, 4000, 5000, 6000];

// How a budget splits across categories before any part is picked. GPU/CPU get the largest
// shares since they're what "performance" mostly means to a buyer; case/PSU get enough to
// guarantee something safe and physically fitting rather than the cheapest possible unit.
const BUDGET_SPLIT: Record<Category, number> = {
  gpu: 0.3,
  cpu: 0.2,
  case: 0.1,
  mobo: 0.1,
  psu: 0.08,
  ram: 0.08,
  storage: 0.07,
  cooler: 0.07,
  // Fans aren't auto-picked — they default to whichever a case ships pre-installed with (see the
  // Case Fans panel in /build), so they get no budget share of their own here.
  fan: 0,
};

// PSU headroom over the estimated draw — a real build should never run a PSU near its rated
// limit continuously.
const PSU_HEADROOM = 1.2;

const TIER_RANK: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };

export type AutoBuildNote =
  | { code: 'psu_over_budget' }
  | { code: 'case_over_budget' }
  | { code: 'no_psu_sufficient' }
  | { code: 'no_case_fits' }
  | { code: 'category_empty'; category: Category };

export type AutoBuildResult = {
  // Only the categories this run actually picked — a category the caller already had selected
  // is left untouched and simply absent here (see `locked` below).
  selections: Partial<Record<Category, string>>;
  totalPrice: number;
  notes: AutoBuildNote[];
};

// PassMark/tier/speed aren't uniformly populated — most bulk-imported catalog rows have neither
// a PassMark match nor a curated tier (see the import scripts' `tier: null`), only the original
// hand-curated GPU/CPU rows and RAM's real ramSpeedMhz field do. Missing signals fall through to
// the next rung rather than being treated as "worst": a real metric beats a tier, a tier beats
// nothing, and with nothing at all a pricier part in the same category is the best guess.
function candidateRank(id: Category, comp: Component): { metric: number | null; tier: number | null } {
  const metric =
    id === 'gpu' || id === 'cpu'
      ? comp.passmark ?? null
      : id === 'ram'
        ? comp.ramSpeedMhz ?? null
        : null;
  return { metric, tier: comp.tier ? TIER_RANK[comp.tier] ?? null : null };
}

function compareCandidates(id: Category, a: Component, b: Component): number {
  const ra = candidateRank(id, a);
  const rb = candidateRank(id, b);
  if (ra.metric != null || rb.metric != null) return (rb.metric ?? -Infinity) - (ra.metric ?? -Infinity);
  if (ra.tier != null || rb.tier != null) return (rb.tier ?? -Infinity) - (ra.tier ?? -Infinity);
  // No signal at all: within one category, a pricier SKU is the best available guess at "better".
  return b.price - a.price;
}

// Picks the best-ranked candidate affordable within `budget`; if nothing at all fits, relaxes
// to the full candidate list rather than leaving the slot empty (a tiny budget still needs a
// working PC, just flagged as having gone over its slice).
function pickBest(id: Category, candidates: Component[], budget: number): { pick: Component | null; wentOverBudget: boolean } {
  if (!candidates.length) return { pick: null, wentOverBudget: false };
  const affordable = candidates.filter((c) => c.price <= budget);
  if (affordable.length) {
    const sorted = [...affordable].sort((a, b) => compareCandidates(id, a, b));
    return { pick: sorted[0] ?? null, wentOverBudget: false };
  }
  // Nothing in this category fits the slice at all (a very tight budget, or a category with a
  // high price floor) — take the *cheapest* option on file rather than "the best regardless of
  // price": ranking the full, unfiltered list by performance would hand a tiny budget its most
  // expensive flagship part, which is the opposite of what going over budget should mean here.
  const cheapest = [...candidates].sort((a, b) => a.price - b.price)[0];
  return { pick: cheapest ?? null, wentOverBudget: true };
}

export function autoBuildForBudget(
  budgetEur: number,
  compDb: Partial<Record<Category, Component[]>>,
  // Categories the caller already has picked — treated as fixed inputs for compatibility
  // (e.g. an already-chosen CPU's socket drives the motherboard pick) and excluded from both
  // the output and the budget split, so re-running this never disturbs a manual choice.
  locked: Partial<Record<Category, Component>> = {},
): AutoBuildResult {
  const notes: AutoBuildNote[] = [];
  const picks: Partial<Record<Category, Component>> = { ...locked };

  const emptyIds = (Object.keys(BUDGET_SPLIT) as Category[]).filter((id) => !locked[id]);
  const lockedSpend = Object.values(locked).reduce((sum, c) => sum + (c?.price ?? 0), 0);
  const remainingBudget = Math.max(0, budgetEur - lockedSpend);
  const emptySplitTotal = emptyIds.reduce((sum, id) => sum + BUDGET_SPLIT[id], 0) || 1;
  function budgetFor(id: Category): number {
    return Math.round(remainingBudget * (BUDGET_SPLIT[id] / emptySplitTotal));
  }
  function need(id: Category): boolean {
    return emptyIds.includes(id);
  }

  // 1. CPU — fixes the socket every other compatible part downstream keys off.
  if (need('cpu')) {
    const list = compDb.cpu || [];
    if (!list.length) notes.push({ code: 'category_empty', category: 'cpu' });
    const { pick } = pickBest('cpu', list, budgetFor('cpu'));
    if (pick) picks.cpu = pick;
  }

  // 2. Motherboard — matching socket, and its own DDR generation (read from specs) drives RAM.
  if (need('mobo')) {
    const list = compDb.mobo || [];
    const socket = picks.cpu?.socket;
    const compatible = socket ? list.filter((c) => c.socket === socket) : list;
    const pool = compatible.length ? compatible : list;
    if (!pool.length) notes.push({ code: 'category_empty', category: 'mobo' });
    const { pick } = pickBest('mobo', pool, budgetFor('mobo'));
    if (pick) picks.mobo = pick;
  }

  // 3. RAM — matching the motherboard's DDR generation when it's known.
  if (need('ram')) {
    const list = compDb.ram || [];
    const gen = moboRamGeneration(picks.mobo);
    const compatible = gen ? list.filter((c) => c.ramGeneration === gen) : list;
    const pool = compatible.length ? compatible : list;
    if (!pool.length) notes.push({ code: 'category_empty', category: 'ram' });
    const { pick } = pickBest('ram', pool, budgetFor('ram'));
    if (pick) picks.ram = pick;
  }

  // 4. GPU — picked by budget/performance alone; the case is fitted around it afterwards
  // rather than the other way round, so a size constraint never caps the GPU pick first.
  if (need('gpu')) {
    const list = compDb.gpu || [];
    if (!list.length) notes.push({ code: 'category_empty', category: 'gpu' });
    const { pick } = pickBest('gpu', list, budgetFor('gpu'));
    if (pick) picks.gpu = pick;
  }

  // 5. Cooler — soft-filtered to the CPU's socket when a cooler's own specs text names one
  // (many do, e.g. "AM5/LGA1700"); falls back to the full list rather than excluding everything
  // when no cooler's text happens to mention it.
  if (need('cooler')) {
    const list = compDb.cooler || [];
    const socket = picks.cpu?.socket;
    const compatible = socket ? list.filter((c) => c.specs.includes(socket)) : [];
    const pool = compatible.length ? compatible : list;
    if (!pool.length) notes.push({ code: 'category_empty', category: 'cooler' });
    const { pick } = pickBest('cooler', pool, budgetFor('cooler'));
    if (pick) picks.cooler = pick;
  }

  // 6. PSU — wattage safety is non-negotiable, so it filters *before* budget/tier ranking, and
  // budget only bends (not the wattage floor) if nothing sufficient fits the slice.
  if (need('psu')) {
    const list = compDb.psu || [];
    const draw =
      (extractWatts(picks.cpu?.specs ?? '') ?? 0) +
      (extractWatts(picks.gpu?.specs ?? '') ?? 0) +
      (BASE_WATTS.mobo ?? 0) +
      (BASE_WATTS.ram ?? 0) +
      (BASE_WATTS.storage ?? 0) +
      (BASE_WATTS.cooler ?? 0);
    const required = Math.ceil(draw * PSU_HEADROOM);
    const sufficient = list.filter((c) => (extractWatts(c.specs) ?? 0) >= required);
    if (!list.length) {
      notes.push({ code: 'category_empty', category: 'psu' });
    } else if (!sufficient.length) {
      // Nothing in the catalog covers the estimated draw with headroom — take the highest-
      // wattage unit available rather than one that's technically insufficient.
      notes.push({ code: 'no_psu_sufficient' });
      const highest = [...list].sort((a, b) => (extractWatts(b.specs) ?? 0) - (extractWatts(a.specs) ?? 0))[0];
      if (highest) picks.psu = highest;
    } else {
      const { pick, wentOverBudget } = pickBest('psu', sufficient, budgetFor('psu'));
      if (wentOverBudget) notes.push({ code: 'psu_over_budget' });
      if (pick) picks.psu = pick;
    }
  }

  // 7. Case — picked last and by fit, not by value: it's a constraint-satisfaction step (does
  // everything already chosen physically fit) rather than a performance pick.
  if (need('case')) {
    const list = compDb.case || [];
    const fitting = list.filter(
      (c) =>
        caseFitsFormFactor(c.category, picks.mobo?.formFactor) &&
        (!picks.gpu || fitsInCase('gpu', picks.gpu, c)) &&
        (!picks.cooler || fitsInCase('cooler', picks.cooler, c)) &&
        (!picks.psu || fitsInCase('psu', picks.psu, c)),
    );
    if (!list.length) {
      notes.push({ code: 'category_empty', category: 'case' });
    } else if (!fitting.length) {
      // Nothing fits every already-picked part at once — take the roomiest case on file
      // (largest GPU clearance) rather than leave the build without a case at all.
      notes.push({ code: 'no_case_fits' });
      const roomiest = [...list].sort((a, b) => (b.maxGpuLengthMm ?? 0) - (a.maxGpuLengthMm ?? 0))[0];
      if (roomiest) picks.case = roomiest;
    } else {
      const { pick, wentOverBudget } = pickBest('case', fitting, budgetFor('case'));
      if (wentOverBudget) notes.push({ code: 'case_over_budget' });
      if (pick) picks.case = pick;
    }
  }

  // 8. Storage — no cross-part constraints in this catalog.
  if (need('storage')) {
    const list = compDb.storage || [];
    if (!list.length) notes.push({ code: 'category_empty', category: 'storage' });
    const { pick } = pickBest('storage', list, budgetFor('storage'));
    if (pick) picks.storage = pick;
  }

  const selections: Partial<Record<Category, string>> = {};
  let totalPrice = 0;
  emptyIds.forEach((id) => {
    const comp = picks[id];
    if (!comp) return;
    selections[id] = comp.name;
    totalPrice += comp.price;
  });

  return { selections, totalPrice, notes };
}
