'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MouseEvent, ReactNode, CSSProperties } from 'react';
import { navigateWithTransition, ownIndex } from '@/lib/gomp-nav';
import { burstDust, isDustEnabled } from '@/lib/cursor-dust';

// Shared nav-link click handler: no-ops on the current page, plays the cursor-dust burst
// then a same-document View Transition, mirroring the original site's cross-document
// transitions + gomp-cursor-dust.js burst-then-navigate handoff.
export default function TransitionLink({
  href,
  children,
  className,
  style,
  onClick,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (ownIndex(href) !== -1 && ownIndex(href) === ownIndex(pathname)) return;
    onClick?.();
    const target = e.currentTarget;
    const go = () => navigateWithTransition(pathname, href, () => router.push(href));
    if (isDustEnabled()) burstDust(e.nativeEvent, target, go);
    else go();
  }

  return (
    <Link href={href} className={className} style={style} data-gomp-nav="1" onClick={handleClick}>
      {children}
    </Link>
  );
}
