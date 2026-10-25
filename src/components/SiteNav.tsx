'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import GompHeader from '@/components/home/GompHeader';

// The one shared storefront header (Admin keeps its own admin chrome): the zip's top bar, logo/search/cart
// row and green nav bar — see components/home/GompHeader.tsx and gomp-home.css. `variant="compact"` renders
// only the green bar, used by /build so the 3D configurator keeps its height.
export default function SiteNav({ variant = 'full' }: { variant?: 'full' | 'compact'; cta?: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="gomp-home gomp-chrome">
      <GompHeader active={pathname} variant={variant} />
    </div>
  );
}
