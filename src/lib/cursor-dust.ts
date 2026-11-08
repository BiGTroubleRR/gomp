// Click animation for primary nav links, ported from gomp-cursor-dust.js: on click, gold/green dust
// converges from the pointer into the clicked element (burstDust), then navigation continues. It used to
// also replace the system cursor with a glowing dot while hovering a link; that was removed — the cursor is
// never changed, only the click animation remains.
'use client';

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let ready = false;
let enabled = true;
const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;

function resize() {
  if (!canvas || !ctx) return;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function initCursorDust() {
  if (ready || typeof document === 'undefined') return;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  enabled = !reduced;
  if (reduced) return;
  ready = true;

  canvas = document.createElement('canvas');
  canvas.id = 'gomp-dust-canvas';
  canvas.style.cssText = 'position:fixed;inset:0;z-index:2147483646;pointer-events:none;';
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
}

const COLORS = ['#C4A35A', '#C4A35A', '#3FAE74'];
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

// Cursor dissolves into fine dust that converges into targetEl's bounds, then `done()` fires
// once, guaranteed, even if rAF stalls — so navigation never hangs or double-fires.
export function burstDust(e: MouseEvent, targetEl: HTMLElement, done: () => void) {
  initCursorDust();
  if (!enabled || !ctx) {
    done();
    return;
  }
  const cx = e.clientX;
  const cy = e.clientY;
  const rect = targetEl.getBoundingClientRect();
  const N = 14;
  const DUR = 420;
  const particles = Array.from({ length: N }, (_, i) => ({
    x0: cx + (Math.random() - 0.5) * 6,
    y0: cy + (Math.random() - 0.5) * 6,
    x1: rect.left + Math.random() * Math.max(rect.width, 1),
    y1: rect.top + Math.random() * Math.max(rect.height, 1),
    size: 1.6 + Math.random() * 2.6,
    color: COLORS[i % COLORS.length],
    delay: Math.random() * 70,
    alphaPeak: 0.55 + Math.random() * 0.35,
  }));
  const start = Date.now();
  let fired = false;

  targetEl.style.transition = 'box-shadow 0.4s ease-out';
  targetEl.style.boxShadow = '0 0 0 3px rgba(196,163,90,0.35), 0 0 18px 4px rgba(196,163,90,0.25)';
  setTimeout(() => {
    targetEl.style.boxShadow = '';
  }, DUR + 60);

  function finish() {
    if (fired) return;
    fired = true;
    if (ctx) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    done();
  }

  function frame() {
    if (!ctx) return;
    const elapsed = Date.now() - start;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    let allDone = true;
    particles.forEach((p) => {
      const pt = Math.max(0, Math.min(1, (elapsed - p.delay) / (DUR - p.delay)));
      if (pt < 1) allDone = false;
      if (elapsed < p.delay) return;
      const ee = easeOutCubic(pt);
      const x = p.x0 + (p.x1 - p.x0) * ee;
      const y = p.y0 + (p.y1 - p.y0) * ee;
      const alpha = pt < 0.75 ? p.alphaPeak : p.alphaPeak * (1 - (pt - 0.75) / 0.25);
      ctx!.save();
      ctx!.globalAlpha = Math.max(0, alpha);
      ctx!.shadowColor = p.color;
      ctx!.shadowBlur = 6;
      ctx!.fillStyle = p.color;
      ctx!.beginPath();
      ctx!.arc(x, y, p.size, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.restore();
    });
    if (!allDone) requestAnimationFrame(frame);
    else finish();
  }
  requestAnimationFrame(frame);
  setTimeout(finish, DUR + 70);
}

export function isDustEnabled() {
  return enabled;
}
