'use client';

import { useEffect, useMemo, useState } from 'react';
import { readJSON } from '@/lib/gomp-storage';
import { effectiveSitePriceCzk, type Component } from '@/lib/component-db-seed';
import { useSite } from '@/contexts/SiteContext';

type StoredBuild = {
  selected?: Record<string, boolean>;
  selections?: Record<string, string>;
  compDb?: Record<string, Component[]>;
} | null;

// The site has no live cart: the only persisted build is `gomp_build`, written by /build when the
// visitor clicks "continue to benchmarks" and read back by /checkout. The header's cart widget is a
// read-only summary of that payload — selected-part count + the VAT-inclusive total — so it stays
// "0 / 0 Kč" until a build has actually been saved. `routeKey` re-reads on navigation; the storage /
// focus / visibility listeners cover other tabs and returning to the page.
export function useCartSummary(routeKey: string): { count: number; totalCzk: number } {
  const { vatRatePct } = useSite();
  const [stored, setStored] = useState<StoredBuild>(null);

  useEffect(() => {
    const read = () => setStored(readJSON<StoredBuild>('gomp_build', null));
    read();
    window.addEventListener('storage', read);
    window.addEventListener('focus', read);
    document.addEventListener('visibilitychange', read);
    return () => {
      window.removeEventListener('storage', read);
      window.removeEventListener('focus', read);
      document.removeEventListener('visibilitychange', read);
    };
  }, [routeKey]);

  return useMemo(() => {
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
  }, [stored, vatRatePct]);
}
