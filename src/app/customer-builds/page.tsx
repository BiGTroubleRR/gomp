'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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

// Spec lines are free admin-typed text ("Procesor: Intel Core i9-14900K"), not structured
// {label, value} data — split on the first ':' so the label can be colored/bolded separately
// from the value. A line with no ':' (freeform, no label) returns null and renders unchanged.
function splitSpecLine(s: string): { label: string; value: string } | null {
  const i = s.indexOf(':');
  if (i < 0) return null;
  return { label: s.slice(0, i).trim(), value: s.slice(i + 1).trim() };
}
// Matches the CPU/GPU label spellings admins actually type (Slovak/Czech and English) so those
// two lines can get the extra standout badge — no fixed label template exists to key off instead.
const STANDOUT_LABEL_RE = /procesor|cpu|processor|grafi|gpu|videokart|graphics/i;

const T = {
  en: {
    eyebrow: 'ZÁKAZNÍCKE GOMPY',
    title: 'Real builds, already delivered.',
    intro: 'A look at PCs we’ve already put together for real customers — the exact parts, the exact specs.',
    empty: 'No builds to show yet — check back soon.',
    close: 'Close',
  },
  sk: {
    eyebrow: 'ZÁKAZNÍCKE GOMPY',
    title: 'Reálne zostavy, ktoré už bežia.',
    intro: 'Pohľad na počítače, ktoré sme už poskladali pre skutočných zákazníkov — presné súčiastky, presné parametre.',
    empty: 'Zatiaľ tu nie sú žiadne zostavy — pozrite sa neskôr.',
    close: 'Zavrieť',
  },
  cz: {
    eyebrow: 'ZÁKAZNICKÉ GOMPY',
    title: 'Reálné sestavy, které už běží.',
    intro: 'Pohled na počítače, které jsme už poskládali pro skutečné zákazníky — přesné součástky, přesné parametry.',
    empty: 'Zatím tu nejsou žádné sestavy — zkuste to prosím později.',
    close: 'Zavřít',
  },
} as const;

// Pulls the GPU/CPU line out of a build's specs so it can float as its own bubble instead
// of sitting in the plain list — matches by label prefix (before the first ":"), tolerant
// of minor phrasing since specs is admin-typed free text. Returns null (no bubble, specs
// list unchanged) when a build's specs don't have a clearly labeled GPU/CPU line.
const GPU_KEYWORDS = ['grafick', 'gpu'];
const CPU_KEYWORDS = ['procesor', 'cpu'];

function extractLabeledLine(specs: string, keywords: string[]): { line: string; value: string } | null {
  for (const rawLine of specs.split('\n')) {
    const line = rawLine.trim();
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const label = line.slice(0, colon).toLowerCase();
    if (keywords.some((k) => label.includes(k))) {
      return { line: rawLine, value: line.slice(colon + 1).trim() };
    }
  }
  return null;
}

// GPU/CPU floating badges, visually inspired by the homepage hero's floating pill badges
// (see src/app/page.tsx's STRESS TESTED / RTX 5090 · 32GB DDR5 badges) — same pill shape,
// two-tone palette, and small colored dot, bobbing via Motion (this file's own animation
// tool, rather than importing the homepage's raw CSS keyframes). Each bubble's horizontal
// jitter is randomized once per build (memoized on its id) so cards don't all look uniform,
// while staying stable across re-renders within the same page load.
function SpecBubble({
  value,
  tone,
  edge,
  seed,
  isMobile,
}: {
  value: string;
  tone: 'panel' | 'maroon';
  edge: 'top' | 'bottom';
  seed: string;
  isMobile: boolean;
}) {
  const jitter = useMemo(() => {
    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    return { offset: rand(-10, 6), inset: rand(16, isMobile ? 60 : 100), duration: 7 + rand(0, 1.5) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, isMobile]);

  const panelTone = tone === 'panel';

  return (
    <motion.div
      animate={{ y: [0, edge === 'top' ? -6 : 6, 0] }}
      transition={{ repeat: Infinity, duration: jitter.duration, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        [edge]: jitter.offset,
        [edge === 'top' ? 'left' : 'right']: jitter.inset,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        borderRadius: 30,
        background: panelTone ? 'rgba(253,250,244,0.94)' : 'rgba(110,20,35,0.95)',
        backdropFilter: panelTone ? 'blur(6px)' : undefined,
        border: panelTone ? '0.5px solid rgba(28,28,26,0.14)' : '0.5px solid rgba(255,255,255,0.18)',
        boxShadow: '0 16px 32px -14px rgba(28,28,26,0.22)',
        zIndex: 5,
        width: 'max-content',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: panelTone ? MAROON : '#E8A9B4', flexShrink: 0 }} />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: 0.5,
          color: panelTone ? MAROON : PAGE_BG,
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </span>
    </motion.div>
  );
}

// Front photo carries the shared layoutId that the fullscreen gallery's active photo also
// uses — Motion morphs it from this stacked position into the big centered view on open, and
// back again on close, regardless of which photo is showing in the gallery when it closes.
const STACK_OFFSETS = [
  { x: 0, y: 0, r: 0 },
  { x: 14, y: 10, r: 6 },
  { x: -14, y: 18, r: -7 },
];

function PhotoStack({
  buildId,
  title,
  imageUrls,
  isMobile,
  onOpen,
}: {
  buildId: string;
  title: string;
  imageUrls: string[];
  isMobile: boolean;
  onOpen: () => void;
}) {
  if (imageUrls.length === 0) return null;

  if (imageUrls.length === 1) {
    return (
      <div style={{ flexShrink: 0, width: isMobile ? '100%' : 220, display: 'flex', justifyContent: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrls[0]}
          alt={title}
          className="gomp-float-photo"
          style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }}
        />
      </div>
    );
  }

  const layers = imageUrls.slice(0, 3);

  return (
    <motion.div
      onClick={onOpen}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        flexShrink: 0,
        width: isMobile ? '100%' : 220,
        height: 200,
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      {layers
        .map((url, i) => ({ url, i }))
        .reverse()
        .map(({ url, i }) => {
          const o = STACK_OFFSETS[i];
          return (
            <motion.div
              key={url}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                x: o.x,
                y: o.y,
                rotate: o.r,
                zIndex: 10 - i,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <motion.img
                layoutId={i === 0 ? `cbphoto-${buildId}` : undefined}
                src={url}
                alt={title}
                style={{
                  maxWidth: '78%',
                  maxHeight: '78%',
                  objectFit: 'contain',
                  filter: i === 0 ? 'drop-shadow(0 12px 20px rgba(28,28,26,0.25))' : 'drop-shadow(0 6px 12px rgba(28,28,26,0.18))',
                }}
              />
            </motion.div>
          );
        })}
      {imageUrls.length > 3 && (
        <div
          style={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            zIndex: 11,
            padding: '2px 7px',
            borderRadius: 10,
            background: MAROON,
            color: PANEL,
            fontFamily: 'var(--font-mono)',
            fontSize: 10.5,
            fontWeight: 700,
          }}
        >
          +{imageUrls.length - 3}
        </div>
      )}
    </motion.div>
  );
}

function PhotoGallery({
  build,
  index,
  direction,
  isMobile,
  closeLabel,
  onClose,
  onStep,
}: {
  build: CustomerBuild;
  index: number;
  direction: number;
  isMobile: boolean;
  closeLabel: string;
  onClose: () => void;
  onStep: (delta: number) => void;
}) {
  const photos = build.imageUrls;
  const arrowStyle: CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 44,
    height: 44,
    borderRadius: '50%',
    border: '0.5px solid rgba(253,250,244,0.35)',
    background: 'rgba(253,250,244,0.08)',
    color: PANEL,
    fontSize: 20,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(28,28,26,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? 20 : 60,
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label={closeLabel}
        style={{
          position: 'absolute',
          top: 20,
          right: isMobile ? 20 : 32,
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '0.5px solid rgba(253,250,244,0.35)',
          background: 'rgba(253,250,244,0.08)',
          color: PANEL,
          fontSize: 15,
          cursor: 'pointer',
        }}
      >
        ✕
      </button>

      {photos.length > 1 && !isMobile && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStep(-1);
          }}
          style={{ ...arrowStyle, left: 24 }}
        >
          ‹
        </button>
      )}

      <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <AnimatePresence mode="wait">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <motion.img
            key={index}
            layoutId={`cbphoto-${build.id}`}
            src={photos[index]}
            alt={build.title}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 40 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ maxWidth: isMobile ? '90vw' : '80vw', maxHeight: isMobile ? '65vh' : '75vh', objectFit: 'contain', borderRadius: 2 }}
          />
        </AnimatePresence>
        {photos.length > 1 && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(253,250,244,0.7)' }}>
            {index + 1} / {photos.length}
          </div>
        )}
        {photos.length > 1 && isMobile && (
          <div style={{ display: 'flex', gap: 20 }}>
            <button onClick={() => onStep(-1)} style={{ ...arrowStyle, position: 'static' }}>‹</button>
            <button onClick={() => onStep(1)} style={{ ...arrowStyle, position: 'static' }}>›</button>
          </div>
        )}
      </div>

      {photos.length > 1 && !isMobile && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStep(1);
          }}
          style={{ ...arrowStyle, right: 24 }}
        >
          ›
        </button>
      )}
    </motion.div>
  );
}

export default function CustomerBuildsPage() {
  const { lang, fmt } = useSite();
  const isMobile = useIsMobile();
  const t = T[lang] ?? T.en;

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

  const [gallery, setGallery] = useState<{ buildId: string; index: number } | null>(null);
  const [direction, setDirection] = useState(1);
  const galleryBuild = gallery ? live.find((b) => b.id === gallery.buildId) ?? null : null;

  function closeGallery() {
    setGallery(null);
  }

  function stepGallery(delta: number) {
    setDirection(delta);
    setGallery((g) => {
      if (!g) return g;
      const build = live.find((b) => b.id === g.buildId);
      const len = build?.imageUrls.length ?? 1;
      return { ...g, index: (g.index + delta + len) % len };
    });
  }

  useEffect(() => {
    if (!gallery) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeGallery();
      else if (e.key === 'ArrowRight') stepGallery(1);
      else if (e.key === 'ArrowLeft') stepGallery(-1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gallery]);

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG }}>
      <SiteNav />

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: isMobile ? '56px 20px 60px' : '84px 32px 90px' }}>
        <Reveal>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 600, fontStyle: 'italic', color: MAROON, letterSpacing: 1.5, marginBottom: 12 }}>
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
          {live.map((b, i) => {
            const gpu = extractLabeledLine(b.specs, GPU_KEYWORDS);
            const cpu = extractLabeledLine(b.specs, CPU_KEYWORDS);
            return (
              <Reveal key={b.id} delay={Math.min(i, 4) * 60}>
                <div
                  style={{
                    position: 'relative',
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
                  {gpu && <SpecBubble value={gpu.value} tone="panel" edge="top" seed={`${b.id}-gpu`} isMobile={isMobile} />}
                  {cpu && <SpecBubble value={cpu.value} tone="maroon" edge="bottom" seed={`${b.id}-cpu`} isMobile={isMobile} />}
                  <PhotoStack
                    buildId={b.id}
                    title={b.title}
                    imageUrls={b.imageUrls}
                    isMobile={isMobile}
                    onOpen={() => setGallery({ buildId: b.id, index: 0 })}
                  />
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
                            line.split(' · ').map((s, si) => {
                              const parsed = splitSpecLine(s);
                              const isStandout = !!parsed && STANDOUT_LABEL_RE.test(parsed.label);
                              return (
                                <div
                                  key={`${li}-${si}`}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 7,
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 12.5,
                                    color: INK,
                                    marginBottom: 6,
                                    ...(isStandout && {
                                      background: 'rgba(110,20,35,0.07)',
                                      border: '1px solid rgba(110,20,35,0.18)',
                                      borderRadius: 6,
                                      padding: '4px 8px',
                                    }),
                                  }}
                                >
                                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: MAROON, flexShrink: 0 }} />
                                  {parsed ? (
                                    <span>
                                      <span style={{ color: MAROON, fontWeight: 700 }}>{parsed.label}:</span> {parsed.value}
                                    </span>
                                  ) : (
                                    s
                                  )}
                                </div>
                              );
                            })
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
            );
          })}
        </div>
      </div>

      <SiteFooter />

      <AnimatePresence>
        {galleryBuild && gallery && (
          <PhotoGallery
            build={galleryBuild}
            index={gallery.index}
            direction={direction}
            isMobile={isMobile}
            closeLabel={t.close}
            onClose={closeGallery}
            onStep={stepGallery}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
