'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { reportRouteCommitted } from '@/lib/gomp-nav';

// Tells the transition engine (src/lib/gomp-nav.ts) that a route change has been committed, so the View Transition can capture
// the finished new page. Renders nothing.
export default function RouteSettle() {
  const pathname = usePathname();
  useEffect(() => {
    reportRouteCommitted(pathname);
  }, [pathname]);
  return null;
}
