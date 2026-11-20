'use client';

import { useEffect, useRef } from 'react';
import { hexToRgba } from '@/lib/design-tokens';

// A small deep-space scene that plays behind a card's content while the card is hovered: three depth layers of
// twinkling stars drifting diagonally, a breathing nebula in the card's tier colour and an occasional shooting star.
// It is a plain 2D canvas (no WebGL context per card). The canvas always exists but only animates while `active`
// (plus a short fade-out), and the animation loop is cancelled otherwise — an idle card costs nothing. With
// `prefers-reduced-motion` it draws one still starfield instead of a loop.
// The card must establish its own stacking context (`position: relative; zIndex: 0`) so the canvas can sit at zIndex -1.
type Star = { x: number; y: number; r: number; speed: number; a: number; phase: number; rate: number; rgb: string };
type Shot = { x: number; y: number; life: number };

const PALETTE = ['223,232,255', '223,232,255', '223,232,255', '170,200,255', '255,236,200', '190,255,215'];
const FADE_MS = 320;

export default function CardSpace({ color, active, maxFps }: { color: string; active: boolean; maxFps?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const ctl = useRef<{ start: () => void; stop: () => void } | null>(null);

  // set up the canvas once (and when the tier colour changes)
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let shot: Shot | null = null;
    let nextShot = 1.2;
    let t = 0;
    let raf = 0;
    let running = false;
    let last = 0;
    const minGap = maxFps ? 1000 / maxFps - 2 : 0;

    const seed = () => {
      const n = Math.max(55, Math.min(130, Math.round((w * h) / 4200)));
      stars = Array.from({ length: n }, () => {
        const depth = 0.3 + Math.random() * 0.7;
        const tinted = Math.random() < 0.08;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.9 + depth * 1.7,
          speed: 5 + depth * 24,
          a: 0.45 + depth * 0.5,
          phase: Math.random() * 6.28,
          rate: 0.8 + Math.random() * 2,
          rgb: tinted ? '255,255,255' : PALETTE[Math.floor(Math.random() * PALETTE.length)],
        };
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      // nebula in the tier colour (+ a cool counter-glow), breathing slowly
      const breath = 0.75 + 0.25 * Math.sin(t * 0.9);
      const g1 = ctx.createRadialGradient(w * 0.78, h * 0.28, 0, w * 0.78, h * 0.28, Math.max(w, h) * 0.75);
      g1.addColorStop(0, hexToRgba(color, 0.3 * breath));
      g1.addColorStop(1, hexToRgba(color, 0));
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);
      const g2 = ctx.createRadialGradient(w * 0.15, h * 0.9, 0, w * 0.15, h * 0.9, Math.max(w, h) * 0.6);
      g2.addColorStop(0, `rgba(70,110,200,${0.16 * breath})`);
      g2.addColorStop(1, 'rgba(70,110,200,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);
      // stars
      for (const s of stars) {
        const tw = 0.6 + 0.4 * Math.sin(t * s.rate + s.phase);
        ctx.fillStyle = `rgba(${s.rgb},${Math.min(0.92, s.a * tw)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.2832);
        ctx.fill();
        if (s.r > 1.9) {
          // the nearest stars get a soft halo
          ctx.fillStyle = `rgba(${s.rgb},${0.16 * tw})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 2.6, 0, 6.2832);
          ctx.fill();
        }
      }
      // shooting star
      if (shot) {
        const p = shot.life / 0.7;
        const hx = shot.x;
        const hy = shot.y;
        const tx = hx + 90;
        const ty = hy - 45;
        const lg = ctx.createLinearGradient(hx, hy, tx, ty);
        lg.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - p)})`);
        lg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = lg;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
    };

    const frame = (now: number) => {
      if (minGap && now - last < minGap) {
        raf = requestAnimationFrame(frame); // too soon: skip this frame (admin backdrop runs at ~24 fps)
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      for (const s of stars) {
        s.x -= s.speed * 0.55 * dt;
        s.y += s.speed * 0.4 * dt;
        if (s.x < -2) s.x = w + 2;
        if (s.y > h + 2) s.y = -2;
      }
      nextShot -= dt;
      if (!shot && nextShot <= 0) {
        shot = { x: w * (0.45 + Math.random() * 0.5), y: h * (0.05 + Math.random() * 0.35), life: 0 };
        nextShot = 2.2 + Math.random() * 1.8;
      }
      if (shot) {
        shot.life += dt;
        shot.x -= 380 * dt;
        shot.y += 190 * dt;
        if (shot.life > 0.7) shot = null;
      }
      draw();
      if (running) raf = requestAnimationFrame(frame);
    };

    const resize = () => {
      w = cv.clientWidth;
      h = cv.clientHeight;
      if (!w || !h) return;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (!running) ctx.clearRect(0, 0, w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    ctl.current = {
      start: () => {
        if (running) return;
        if (reduce) {
          draw(); // one still frame
          return;
        }
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      },
      stop: () => {
        running = false;
        cancelAnimationFrame(raf);
        ctx.clearRect(0, 0, w, h);
      },
    };
    return () => {
      ctl.current = null;
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [color, maxFps]);

  // run only while hovered (plus the fade-out)
  useEffect(() => {
    if (active) {
      ctl.current?.start();
      return;
    }
    const id = window.setTimeout(() => ctl.current?.stop(), FADE_MS);
    return () => window.clearTimeout(id);
  }, [active, color]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
        opacity: active ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    />
  );
}
