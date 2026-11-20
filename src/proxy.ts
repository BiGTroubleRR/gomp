import { clerkMiddleware } from '@clerk/nextjs/server';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Clerk owns sign-in/sign-up; this also keeps the Supabase session cookie fresh on every
// navigation so server-side Supabase calls (still used for profiles/orders data) don't see a
// stale session — without it, a session nearing expiry can go stale between client-side
// navigations since those never hit the server.
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
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  await supabase.auth.getUser();

  return response;
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for Clerk's auto-proxy path
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
};
