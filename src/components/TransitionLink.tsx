'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MouseEvent, ReactNode, CSSProperties } from 'react';
import { isSameLocation, isSamePathOtherQuery, navigateWithTransition } from '@/lib/gomp-nav';
import { burstDust, isDustEnabled } from '@/lib/cursor-dust';

const isExternal = (href: string) => /^(https?:)?\/\/|^mailto:|^tel:/i.test(href);

// The one link used for every in-site navigation: warms the route up on hover/focus, then slides the old page away to the left
// (View Transition, see src/lib/gomp-nav.ts). The cursor-dust burst plays alongside the slide instead of delaying it.
export default function TransitionLink({
  href,
  children,
  className,
  style,
  onClick,
  onMouseEnter,
  onMouseLeave,
  ariaLabel,
  ariaCurrent,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  ariaLabel?: string;
  ariaCurrent?: 'page' | undefined;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function warm() {
    if (!isExternal(href)) router.prefetch(href);
  }

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    // new tab / window, external links and modified clicks keep their native behaviour
    if (isExternal(href) || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (isSameLocation(href)) return;
    onClick?.();
    if (isSamePathOtherQuery(href)) {
      router.push(href); // same page, new query (shop filters, ...): nothing to slide
      return;
    }
    if (isDustEnabled()) burstDust(e.nativeEvent, e.currentTarget, () => {});
    navigateWithTransition(pathname, href, () => router.push(href));
  }

  return (
    <Link
      href={href}
      className={className}
      style={style}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      data-gomp-nav="1"
      onClick={handleClick}
      onMouseEnter={() => {
        warm();
        onMouseEnter?.();
      }}
      onFocus={warm}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </Link>
  );
}
