'use client';

import { useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import GompHome from '@/components/home/GompHome';
import { navigateWithTransition } from '@/lib/gomp-nav';
import { PAGE_BG } from '@/lib/design-tokens';

// The homepage: hero slider + promo banners, benefits, featured builds with a live 3D model, price tile +
// 3D-config promo, three ranked lists, values + stats, brand strip — see src/components/home/GompHome.tsx.
// All build data is live (prebuilt_pcs + the component catalog); every element links somewhere real.
export default function Home() {
  const router = useRouter();
  const pathname = usePathname();

  // Warm the configurator up while the visitor is still reading the homepage: the route payload now, the 3D scene code once the
  // browser is idle. By the time "3D config" is clicked there is nothing left to download or compile.
  useEffect(() => {
    router.prefetch('/build');
    const warm = () => {
      void import('@/lib/lab/scene-v2');
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(warm, { timeout: 4000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(warm, 2500);
    return () => window.clearTimeout(t);
  }, [router]);

  // Every "open the 3D configurator" button: the same smooth slide to the left as every other link (no overlay, no wait).
  const startBuilding = useCallback(() => {
    navigateWithTransition(pathname, '/build', () => router.push('/build'));
  }, [pathname, router]);

  return (
    <div style={{ position: 'relative', zIndex: 2, background: PAGE_BG, minHeight: '100vh' }}>
      <GompHome onStartBuilding={startBuilding} />
    </div>
  );
}
