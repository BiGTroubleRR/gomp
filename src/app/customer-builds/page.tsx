'use client';

import { useEffect, useState } from 'react';
import { useSite } from '@/contexts/SiteContext';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import Reveal from '@/components/Reveal';
import { useIsMobile } from '@/lib/use-media-query';
import { fetchCustomerBuilds, subscribeCustomerBuilds } from '@/lib/supabase/customer-builds';
import type { CustomerBuild } from '@/lib/supabase/customer-build-mapping';

const INK = '#1C1C1A';
const MUTED = '#7A7469';
const MAROON = '#6E1423';
const PAGE_BG = '#F5F0E6';
const PANEL = '#FDFAF4';

const T = {
  en: {
    eyebrow: 'ZÁKAZNÍCKE GOMPY',
    title: 'Real builds, already delivered.',
    intro: 'A look at PCs we’ve already put together for real customers — the exact parts, the exact specs.',
    empty: 'No builds to show yet — check back soon.',
  },
  sk: {
    eyebrow: 'ZÁKAZNÍCKE GOMPY',
    title: 'Reálne zostavy, ktoré už bežia.',
    intro: 'Pohľad na počítače, ktoré sme už poskladali pre skutočných zákazníkov — presné súčiastky, presné parametre.',
    empty: 'Zatiaľ tu nie sú žiadne zostavy — pozrite sa neskôr.',
  },
} as const;

export default function CustomerBuildsPage() {
  const { lang, fmt } = useSite();
  const isMobile = useIsMobile();
  const t = T[lang === 'sk' ? 'sk' : 'en'];

  const [builds, setBuilds] = useState<CustomerBuild[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchCustomerBuilds().then((data) => {
      if (!cancelled) setBuilds(data);
    });
    const unsubscribe = subscribeCustomerBuilds(() => {
      fetchCustomerBuilds().then((data) => {
        if (!cancelled) setBuilds(data);
      });
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const live = builds.filter((b) => b.isLive);

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG }}>
      <SiteNav />

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: isMobile ? '32px 20px 60px' : '56px 32px 90px' }}>
        <Reveal>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, color: MAROON, letterSpacing: 1.2, marginBottom: 10 }}>
            {t.eyebrow}
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: isMobile ? 30 : 42, color: INK, margin: '0 0 14px', lineHeight: 1.1 }}>
            {t.title}
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: MUTED, maxWidth: 620, marginBottom: 40, lineHeight: 1.6 }}>
            {t.intro}
          </p>
        </Reveal>

        {live.length === 0 && (
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: MUTED, padding: '40px 0' }}>{t.empty}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {live.map((b, i) => (
            <Reveal key={b.id} delay={Math.min(i, 4) * 60}>
              <div
                style={{
                  background: PANEL,
                  border: '0.5px solid rgba(28,28,26,0.12)',
                  borderRadius: 2,
                  padding: isMobile ? 20 : 28,
                  display: 'flex',
                  gap: 28,
                  alignItems: 'center',
                  flexWrap: isMobile ? 'wrap' : 'nowrap',
                }}
              >
                {b.imageUrl && (
                  <div style={{ flexShrink: 0, width: isMobile ? '100%' : 220, display: 'flex', justifyContent: 'center' }}>
                    <img
                      src={b.imageUrl}
                      alt={b.title}
                      className="gomp-float-photo"
                      style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }}
                    />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 600, color: INK }}>{b.title}</div>
                  {b.customerLabel && (
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: MUTED, marginTop: 3 }}>{b.customerLabel}</div>
                  )}
                  {b.specs && (
                    <div style={{ marginTop: 14 }}>
                      {b.specs.split('\n').map((line, li) =>
                        line.trim() === '' ? (
                          <div key={li} style={{ height: 8 }} />
                        ) : (
                          line.split(' · ').map((s, si) => (
                            <div
                              key={`${li}-${si}`}
                              style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-mono)', fontSize: 12.5, color: INK, marginBottom: 6 }}
                            >
                              <span style={{ width: 3, height: 3, borderRadius: '50%', background: MAROON, flexShrink: 0 }} />
                              {s}
                            </div>
                          ))
                        )
                      )}
                    </div>
                  )}
                  {b.priceEur != null && (
                    <div style={{ marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 15, color: MAROON, fontWeight: 600 }}>
                      {fmt(b.priceEur)}
                    </div>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
