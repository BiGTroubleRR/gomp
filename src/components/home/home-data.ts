import type { Pc3DSpec } from '@/lib/pc3d';

// Rough 3D spec from component names — prebuilts don't store a 3D spec, so the spotlight model and the
// static thumbnails are inferred from the part names (case, cooler, GPU, RAM). Tweak the keywords here
// if the catalog's naming changes.
export function guessPc3DSpec(parts: { gpu?: string; cooler?: string; ram?: string; case?: string }): Pc3DSpec {
  const cooler = parts.cooler ?? '';
  const isAio = /kraken|aio|water|liquid|\b(240|280|360)\s?mm/i.test(cooler) && !/air/i.test(cooler);
  const rad = (Number(cooler.match(/\b(240|280|360)\b/)?.[1]) || 360) as 240 | 280 | 360;
  const gpu = parts.gpu ?? '';
  const ram = parts.ram ?? '';
  const twoSticks = /2x|\(2x/i.test(ram);
  return {
    case: /full|o11d|xl\b/i.test(parts.case ?? '') ? 'full' : 'mid',
    cooler: isAio ? 'aio' : 'air',
    rad: isAio ? rad : undefined,
    gpuMm: /5090|4090|5080/.test(gpu) ? 330 : /5070|4080|4070 ti/i.test(gpu) ? 305 : 230,
    gpuFans: /waterforce|\bwb\b/i.test(gpu) ? 0 : /dual/i.test(gpu) ? 2 : 3,
    ram: twoSticks ? 2 : 1,
    ramColor: /white/i.test(ram) ? 0xe9e6df : /silver/i.test(ram) ? 0xb9bcc2 : 0x1d1f22,
  };
}
