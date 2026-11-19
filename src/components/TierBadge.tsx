// Small square S/A/B badge, shared across /build (per-component tier chips), the prebuilt
// GOMP listings (home page, /shop, /customer-builds), and Admin's Builds tab — previously defined
// privately inside src/app/build/page.tsx, extracted here so those other pages don't duplicate it.
import { TIER_COLORS, type Tier } from '@/lib/passmark';

// `size` (px) overrides small/normal for places where the tier is a headline fact (the build listings).
export default function TierBadge({ tier, small, size }: { tier?: Tier; small?: boolean; size?: number }) {
  if (!tier) return null;
  const c = TIER_COLORS[tier];
  const sz = size ?? (small ? 18 : 22);
  return (
    <div
      style={{
        width: sz, height: sz, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: c.bg, color: c.text, border: `${size ? 2 : 1.5}px solid ${c.border}`, borderRadius: size ? 5 : 3,
        fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: size ? Math.round(size * 0.52) : small ? 11 : 12,
      }}
    >
      {tier}
    </div>
  );
}
