'use client';

import { useEffect, useState } from 'react';

// Defaults to `false` (desktop) so server and first client render match — the real value is
// adopted from matchMedia on mount, same pattern as SiteContext's lang/currency hydration.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)');
}

export function useIsPhone(): boolean {
  return useMediaQuery('(max-width: 480px)');
}
