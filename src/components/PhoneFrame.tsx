'use client';

import { ReactNode } from 'react';
import { useDeviceView } from '@/contexts/DeviceViewContext';

// When the user forces phone view, constrains the page to a narrow, centered column so it
// actually looks like a phone rather than just a single-column layout stretched across a wide
// desktop window. `transform` establishes a new containing block for descendants, so every
// `position: fixed` element in the app (SiteNav, page overlays, etc.) anchors to this frame
// instead of the real browser viewport — the phone illusion holds even for fixed chrome.
export default function PhoneFrame({ children }: { children: ReactNode }) {
  const { forcePhone } = useDeviceView();

  if (!forcePhone) return <>{children}</>;

  return (
    <div
      style={{
        maxWidth: 428,
        margin: '0 auto',
        minHeight: '100vh',
        position: 'relative',
        transform: 'translateZ(0)',
        boxShadow: '0 0 0 1px rgba(28,28,26,0.1), 0 40px 100px rgba(0,0,0,0.28)',
        background: '#F5F0E6',
      }}
    >
      {children}
    </div>
  );
}
