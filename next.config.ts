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
  `img-src 'self' data: blob: https://img.clerk.com`,
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
