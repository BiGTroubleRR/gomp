import type { Metadata } from 'next';
import { DM_Sans, JetBrains_Mono, Nova_Square } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import { SiteProvider } from '@/contexts/SiteContext';
import { DeviceViewProvider } from '@/contexts/DeviceViewContext';
import { AuthProvider } from '@/contexts/AuthContext';
import CursorDustMount from '@/components/CursorDustMount';
import PhoneFrame from '@/components/PhoneFrame';

// Was Cormorant Garamond — switched to Nova Square (per request) as the site's display/heading
// font. Kept the same CSS variable name (--font-serif) rather than renaming it everywhere it's
// used, even though "serif" no longer literally describes Nova Square's blocky, geometric look.
// Nova Square ships only a single weight (400) and no italic style on Google Fonts, unlike
// Cormorant — any `fontStyle: 'italic'` paired with this variable needs removing at the call site,
// since Nova Square has no real italic to fall back to (the browser would fake-slant it, which
// looks bad on a geometric display face).
const novaSquare = Nova_Square({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-serif',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GOMP · Bordeaux',
  description: 'Hand-built gaming PCs configured to your exact specifications.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sk" className={`${novaSquare.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
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
      </body>
    </html>
  );
}
