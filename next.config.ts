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

const csp = [
  `default-src 'self'`,
  // 'unsafe-inline' is required for React's style={{...}} props (rendered as
  // style="" attributes) and Next's small inline hydration bootstrap script —
  // there is no external <script src> or <style> loading in this app otherwise.
  // 'unsafe-eval' is dev-only: React's dev-mode call-stack reconstruction uses
  // eval() and is never used in production builds.
  `script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV !== 'production' ? "'unsafe-eval' " : ''}${CLERK_ORIGINS} ${VERCEL_INSIGHTS_SCRIPT}`,
  `style-src 'self' 'unsafe-inline'`,
  // Admin-uploaded product photos are served straight from Supabase Storage's public URL
  // (see src/app/api/admin/upload-image/route.ts's getPublicUrl call) — that host was missing
  // here, which would silently block every product image the moment one was actually rendered.
  `img-src 'self' data: blob: https://img.clerk.com ${SUPABASE_URL}`,
  `font-src 'self' data:`,
  `connect-src 'self' ${CLERK_ORIGINS} https://clerk-telemetry.com ${SUPABASE_URL} ${SUPABASE_WS} ${VERCEL_INSIGHTS_BEACON}`,
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
    optimizePackageImports: ['three', '@clerk/nextjs'],
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
