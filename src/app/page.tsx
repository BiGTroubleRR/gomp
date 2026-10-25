'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import GompHome from '@/components/home/GompHome';
import { navigateWithTransition } from '@/lib/gomp-nav';
import { useIsMobile } from '@/lib/use-media-query';
import { GOLD, PAGE_BG } from '@/lib/design-tokens';

// The homepage: hero slider + promo banners, benefits, featured builds with a live 3D model, price tile +
// 3D-config promo, three ranked lists, values + stats, brand strip — see src/components/home/GompHome.tsx.
// All build data is live (prebuilt_pcs + the component catalog); every element links somewhere real.
export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const [swiping, setSwiping] = useState(false);
  const swipingRef = useRef(false);
  const swipeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (swipeTimer.current) clearTimeout(swipeTimer.current);
    },
    [],
  );

  // Every "open the 3D configurator" button plays the same green swipe, then lands on /build.
  function startBuilding() {
    if (swipingRef.current) return;
    swipingRef.current = true;
    setSwiping(true);
    swipeTimer.current = setTimeout(() => {
      navigateWithTransition(pathname, '/build', () => router.push('/build'));
    }, 750);
  }

  return (
    <>
      <style>{`
        @keyframes gompSwipeIn { from { transform:translateX(100%); } to { transform:translateX(0); } }
        @keyframes gompLetterSpin {
          0%   { transform:rotateY(70deg); opacity:0; }
          60%  { transform:rotateY(-8deg); opacity:1; }
          100% { transform:rotateY(0deg); opacity:1; }
        }
      `}</style>

      <div style={{ position: 'relative', zIndex: 2, background: PAGE_BG, minHeight: '100vh' }}>
        <SiteNav />
        <main>
          <GompHome onStartBuilding={startBuilding} />
        </main>
        <div style={{ height: isMobile ? 48 : 72 }} />
        <SiteFooter />

        {/* ---- Swipe overlay ---- */}
        {swiping && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'radial-gradient(circle at 50% 45%, #1F8A55 0%, #0F5C3A 55%, #0A4129 100%)',
              pointerEvents: 'all',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              animation: 'gompSwipeIn 0.55s cubic-bezier(.16,1,.3,1) both',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: 640, height: 640, margin: '-320px 0 0 -320px', border: '0.5px solid rgba(196,163,90,0.22)', borderRadius: '50%', animation: 'gompRotateSlow 8s linear infinite' }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: 420, height: 420, margin: '-210px 0 0 -210px', border: '0.5px solid rgba(196,163,90,0.32)', borderRadius: '50%', animation: 'gompRotateSlowRev 6s linear infinite' }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: 960, height: 960, margin: '-480px 0 0 -480px', background: 'radial-gradient(circle, rgba(196,163,90,0.16) 0%, transparent 60%)', animation: 'gompGlowPulse 2.2s ease-in-out infinite' }} />
              <div style={{ position: 'absolute', top: '62%', left: '20%', width: 6, height: 6, borderRadius: '50%', background: GOLD, boxShadow: '0 0 10px 3px rgba(196,163,90,0.55)', animation: 'gompEmberRise 1.6s ease-out infinite' }} />
              <div style={{ position: 'absolute', top: '70%', left: '68%', width: 4, height: 4, borderRadius: '50%', background: '#9FE0BC', boxShadow: '0 0 8px 2px rgba(159,224,188,0.5)', animation: 'gompEmberRise 1.9s 0.2s ease-out infinite' }} />
              <div style={{ position: 'absolute', top: '55%', left: '80%', width: 5, height: 5, borderRadius: '50%', background: GOLD, boxShadow: '0 0 9px 2px rgba(196,163,90,0.5)', animation: 'gompEmberRise 1.4s 0.35s ease-out infinite' }} />
              <div style={{ position: 'absolute', top: '78%', left: '40%', width: 3, height: 3, borderRadius: '50%', background: '#9FE0BC', animation: 'gompEmberRise 2.1s 0.1s ease-out infinite' }} />
              <div style={{ position: 'absolute', top: '32%', left: '14%', width: 4, height: 4, borderRadius: '50%', background: GOLD, boxShadow: '0 0 8px 2px rgba(196,163,90,0.5)', animation: 'gompEmberRise 1.7s 0.5s ease-out infinite' }} />
              <div style={{ position: 'absolute', top: '28%', left: '86%', width: 5, height: 5, borderRadius: '50%', background: '#9FE0BC', animation: 'gompEmberRise 1.5s 0.25s ease-out infinite' }} />
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 38, fontWeight: 600, letterSpacing: 2, color: GOLD, display: 'flex', perspective: 400, position: 'relative', zIndex: 1 }}>
              {['G', 'O', 'M', 'P'].map((ch, i) => (
                <span key={ch} style={{ display: 'inline-block', animation: `gompLetterSpin 0.42s ${0.05 + i * 0.08}s cubic-bezier(0.34,1.56,0.64,1) both` }}>
                  {ch}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
