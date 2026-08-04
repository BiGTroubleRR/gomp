import type { Metadata } from 'next';
import { Cormorant_Garamond, DM_Sans, JetBrains_Mono } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import { SiteProvider } from '@/contexts/SiteContext';
import { DeviceViewProvider } from '@/contexts/DeviceViewContext';
import { AuthProvider } from '@/contexts/AuthContext';
import CursorDustMount from '@/components/CursorDustMount';
import PhoneFrame from '@/components/PhoneFrame';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
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
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
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
