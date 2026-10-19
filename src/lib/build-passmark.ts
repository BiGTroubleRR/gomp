import { passmarkLookup, tierFromPassmark, type Tier } from '@/lib/passmark';
import { gpuModelFor, type ComponentDb } from '@/lib/component-db-seed';

export type PassmarkDisplay = { score: number; tier: Tier; url?: string };

// A chip with a real score but no curated permalink (most CPUs, and any GPU chip passmark.ts
// hasn't hand-curated) still deserves a working "Verify" link rather than none at all — this
// points at PassMark's own search for that chip name instead of a specific cached page/id, since
// we don't have a verified permalink for it.
function fallbackPassmarkUrl(name: string, isGpu: boolean): string {
  const base = isGpu ? 'https://www.videocardbenchmark.net/gpu.php' : 'https://www.cpubenchmark.net/cpu.php';
  const param = isGpu ? 'gpu' : 'cpu';
  return `${base}?${param}=${encodeURIComponent(name)}`;
}

// Resolves a display PassMark for any GPU/CPU name, not just the ~25 canonical chips
// passmark.ts curates aliases for. A board-partner SKU ("MSI GeForce RTX 5080 16G GAMING TRIO
// OC GDDR7") never appears in that curated alias list itself, so this first tries the same
// chip-model extraction /build's own GPU picker already uses (gpuModelFor) to resolve it to its
// chip's curated score — that also gives a real, verified permalink. Failing that (no curated
// entry for this chip at all, e.g. most CPUs), it falls back to whatever passmark/tier the
// catalog row itself already carries (real data from the eD import), with a best-effort search
// link standing in for a verified permalink we don't have. Shared by /shop and the homepage.
export function resolvePassmark(name: string, isGpu: boolean, compDb: ComponentDb): PassmarkDisplay | null {
  const key = isGpu ? (gpuModelFor(name) ?? name) : name;
  const curated = passmarkLookup(key);
  if (curated) return { score: curated.score, tier: tierFromPassmark(isGpu, curated.score), url: curated.url };
  const stored = (compDb[isGpu ? 'gpu' : 'cpu'] || []).find((c) => c.name === name);
  if (stored?.passmark != null) {
    return {
      score: stored.passmark,
      tier: stored.tier ?? tierFromPassmark(isGpu, stored.passmark),
      url: stored.passmarkUrl ?? fallbackPassmarkUrl(key, isGpu),
    };
  }
  return null;
}
