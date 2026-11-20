import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { DM_Sans } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import ClerkThemeProvider from '@/components/ClerkThemeProvider';
import './globals.css';
import { SiteProvider } from '@/contexts/SiteContext';
import { langForHost } from '@/lib/gomp-storage';
import { DeviceViewProvider } from '@/contexts/DeviceViewContext';
import { AuthProvider } from '@/contexts/AuthContext';
import CursorDustMount from '@/components/CursorDustMount';
import RouteSettle from '@/components/RouteSettle';
import PhoneFrame from '@/components/PhoneFrame';

// One typeface for the whole site: DM Sans, the same as the homepage. The older display (Nova Square) and
// monospace (JetBrains Mono) faces are gone; --font-serif and --font-mono still exist as CSS variables —
// ~140 call sites and the design tokens read them — but globals.css points both at --font-sans, so
// headings, logos, labels and numbers all render in DM Sans.
const dmSans = DM_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});
// gomp.cz and gomp.sk each get their own language (page text, <html lang>, meta description); any other host
// (the vercel.app address, localhost) keeps the English description and the Slovak default.
async function hostLang() {
  const h = await headers();
  return langForHost(h.get('x-forwarded-host') ?? h.get('host'));
}

export async function generateMetadata(): Promise<Metadata> {
  const lang = await hostLang();
  return {
    title: 'GOMP',
    description:
      lang === 'cz'
        ? 'Herní počítače stavěné pro vás přesně podle vašich požadavků.'
        : lang === 'sk'
          ? 'Herné počítače stavané pre vás presne podľa vašich požiadaviek.'
          : 'Gaming PCs built for you, to your exact specifications.',
  };
}

// Explicit rather than relying on the App Router's implicit default (which is the same
// width=device-width, initial-scale=1 this produces) — makes the mobile viewport a deliberate,
// visible decision instead of an unverified assumption, and viewportFit: 'cover' is the one-line
// prerequisite for any future fixed element (e.g. /build's own sticky mobile CTA bar) that needs
// to respect a notched phone's safe area via env(safe-area-inset-*), at zero cost today since
// nothing currently reads that.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const lang = await hostLang();
  return (
    <html lang={lang === 'cz' ? 'cs' : 'sk'} className={dmSans.variable}>
      <body>
        {/* SiteProvider wraps Clerk so the sign-in window can follow the site's language */}
        <SiteProvider initialLang={lang ?? 'sk'}>
          <ClerkThemeProvider>
            <AuthProvider>
              <DeviceViewProvider>
                <PhoneFrame>{children}</PhoneFrame>
                <CursorDustMount />
                <RouteSettle />
              </DeviceViewProvider>
            </AuthProvider>
          </ClerkThemeProvider>
        </SiteProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
