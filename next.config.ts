import type { NextConfig } from "next";

// Allowed origins, derived from what the app actually talks to (see the security
// review this closes out) and verified by loading every page locally and
// checking the console for CSP violations rather than guessing:
//   - Clerk's dev instance: auth UI, silent-SSO iframe, avatars
//   - This project's own Supabase instance: REST + Realtime websocket
//   - Vercel Speed Insights: loads its script from va.vercel-scripts.com and
//     reports vitals to vitals.vercel-insights.com (neither is same-origin,
//     despite living under a Vercel-owned domain)
// Fonts are self-hosted at build time via next/font, so no fonts.googleapis.com
// entry is needed.
const CLERK_ORIGINS = 'https://*.accounts.dev https://*.clerk.accounts.dev';
const SUPABASE_URL = 'https://ojosovibspcbmwveoled.supabase.co';
const SUPABASE_WS = 'wss://ojosovibspcbmwveoled.supabase.co';
const VERCEL_INSIGHTS_SCRIPT = 'https://va.vercel-scripts.com';
const VERCEL_INSIGHTS_BEACON = 'https://vitals.vercel-insights.com';
// The admin image uploader's background-removal step (@imgly/background-removal, see
// handleImageUpload in src/app/admin/page.tsx) fetches its ONNX model + WASM binary from this
// CDN by default (its own `publicPath` default, not something this app configured) — without it
// in connect-src, that fetch is silently blocked and removeBackground() just rejects, which is
// what "image import isn't working" actually was: no console-visible app error, just a CSP block.
const IMGLY_MODEL_CDN = 'https://staticimgly.com';

const csp = [
  `default-src 'self'`,
  // 'unsafe-inline' is required for React's style={{...}} props (rendered as
  // style="" attributes) and Next's small inline hydration bootstrap script —
  // there is no external <script src> or <style> loading in this app otherwise.
  // 'unsafe-eval' is dev-only: React's dev-mode call-stack reconstruction uses
  // eval() and is never used in production builds. 'wasm-unsafe-eval' is the
  // narrow, WASM-only equivalent (not general eval) and is needed in every
  // environment for onnxruntime-web (used by the background-removal step
  // above) to actually instantiate its WASM module. blob: is that same step's
  // worker/glue script, which onnxruntime-web loads via a blob: URL it builds
  // itself at runtime (not a script this app writes or controls the contents
  // of) rather than a real self-hosted file.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: ${process.env.NODE_ENV !== 'production' ? "'unsafe-eval' " : ''}${CLERK_ORIGINS} ${VERCEL_INSIGHTS_SCRIPT}`,
  `style-src 'self' 'unsafe-inline'`,
  // Admin-uploaded product photos are served straight from Supabase Storage's public URL
  // (see src/app/api/admin/upload-image/route.ts's getPublicUrl call) — that host was missing
  // here, which would silently block every product image the moment one was actually rendered.
  `img-src 'self' data: blob: https://img.clerk.com ${SUPABASE_URL}`,
  `font-src 'self' data:`,
  // blob: here is the same onnxruntime-web worker as script-src's blob: above — once it's
  // actually running, it fetches its own WASM binary back through a blob: URL it created for
  // itself, which counts as a connect-src (not script-src) load.
  `connect-src 'self' blob: ${CLERK_ORIGINS} https://clerk-telemetry.com ${SUPABASE_URL} ${SUPABASE_WS} ${VERCEL_INSIGHTS_BEACON} ${IMGLY_MODEL_CDN}`,
  // blob: workers back the 3D scene's off-main-thread work.
  `worker-src 'self' blob:`,
  `frame-src ${CLERK_ORIGINS}`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
].join('; ');

const nextConfig: NextConfig = {
  // Rewrites named imports from these packages into per-module imports at build time (e.g.
  // `import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'` already does
  // this by hand; this setting gets the same effect automatically for three's and Clerk's own
  // barrel-style exports) so a route that only uses part of a package doesn't pull in the rest.
  experimental: {
    optimizePackageImports: ['three', '@clerk/nextjs', 'motion'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
