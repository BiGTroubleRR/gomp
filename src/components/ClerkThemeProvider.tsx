'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { csCZ, enUS, skSK } from '@clerk/localizations';
import { useSite } from '@/contexts/SiteContext';
import {
  ACCENT,
  ACCENT_FILL,
  ACCENT_GRADIENT,
  BORDER,
  BORDER_STRONG,
  GOLD,
  INK,
  MUTED,
  ON_ACCENT,
  PANEL_BG,
  SURFACE_ALT,
  SURFACE_RAISED,
} from '@/lib/design-tokens';

// Clerk (sign-in / sign-up window, account menu) dressed in the site's own look: the dark green panel surface, cream text,
// the green accent for buttons, DM Sans, the same near-square corners, the gold GOMP logo on top, and the window in the
// visitor's language (Slovak / Czech / English, following the site's language switch).
// Note: Clerk's own "Development mode" badge and the *.accounts.dev address disappear only with a production Clerk
// instance on a custom domain (accounts.gomp.sk) — that is a Clerk dashboard setting, not something styling can change.
const FONT = "var(--font-sans), 'DM Sans', system-ui, sans-serif";

export default function ClerkThemeProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useSite();
  return (
    <ClerkProvider
      localization={lang === 'cz' ? csCZ : lang === 'sk' ? skSK : enUS}
      appearance={{
        options: {
          logoImageUrl: '/brand/gomp-logo-horizontal-gold-on-dark.svg',
          logoLinkUrl: '/',
          logoPlacement: 'inside',
          socialButtonsPlacement: 'bottom', // e-mail first, Google (optional) below
          socialButtonsVariant: 'blockButton',
          shimmer: true,
        },
        variables: {
          colorPrimary: ACCENT_FILL,
          colorBackground: PANEL_BG,
          colorInput: SURFACE_ALT,
          colorInputForeground: INK,
          colorForeground: INK,
          colorMutedForeground: MUTED,
          colorMuted: SURFACE_RAISED,
          colorBorder: BORDER_STRONG,
          colorPrimaryForeground: ON_ACCENT,
          colorModalBackdrop: 'rgba(5,9,7,0.72)',
          colorNeutral: INK, // Clerk derives borders / hover tints from this, so it must be light on a dark surface
          colorDanger: '#E5675B',
          colorSuccess: ACCENT,
          colorWarning: GOLD,
          fontFamily: FONT,
          fontFamilyButtons: FONT,
          borderRadius: '0.25rem',
        },
        elements: {
          cardBox: { boxShadow: '0 24px 60px -20px rgba(0,0,0,0.7)', border: `1px solid ${BORDER}` },
          card: { background: PANEL_BG },
          headerTitle: { fontWeight: 600, letterSpacing: '-0.01em' },
          formButtonPrimary: {
            background: ACCENT_GRADIENT,
            color: ON_ACCENT,
            fontWeight: 600,
            boxShadow: 'none',
            '&:hover, &:focus, &:active': { background: ACCENT_FILL },
          },
          socialButtonsBlockButton: {
            background: SURFACE_RAISED,
            border: `1px solid ${BORDER_STRONG}`,
            color: INK,
            '&:hover': { background: SURFACE_ALT },
          },
          formFieldInput: { background: SURFACE_ALT, border: `1px solid ${BORDER_STRONG}`, color: INK },
          footerActionLink: { color: ACCENT, fontWeight: 600, '&:hover': { color: GOLD } },
          dividerLine: { background: BORDER },
          userButtonPopoverCard: { background: PANEL_BG, border: `1px solid ${BORDER}` },
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
