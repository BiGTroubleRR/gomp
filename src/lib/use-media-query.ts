'use client';

import { useEffect, useState } from 'react';
import { useDeviceView } from '@/contexts/DeviceViewContext';

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

// The real viewport check, OR'd with the user's manual "preview phone view" override from the
// DeviceViewToggle icon — every page's responsive layout reads this one hook, so the override
// affects the whole site without each page needing its own logic.
export function useIsMobile(): boolean {
  const real = useMediaQuery('(max-width: 768px)');
  const { forcePhone } = useDeviceView();
  return real || forcePhone;
}

export function useIsPhone(): boolean {
  return useMediaQuery('(max-width: 480px)');
}
