// Shared PassMark score table for GPU/CPU components — the only two categories PassMark
// actually rates. Ported from gomp-passmark.js; refreshed daily on the original site by a
// scheduled PowerShell task. Every place that displays a PassMark score/tier should resolve
// it through lookup() rather than trusting a persisted value, so a stale stored score is only
// ever a fallback for a name this table doesn't track.

export const PASSMARK_UPDATED = '2026-08-05';

type Entry = { score: number; url: string; names: string[] };

// Top 25 consumer desktop GPUs by PassMark G3D Mark, pulled from
// videocardbenchmark.net/high_end_gpus.html (Desktop) on PASSMARK_UPDATED.
const GPU: Entry[] = [
  { score: 38965, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5090&id=5725', names: ['NVIDIA RTX 5090 FE', 'RTX 5090 FE', 'NVIDIA RTX 5090', 'RTX 5090'] },
  { score: 38039, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4090&id=4606', names: ['NVIDIA RTX 4090', 'RTX 4090'] },
  { score: 35624, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5080&id=5721', names: ['NVIDIA RTX 5080', 'RTX 5080'] },
  { score: 34226, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4080+SUPER&id=4984', names: ['NVIDIA RTX 4080 Super', 'RTX 4080 Super'] },
  { score: 34443, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4080&id=4622', names: ['NVIDIA RTX 4080', 'RTX 4080'] },
  { score: 31443, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+7900+XTX&id=4644', names: ['AMD Radeon RX 7900 XTX', 'Radeon RX 7900 XTX', 'RX 7900 XTX'] },
  { score: 32349, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5070+Ti&id=5878', names: ['NVIDIA RTX 5070 Ti', 'RTX 5070 Ti'] },
  { score: 31834, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4070+Ti+SUPER&id=4980', names: ['NVIDIA RTX 4070 Ti Super', 'RTX 4070 Ti Super'] },
  { score: 31540, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4070+Ti&id=4699', names: ['NVIDIA RTX 4070 Ti', 'RTX 4070 Ti'] },
  { score: 29257, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+3090+Ti&id=4524', names: ['NVIDIA RTX 3090 Ti', 'RTX 3090 Ti'] },
  { score: 29083, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+7900+XT&id=4646', names: ['AMD Radeon RX 7900 XT', 'Radeon RX 7900 XT', 'RX 7900 XT'] },
  { score: 29946, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4070+SUPER&id=4973', names: ['NVIDIA RTX 4070 Super', 'RTX 4070 Super'] },
  { score: 28648, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5070&id=5940', names: ['NVIDIA RTX 5070', 'RTX 5070'] },
  { score: 26922, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+9070+XT&id=5956', names: ['AMD Radeon RX 9070 XT', 'Radeon RX 9070 XT', 'RX 9070 XT'] },
  { score: 26754, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+3080+Ti&id=4409', names: ['NVIDIA RTX 3080 Ti', 'RTX 3080 Ti'] },
  { score: 26874, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4070&id=4795', names: ['NVIDIA RTX 4070', 'RTX 4070'] },
  { score: 25371, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+9070&id=5958', names: ['AMD Radeon RX 9070', 'Radeon RX 9070', 'RX 9070'] },
  { score: 25068, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+6800+XT&id=4312', names: ['AMD Radeon RX 6800 XT', 'Radeon RX 6800 XT', 'RX 6800 XT'] },
  { score: 24433, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+7800+XT&id=4917', names: ['AMD Radeon RX 7800 XT', 'Radeon RX 7800 XT', 'RX 7800 XT'] },
  { score: 22614, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5060+Ti+16GB&id=6160', names: ['NVIDIA RTX 5060 Ti 16GB', 'RTX 5060 Ti 16GB'] },
  { score: 22596, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4060+Ti&id=4827', names: ['NVIDIA RTX 4060 Ti', 'RTX 4060 Ti'] },
  { score: 23181, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+3070+Ti&id=4413', names: ['NVIDIA RTX 3070 Ti', 'RTX 3070 Ti'] },
  { score: 20663, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5060&id=5602', names: ['NVIDIA RTX 5060', 'RTX 5060'] },
  { score: 20236, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+3060+Ti&id=4318', names: ['NVIDIA RTX 3060 Ti', 'RTX 3060 Ti'] },
  { score: 19491, url: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4060&id=4850', names: ['NVIDIA RTX 4060', 'RTX 4060'] },
];

// Top 25 consumer desktop CPUs (AM5/AM4/LGA1700/LGA1851, no Threadripper/Xeon/EPYC/laptop
// parts) by PassMark CPU Mark, pulled from cpubenchmark.net/multithread (Desktop) on
// PASSMARK_UPDATED.
const CPU: Entry[] = [
  { score: 70109, url: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+9950X3D&id=6549', names: ['AMD Ryzen 9 9950X3D', 'Ryzen 9 9950X3D'] },
  { score: 65717, url: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+9950X&id=6211', names: ['AMD Ryzen 9 9950X', 'Ryzen 9 9950X'] },
  { score: 67259, url: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+Ultra+9+285K&id=6296', names: ['Intel Core Ultra 9 285K', 'Core Ultra 9 285K'] },
  { score: 62303, url: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+7950X3D&id=5234', names: ['AMD Ryzen 9 7950X3D', 'Ryzen 9 7950X3D'] },
  { score: 62150, url: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+7950X&id=5031', names: ['AMD Ryzen 9 7950X', 'Ryzen 9 7950X'] },
  { score: 58599, url: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+Ultra+7+265K&id=6326', names: ['Intel Core Ultra 7 265K', 'Core Ultra 7 265K'] },
  { score: 58518, url: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+Ultra+7+265KF&id=6338', names: ['Intel Core Ultra 7 265KF', 'Core Ultra 7 265KF'] },
  { score: 58254, url: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i9-14900K&id=5717', names: ['Intel Core i9-14900K', 'Core i9-14900K'] },
  { score: 54349, url: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+9900X&id=6171', names: ['AMD Ryzen 9 9900X', 'Ryzen 9 9900X'] },
  { score: 51238, url: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+7900X&id=5027', names: ['AMD Ryzen 9 7900X', 'Ryzen 9 7900X'] },
  { score: 45270, url: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+5950X&id=3862', names: ['AMD Ryzen 9 5950X', 'Ryzen 9 5950X'] },
  { score: 51958, url: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i7-14700K&id=5719', names: ['Intel Core i7-14700K', 'Core i7-14700K'] },
  { score: 45647, url: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i7-13700K&id=5060', names: ['Intel Core i7-13700K', 'Core i7-13700K'] },
  { score: 39941, url: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+7+9800X3D&id=6344', names: ['AMD Ryzen 7 9800X3D', 'Ryzen 7 9800X3D'] },
  { score: 36970, url: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+7+9700X&id=6205', names: ['AMD Ryzen 7 9700X', 'Ryzen 7 9700X'] },
  { score: 35496, url: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+7+7700X&id=5036', names: ['AMD Ryzen 7 7700X', 'Ryzen 7 7700X'] },
  { score: 34277, url: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+7+7800X3D&id=5299', names: ['AMD Ryzen 7 7800X3D', 'Ryzen 7 7800X3D'] },
  { score: 34337, url: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+7+7700&id=5169', names: ['AMD Ryzen 7 7700', 'Ryzen 7 7700'] },
  { score: 31496, url: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+7+8700G&id=5836', names: ['AMD Ryzen 7 8700G', 'Ryzen 7 8700G'] },
  { score: 38892, url: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+5900X&id=3870', names: ['AMD Ryzen 9 5900X', 'Ryzen 9 5900X'] },
  { score: 32479, url: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+3900X&id=3493', names: ['AMD Ryzen 9 3900X', 'Ryzen 9 3900X'] },
  { score: 43053, url: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+Ultra+5+245K&id=6324', names: ['Intel Core Ultra 5 245K', 'Core Ultra 5 245K'] },
  { score: 43114, url: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+Ultra+5+245KF&id=6336', names: ['Intel Core Ultra 5 245KF', 'Core Ultra 5 245KF'] },
  { score: 38412, url: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i5-14600K&id=5720', names: ['Intel Core i5-14600K', 'Core i5-14600K'] },
  { score: 37462, url: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i5-13600K&id=5008', names: ['Intel Core i5-13600K', 'Core i5-13600K'] },
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

export function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
