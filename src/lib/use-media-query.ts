'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useDeviceView } from '@/contexts/DeviceViewContext';

// Reads matchMedia through useSyncExternalStore: the server snapshot is `false` (desktop), so the
// server HTML and the hydration render agree, but every client-side navigation mounts the new page
// with the REAL value already in its first render — no desktop-layout flash before an effect corrects
// it (which is what used to make the header jump on every page change below the breakpoint).
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
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
