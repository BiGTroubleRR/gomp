'use client';

import { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react';

// Keys already revealed this session — prevents re-animating content a re-render brings back
// (e.g. a language switch), same intent as gomp-scroll-reveal.js's `seen` map.
const seen = new Set<string>();

export default function Reveal({
  children,
  revealKey,
  delay = 0,
  className,
  style,
}: {
  children: ReactNode;
  revealKey?: string;
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => (revealKey ? seen.has(revealKey) : false));

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setVisible(true);
      if (revealKey) seen.add(revealKey);
      return;
    }

    const reveal = () => {
      setVisible(true);
      if (revealKey) seen.add(revealKey);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal();
            io.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);

    // Safety net for instant scroll jumps that skip the intersection threshold entirely.
    let queued = false;
    function checkScroll() {
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top <= window.innerHeight) {
        reveal();
        io.disconnect();
      }
    }
    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        checkScroll();
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    checkScroll();

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <div
      ref={ref}
      className={`gomp-reveal${visible ? ' gomp-revealed' : ''}${className ? ` ${className}` : ''}`}
      style={{ ...style, transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
