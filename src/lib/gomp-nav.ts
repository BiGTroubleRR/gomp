import { flushSync } from 'react-dom';

// Shared nav order + direction, single source of truth for every page's transitions.
// Mirrors gomp-nav.js's NAV_ORDER/FUNNEL_INDEX from the static site, translated to Next.js
// route paths. Since Next.js App Router navigation never does a real cross-document load,
// direction is resolved here (client-side, at click time) rather than via the Navigation
// API's pagereveal event.

// A same-document View Transition that gets superseded by another one before it finishes
// (e.g. a second nav-triggering click, or React re-rendering mid-transition) rejects its
// `ready`/`finished` promises with "Transition was aborted because of invalid state" — this
// is expected browser behavior, not a bug, but left unhandled it surfaces as a scary dev-
// overlay error. Mirrors gomp-nav.js's own unhandledrejection guard for the equivalent
// cross-document "Transition was skipped" case.
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (e) => {
    const msg = String(e.reason);
    if (msg.indexOf('Transition was skipped') !== -1 || msg.indexOf('aborted because of invalid state') !== -1) {
      e.preventDefault();
    }
  });
}

export const NAV_ORDER = ['/', '/shop', '/build', '/about', '/account'];

const FUNNEL_INDEX: Record<string, number> = {
  '/benchmarks': 2.5, // after Configurator(2), before About(3)
  '/checkout': 2.75, // after Benchmarks, still before About(3)
  '/admin': 10, // out-of-flow utility area — leaving it always reads as 'back'
};

function resolveIdx(path: string): number {
  const clean = path.split('?')[0].split('#')[0];
  const idx = NAV_ORDER.indexOf(clean);
  if (idx !== -1) return idx;
  if (clean in FUNNEL_INDEX) return FUNNEL_INDEX[clean];
  return -1;
}

type ViewTransitionLike = {
  types?: { add: (t: string) => void };
  ready: Promise<void>;
  finished: Promise<void>;
  updateCallbackDone: Promise<void>;
};

type DocumentWithViewTransitions = Document & {
  startViewTransition?: (cb: () => void) => ViewTransitionLike;
};

// Runs `navigate` inside a same-document View Transition, tagging it 'gomp-forward' or
// 'gomp-backward' by comparing route order — same visual language (slide + fade, ease-out-
// expo) as the original cross-document transitions, just same-document since Next.js's
// client-side router never does a real page load.
export function navigateWithTransition(fromPath: string, toPath: string, navigate: () => void) {
  const doc = document as DocumentWithViewTransitions;
  if (!doc.startViewTransition) {
    navigate();
    return;
  }
  const fromIdx = resolveIdx(fromPath);
  const toIdx = resolveIdx(toPath);
  const dir = fromIdx !== -1 && toIdx !== -1 ? (toIdx > fromIdx ? 'gomp-forward' : 'gomp-backward') : null;
  // startViewTransition captures its "new" screenshot right after this callback returns —
  // but router.push() only *schedules* the route's re-render, it doesn't wait for it. Left
  // alone, the browser grabs the "new" snapshot while the old page is still on screen, plays
  // the whole slide/fade animation on that stale frame, and only then does the real page
  // content pop in unanimated — that pop is exactly the flash/jitter this was producing.
  // flushSync forces the router's state update (and React's commit) to finish synchronously
  // before we return, so the snapshot the browser captures is already the real new page.
  const transition = doc.startViewTransition(() => {
    flushSync(navigate);
  });
  if (dir && transition.types) {
    try {
      transition.types.add(dir);
    } catch {}
  }
  // A React Router route change resolves over several ticks (RSC fetch, render, commit) —
  // longer than the View Transition API expects its callback to take. When that happens (or
  // a second transition interrupts this one), `ready`/`finished`/`updateCallbackDone` reject
  // with "aborted because of invalid state". That's harmless — the navigation itself still
  // completes — but an unhandled rejection reads as a hard error. Swallow it at the source
  // rather than relying solely on the window-level unhandledrejection guard above, since
  // that guard can't control whether other listeners (e.g. a dev error overlay) also fire.
  transition.ready.catch(() => {});
  transition.finished.catch(() => {});
  transition.updateCallbackDone.catch(() => {});
}

export function ownIndex(pathname: string): number {
  return resolveIdx(pathname);
}
