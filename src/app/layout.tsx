import type { Metadata, Viewport } from 'next';
import { DM_Sans } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import { SiteProvider } from '@/contexts/SiteContext';
import { DeviceViewProvider } from '@/contexts/DeviceViewContext';
import { AuthProvider } from '@/contexts/AuthContext';
import CursorDustMount from '@/components/CursorDustMount';
import PhoneFrame from '@/components/PhoneFrame';

// One typeface for the whole site: DM Sans, the same as the homepage. The older display (Nova Square) and
// monospace (JetBrains Mono) faces are gone; --font-serif and --font-mono still exist as CSS variables —
// ~140 call sites and the design tokens read them — but globals.css points both at --font-sans, so
// headings, logos, labels and numbers all render in DM Sans.
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});
export const metadata: Metadata = {
  title: 'GOMP',
  description: 'Hand-built gaming PCs configured to your exact specifications.',
};

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sk" className={dmSans.variable}>
      <body>
        <ClerkProvider>
          <SiteProvider>
            <AuthProvider>
              <DeviceViewProvider>
                <PhoneFrame>{children}</PhoneFrame>
                <CursorDustMount />
              </DeviceViewProvider>
            </AuthProvider>
          </SiteProvider>
        </ClerkProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
