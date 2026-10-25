'use client';

import GompFooter from '@/components/home/GompFooter';

// The shared full footer used on content pages — the zip's footer, see components/home/GompFooter.tsx.
export default function SiteFooter() {
  return (
    <div className="gomp-home gomp-chrome">
      <GompFooter />
    </div>
  );
}
