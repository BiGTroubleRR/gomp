import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest } from 'next/server';

// Clerk owns sign-in/sign-up (there is no Supabase auth session any more, so nothing to refresh here).
// Sign-in lives on gomp.cz (the Clerk production domain; gomp.sk would need Clerk's paid satellite-domain feature). A visitor
// who opens the account or admin area on gomp.sk is sent to the same page on gomp.cz, keeping their language and currency.
const SK_HOSTS = new Set(['gomp.sk', 'www.gomp.sk']);
const AUTH_PATH = /^\/(account|admin)(\/|$)/;

export default clerkMiddleware(async (_auth, request: NextRequest) => {
  const host = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '').toLowerCase().split(':')[0];
  if (SK_HOSTS.has(host) && AUTH_PATH.test(request.nextUrl.pathname)) {
    const target = new URL(request.nextUrl.pathname + request.nextUrl.search, 'https://www.gomp.cz');
    target.searchParams.set('lang', 'sk');
    target.searchParams.set('cur', 'eur');
    return NextResponse.redirect(target, 307);
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for Clerk's auto-proxy path
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
};
