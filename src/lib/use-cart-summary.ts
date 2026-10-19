'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { effectiveSitePriceCzk, type Component } from '@/lib/component-db-seed';
import { useSite } from '@/contexts/SiteContext';

type StoredBuild = {
  selected?: Record<string, boolean>;
  selections?: Record<string, string>;
  compDb?: Record<string, Component[]>;
} | null;

const KEY = 'gomp_build';

// The raw saved payload is the external store. Subscribing covers other tabs ('storage'), returning
// to the page ('focus' / 'visibilitychange'); same-tab writes are picked up because every page mounts
// its own header, which reads the snapshot afresh on its first render.
function subscribe(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  window.addEventListener('focus', onChange);
  document.addEventListener('visibilitychange', onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener('focus', onChange);
    document.removeEventListener('visibilitychange', onChange);
  };
}

function getSnapshot(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

const getServerSnapshot = (): string | null => null;

// The site has no live cart: the only persisted build is `gomp_build`, written by /build when the
// visitor clicks "continue to benchmarks" and read back by /checkout. The header's cart widget is a
// read-only summary of that payload — selected-part count + the VAT-inclusive total — so it stays
// "0 / 0 Kč" until a build has actually been saved.
//
// Read through useSyncExternalStore (snapshot = the raw JSON string, which is a stable primitive) so a
// freshly mounted header shows the real count/total in its very first client render instead of
// flashing "0 / 0 Kč" and then jumping when an effect catches up.
export function useCartSummary(): { count: number; totalCzk: number } {
  const { vatRatePct } = useSite();
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return useMemo(() => {
    let stored: StoredBuild = null;
    if (raw) {
      try {
        stored = JSON.parse(raw) as StoredBuild;
      } catch {
        stored = null;
      }
    }
    if (!stored) return { count: 0, totalCzk: 0 };
    const selected = stored.selected || {};
    const selections = stored.selections || {};
    const compDb = stored.compDb || {};
    let count = 0;
    let totalCzk = 0;
    // Same resolution as /checkout's buildItems: the named selection, else the category's first row.
    for (const id of Object.keys(selected)) {
      if (!selected[id]) continue;
      const list = compDb[id] || [];
      const comp = list.find((c) => c.name === selections[id]) || list[0];
      if (!comp) continue;
      count += 1;
      totalCzk += effectiveSitePriceCzk(comp, vatRatePct);
    }
    return { count, totalCzk };
  }, [raw, vatRatePct]);
}
