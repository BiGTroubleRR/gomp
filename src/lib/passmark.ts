// Shared PassMark score table for GPU/CPU components — the only two categories PassMark
// actually rates. Ported from gomp-passmark.js; refreshed daily on the original site by a
// scheduled PowerShell task. Every place that displays a PassMark score/tier should resolve
// it through lookup() rather than trusting a persisted value, so a stale stored score is only
// ever a fallback for a name this table doesn't track.

export const PASSMARK_UPDATED = '2026-07-31';

type Entry = { score: number; url: string; names: string[] };

const GPU: Entry[] = [
  { score: 38952, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5090&id=5725', names: ['NVIDIA RTX 5090 FE', 'RTX 5090 FE', 'NVIDIA RTX 5090', 'RTX 5090'] },
  { score: 38045, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4090&id=4606', names: ['NVIDIA RTX 4090', 'RTX 4090'] },
  { score: 34229, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4080+SUPER&id=4984', names: ['NVIDIA RTX 4080 Super', 'RTX 4080 Super'] },
  { score: 31831, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4070+Ti+SUPER&id=4980', names: ['NVIDIA RTX 4070 Ti Super', 'RTX 4070 Ti Super'] },
  { score: 29940, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4070+SUPER&id=4973', names: ['NVIDIA RTX 4070 Super', 'RTX 4070 Super'] },
  { score: 26874, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4070&id=4795', names: ['NVIDIA RTX 4070', 'RTX 4070'] },
];

const CPU: Entry[] = [
  { score: 65732, url: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+9950X&id=6211', names: ['AMD Ryzen 9 9950X', 'Ryzen 9 9950X'] },
  { score: 58262, url: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i9-14900K&id=5717', names: ['Intel Core i9-14900K', 'Core i9-14900K'] },
  { score: 60010, url: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i9-14900KS&id=5957', names: ['Intel Core i9-14900KS', 'Core i9-14900KS'] },
  { score: 51956, url: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i7-14700K&id=5719', names: ['Intel Core i7-14700K', 'Core i7-14700K'] },
];

type Index = Record<string, { score: number; url: string }>;

function buildIndex(list: Entry[]): Index {
  const idx: Index = {};
  list.forEach((entry) => {
    entry.names.forEach((n) => {
      idx[n] = { score: entry.score, url: entry.url };
    });
  });
  return idx;
}

export const GPU_INDEX = buildIndex(GPU);
export const CPU_INDEX = buildIndex(CPU);

export function passmarkLookup(name: string): { score: number; url: string } | null {
  return GPU_INDEX[name] || CPU_INDEX[name] || null;
}

export type Tier = 'S' | 'A' | 'B' | 'C' | 'D';

export function tierFromPassmark(isGpu: boolean, score: number): Tier {
  if (isGpu) {
    if (score >= 36000) return 'S';
    if (score >= 30000) return 'A';
    if (score >= 27000) return 'B';
    if (score >= 24000) return 'C';
    return 'D';
  }
  if (score >= 63000) return 'S';
  if (score >= 55000) return 'A';
  if (score >= 45000) return 'B';
  if (score >= 30000) return 'C';
  return 'D';
}

export const TIER_COLORS: Record<Tier, { bg: string; text: string; border: string }> = {
  S: { bg: '#FFF8CC', text: '#7A5500', border: '#D4A017' },
  A: { bg: '#F2E6FF', text: '#5B1A8B', border: '#9B59B6' },
  B: { bg: '#E6FAF0', text: '#1A6B3A', border: '#27AE60' },
  C: { bg: '#E6F4FF', text: '#1A5A80', border: '#3498DB' },
  D: { bg: '#F2F2F6', text: '#505060', border: '#9090A0' },
};
