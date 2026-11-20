// One transition engine for the whole site: every in-site navigation slides the old page away to the left (a same-document
// View Transition, CSS in globals.css) while the top menu stays put.
//
// The important part: the transition callback does NOT return until the new route has really been committed
// (RouteSettle, mounted in the root layout, reports it). The browser takes its "new page" snapshot only after the callback's
// promise resolves, so the slide always reveals the finished page instead of the old one with content popping in afterwards.
//
// Events (on window) for heavy pages / viewers:
//   gomp:navstart — a transition begins (pause animations on the page that is leaving)
//   gomp:navend   — the slide finished (start heavy work on the page that arrived: WebGL scene, realtime, ...)

if (typeof window !== 'undefined') {
  // A same-document View Transition that gets superseded rejects its promises with "aborted because of invalid state" /
  // "Transition was skipped" — expected browser behaviour, but unhandled it shows up as a scary dev overlay error.
  window.addEventListener('unhandledrejection', (e) => {
    const msg = String(e.reason);
    if (msg.indexOf('Transition was skipped') !== -1 || msg.indexOf('aborted because of invalid state') !== -1) {
      e.preventDefault();
    }
  });
}

type ViewTransitionLike = {
  ready: Promise<void>;
  finished: Promise<void>;
  updateCallbackDone: Promise<void>;
};

type DocumentWithViewTransitions = Document & {
  startViewTransition?: (cb: () => void | Promise<void>) => ViewTransitionLike;
};

const SETTLE_TIMEOUT_MS = 1400;

let waiter: { path: string; resolve: () => void } | null = null;
let navigating = false;
let navEndWaiters: Array<() => void> = [];

const cleanPath = (p: string) => p.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';

// Called by <RouteSettle/> after every committed route change.
export function reportRouteCommitted(pathname: string) {
  if (!waiter || waiter.path !== cleanPath(pathname)) return;
  const w = waiter;
  waiter = null;
  // two frames: let React paint the new route's first layout before the browser captures it
  requestAnimationFrame(() => requestAnimationFrame(() => w.resolve()));
}

function waitForRoute(toPath: string): Promise<void> {
  return new Promise<void>((resolve) => {
    waiter = { path: cleanPath(toPath), resolve };
    window.setTimeout(() => {
      if (waiter && waiter.resolve === resolve) waiter = null;
      resolve();
    }, SETTLE_TIMEOUT_MS);
  });
}

function endNavigation() {
  navigating = false;
  const list = navEndWaiters;
  navEndWaiters = [];
  list.forEach((fn) => fn());
  window.dispatchEvent(new Event('gomp:navend'));
}

// Resolves right away when no transition is running, otherwise when the slide has finished (with a safety timeout).
export function afterNavTransition(timeoutMs = 900): Promise<void> {
  if (typeof window === 'undefined' || !navigating) return Promise.resolve();
  return new Promise<void>((resolve) => {
    let done = false;
    const fin = () => {
      if (done) return;
      done = true;
      resolve();
    };
    navEndWaiters.push(fin);
    window.setTimeout(fin, timeoutMs);
  });
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Runs `navigate` (a router.push) inside the slide transition. Same-page and unsupported-browser cases navigate directly.
export function navigateWithTransition(fromPath: string, toPath: string, navigate: () => void) {
  const doc = document as DocumentWithViewTransitions;
  if (!doc.startViewTransition || prefersReducedMotion() || cleanPath(fromPath) === cleanPath(toPath)) {
    navigate();
    return;
  }
  navigating = true;
  window.dispatchEvent(new Event('gomp:navstart'));
  const transition = doc.startViewTransition(async () => {
    const committed = waitForRoute(toPath);
    navigate();
    await committed;
  });
  transition.ready.catch(() => {});
  transition.updateCallbackDone.catch(() => {});
  transition.finished.catch(() => {}).finally(endNavigation);
}

// Same page or same page with another query string: nothing to slide.
export function isSameLocation(href: string): boolean {
  if (typeof window === 'undefined') return false;
  const u = new URL(href, window.location.origin);
  return u.pathname === window.location.pathname && u.search === window.location.search;
}

export function isSamePathOtherQuery(href: string): boolean {
  if (typeof window === 'undefined') return false;
  const u = new URL(href, window.location.origin);
  return cleanPath(u.pathname) === cleanPath(window.location.pathname) && u.search !== window.location.search;
}
