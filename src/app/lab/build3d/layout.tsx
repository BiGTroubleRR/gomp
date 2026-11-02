import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Hidden prototype page: unlinked from the site and asked not to be indexed.
export const metadata: Metadata = {
  title: 'Lab · 3D configurator v2',
  robots: { index: false, follow: false },
};

export default function LabLayout({ children }: { children: ReactNode }) {
  return children;
}
