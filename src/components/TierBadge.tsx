// Small square S/A/B badge, shared across /build (per-component tier chips), the prebuilt
// GOMP listings (home page, /shop, /customer-builds), and Admin's Builds tab — previously defined
// privately inside src/app/build/page.tsx, extracted here so those other pages don't duplicate it.
import { TIER_COLORS, type Tier } from '@/lib/passmark';

export default function TierBadge({ tier, small }: { tier?: Tier; small?: boolean }) {
  if (!tier) return null;
  const c = TIER_COLORS[tier];
  const sz = small ? 18 : 22;
  return (
    <div
      style={{
        width: sz, height: sz, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: c.bg, color: c.text, border: `1.5px solid ${c.border}`, borderRadius: 3,
        fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: small ? 10 : 12,
      }}
    >
      {tier}
    </div>
  );
}
