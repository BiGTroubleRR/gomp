'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type DeviceViewContextValue = {
  forcePhone: boolean;
  toggleForcePhone: () => void;
};

const DeviceViewContext = createContext<DeviceViewContextValue | null>(null);

const KEY = 'gomp_force_phone_view';

// Lets the user manually preview the phone layout from a desktop browser, independent of the
// actual window width. Defaults to `false` (normal responsive behavior, matching the real
// viewport via useIsMobile) on server/first paint, then adopts whatever was last chosen —
// same hydration-safe "read on mount" pattern as SiteContext's lang/currency.
export function DeviceViewProvider({ children }: { children: React.ReactNode }) {
  const [forcePhone, setForcePhone] = useState(false);

  useEffect(() => {
    try {
      setForcePhone(localStorage.getItem(KEY) === '1');
    } catch {}
  }, []);

  function toggleForcePhone() {
    setForcePhone((v) => {
      const next = !v;
      try {
        localStorage.setItem(KEY, next ? '1' : '0');
      } catch {}
      return next;
    });
  }

  return <DeviceViewContext.Provider value={{ forcePhone, toggleForcePhone }}>{children}</DeviceViewContext.Provider>;
}

export function useDeviceView() {
  const ctx = useContext(DeviceViewContext);
  if (!ctx) throw new Error('useDeviceView must be used within DeviceViewProvider');
  return ctx;
}
