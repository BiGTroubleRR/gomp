import type { Pc3DSpec } from '@/lib/pc3d';

// Shape the new homepage renders. Map your Supabase prebuilt rows into this
// (see README) — the page itself never talks to Supabase.
export type HomeBuild = {
  id: string; // shown name, e.g. GOMP_FLGSHP_5090
  href: string; // where "Konfigurovať" goes, e.g. /build?prebuilt=<id>
  cls: string; // Vlajková loď | Výkonnostná | Stredná trieda | Základná
  cat: 'Vlajkové' | 'Výkonné' | 'Stredná trieda' | 'Základné';
  tier: 'S' | 'A' | 'B' | 'C' | 'D';
  rating: number;
  tag: string;
  gpu: string;
  gpuPM?: number;
  cpu: string;
  cpuPM?: number;
  ram: string;
  ssd: string;
  cool?: string;
  priceCzk: number; // VAT-inclusive
  p3: Pc3DSpec;
};

export const EUR_RATE = 24.3; // 1 € ≈ 24,30 Kč (referenčný júl 2026)

// Current lineup from the live site — used as a fallback and for local preview.
export const DEFAULT_HOME_BUILDS: HomeBuild[] = [
  { id: 'GOMP_FLGSHP_5090', href: '/build', cls: 'Vlajková loď', cat: 'Vlajkové', tier: 'S', rating: 4.9, tag: 'Špičkové 4K hranie a tvorba', gpu: 'GIGABYTE GeForce RTX 5090 XTREME WATERFORCE WB 32G GDDR7', gpuPM: 39008, cpu: 'AMD Ryzen 9 9900X3D', cpuPM: 56131, ram: 'ADATA XPG LANCER RGB DDR5-6400 32GB (2x16GB) CL32 White', ssd: 'ADATA LEGEND 970 2TB SSD M.2-2280 PCIe 5.0 X4 NVMe', cool: 'NZXT Kraken 360 RGB', priceCzk: 194794, p3: { case: 'full', cooler: 'aio', rad: 360, gpuMm: 290, gpuFans: 0, ram: 2, ramColor: 0xe9e6df } },
  { id: 'GOMP_5080_i9', href: '/build', cls: 'Výkonnostná', cat: 'Výkonné', tier: 'A', rating: 4.8, tag: 'Neporaziteľný univerzál pre 4K', gpu: 'MSI GeForce RTX 5080 16G GAMING TRIO OC GDDR7', gpuPM: 35626, cpu: 'INTEL Core i9-14900KF', cpuPM: 58254, ram: 'Corsair Dominator 32GB DDR5 5600', ssd: 'Samsung 990 Pro 2TB NVMe', priceCzk: 93819, p3: { case: 'mid', cooler: 'aio', rad: 360, gpuMm: 338, gpuFans: 3, ram: 2, ramColor: 0x1d1f22 } },
  { id: 'GOMP_5070Ti_i9', href: '/build', cls: 'Výkonnostná', cat: 'Výkonné', tier: 'A', rating: 4.7, tag: 'Dominantný výkon v 1440p', gpu: 'ASUS GeForce RTX 5070 Ti TUF GAMING 16GB OC GDDR7', gpuPM: 32325, cpu: 'INTEL Core i9-14900KF', cpuPM: 58254, ram: 'G.Skill Trident Z5 RGB Metallic Silver DDR5-5200 CL40 32GB (2x16GB)', ssd: 'TEAMGROUP Cardea A440 2TB M.2-2280 SSD PCIe 4.0 X4 NVMe', priceCzk: 74745, p3: { case: 'mid', cooler: 'aio', rad: 360, gpuMm: 305, gpuFans: 3, ram: 2, ramColor: 0xb9bcc2 } },
  { id: 'GOMP_5070_i7', href: '/build', cls: 'Stredná trieda', cat: 'Stredná trieda', tier: 'B', rating: 4.6, tag: 'Plynulé 1440p za skvelú cenu', gpu: 'MSI GeForce RTX 5070 12G GAMING TRIO OC GDDR7', gpuPM: 28651, cpu: 'Intel Core i7-14700KF', cpuPM: 52151, ram: 'Crucial Pro Overclocking 32GB (2x16GB) DDR5 6000 CL36 Black', ssd: 'PNY CS2140 2TB SSD M.2-2280 PCIe 4.0 x4 NVMe', priceCzk: 55863, p3: { case: 'mid', cooler: 'aio', rad: 240, gpuMm: 309, gpuFans: 3, ram: 2, ramColor: 0x1d1f22 } },
  { id: 'GOMP_5060Ti_i5', href: '/build', cls: 'Stredná trieda', cat: 'Stredná trieda', tier: 'B', rating: 4.7, tag: 'Silák na 1080p za rozumnú cenu', gpu: 'ASUS GeForce RTX 5060 Ti DUAL OC 16G GDDR7', gpuPM: 22614, cpu: 'INTEL Core i5-14600KF', cpuPM: 38412, ram: 'Corsair Vengeance Black DDR5-5200 CL40 16GB (1x16GB)', ssd: 'FFF Smart Life Connected G-Storategy NV470 w/Heatsink 2TB SSD M.2-2280 PCIe 4.0 X4 NVMe', priceCzk: 46265, p3: { case: 'mid', cooler: 'air', gpuMm: 229, gpuFans: 2, ram: 1, ramColor: 0x1d1f22 } },
  { id: 'GOMP_BGT_5060', href: '/build', cls: 'Základná', cat: 'Základné', tier: 'B', rating: 4.5, tag: 'Špička v základnej triede', gpu: 'ASUS GeForce RTX 5060 DUAL OC 8G GDDR7', gpuPM: 20633, cpu: 'INTEL Core i5-14600KF', cpuPM: 38412, ram: 'Kingston FURY Beast RGB Black DDR5-5200 CL36 16GB (1x16GB)', ssd: 'Mushkin Vortex Redline 2TB SSD M.2 PCIe 4.0 NVMe', priceCzk: 36694, p3: { case: 'mid', cooler: 'air', gpuMm: 225, gpuFans: 2, ram: 1, ramColor: 0x1d1f22 } },
];

// Rough 3D spec from component names, for builds that don't carry one yet.
// Tweak the keywords to match your catalog, or store p3 per prebuilt in Supabase.
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
