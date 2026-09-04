import type { CompId } from './build-scene';

// Real, live-catalog component names for each /shop prebuilt (src/app/shop/page.tsx's
// PRODUCTS, same `id`s) — used only to carry a prebuilt's parts into the /build configurator
// when the user clicks "Configure this PC" (see /build's `?prebuilt=<id>` handling). PRODUCTS
// itself only has free-text display strings (gpu/cpu/ram/storage) with no mobo/cooler/psu/case
// at all, and those strings don't reliably match a real Component.name (e.g. "RTX 5090 FE" vs
// the catalog's "NVIDIA RTX 5090 FE", or "Core i9-14900KS", which doesn't exist in the catalog
// at all) — every value below was cross-checked against the live `components` table instead.
//
// The catalog currently has no DDR4 RAM and no 1TB storage at all (RAM is 100% DDR5, storage is
// 100% 2TB), so the three prebuilts whose shop listing advertises DDR4 and/or 1TB (Ranger, Scout
// Pro, Scout) use the closest real DDR5/2TB equivalent here — this only affects which exact part
// gets installed in the configurator, not the shop page's own advertised spec text.
export type PrebuiltPreset = {
  id: number;
  name: string;
  components: Partial<Record<CompId, string>>;
};

export const PREBUILT_PRESETS: PrebuiltPreset[] = [
  {
    id: 1,
    name: 'The Apex Predator',
    components: {
      gpu: 'NVIDIA RTX 5090 FE',
      cpu: 'AMD Ryzen 9 9950X',
      mobo: 'ASUS ROG STRIX X870E-E GAMING WIFI',
      ram: 'ADATA XPG LANCER RGB DDR5-6400 32GB (2x16GB) CL32 White',
      storage: 'ADATA LEGEND 970 2TB SSD M.2-2280 PCIe 5.0 X4 NVMe',
      cooler: 'NZXT Kraken 360 RGB',
      psu: 'Corsair HX1200i ATX 3.0',
      case: 'Lian Li O11D EVO XL',
    },
  },
  {
    id: 2,
    name: 'The Marauder Pro',
    components: {
      gpu: 'NVIDIA RTX 4090',
      cpu: 'Intel Core i9-14900K',
      mobo: 'MSI MPG Z790 CARBON WIFI',
      ram: 'Corsair Dominator 32GB DDR5 5600',
      storage: 'Samsung 990 Pro 2TB NVMe',
      cooler: 'NZXT Kraken 360 RGB',
      psu: 'EVGA SuperNOVA 1200 P3 1200W 80+ Platinum Certified Fully Modular',
      case: 'NZXT H9 Flow RGB',
    },
  },
  {
    id: 3,
    name: 'The Marauder',
    components: {
      gpu: 'NVIDIA RTX 4080 Super',
      cpu: 'Intel Core i9-14900K', // catalog has no 14900KS; closest real part
      mobo: 'Gigabyte Z790 AORUS ELITE AX',
      ram: 'G.Skill Trident Z5 RGB Metallic Silver DDR5-5200 CL40 32GB (2x16GB)',
      storage: 'TEAMGROUP Cardea A440 2TB M.2-2280 SSD PCIe 4.0 X4 NVMe',
      cooler: 'Thermalright Frozen Warframe PRO Water 360mm Black',
      psu: 'be quiet! Straight Power 11 Black 850W Fully Modular 80+ Platinum Certified',
      case: 'Fractal Design Meshify 2',
    },
  },
  {
    id: 4,
    name: 'The Ranger',
    components: {
      gpu: 'NVIDIA RTX 4070 Ti Super',
      cpu: 'Intel Core i7-14700K',
      mobo: 'Gigabyte B760M GAMING WIFI DDR5 Micro ATX',
      ram: 'Crucial Pro Overclocking 32GB (2x16GB) DDR5 6000 CL36 Black', // catalog has no DDR4; closest real DDR5 kit
      storage: 'PNY CS2140 2TB SSD M.2-2280 PCIe 4.0 x4 NVMe', // catalog has no 1TB; closest real 2TB Gen4
      cooler: 'Thermaltake TH240 V2 ARGB Black',
      psu: 'NZXT C850 (2024) Black 850W Fully Modular 80+ Gold Certified',
      case: 'Cooler Master MasterBox MB520 ARGB',
    },
  },
  {
    id: 5,
    name: 'The Scout Pro',
    components: {
      gpu: 'NVIDIA RTX 4070 Super',
      cpu: 'Intel Core i5-14600K',
      mobo: 'MAXSUN B760 iCraft B760M CROSS LGA1700 DDR5 Micro ATX',
      ram: 'Corsair Vengeance Black DDR5-5200 CL40 16GB (1x16GB)',
      storage: 'FFF Smart Life Connected G-Storategy NV470 w/Heatsink 2TB SSD M.2-2280 PCIe 4.0 X4 NVMe', // catalog has no 1TB/Gen3; closest real 2TB Gen4
      cooler: 'Deepcool ICE BLADE PRO V2.0 Air 161mm 60.29 CFM',
      psu: 'Seasonic FOCUS GX-850',
      case: 'Fractal Design Core 2300',
    },
  },
  {
    id: 6,
    name: 'The Scout',
    components: {
      gpu: 'NVIDIA RTX 4070',
      cpu: 'Intel Core i5-14600K',
      mobo: 'ASRock B760M-H2/M.2 DDR5 Micro ATX',
      ram: 'Kingston FURY Beast RGB Black DDR5-5200 CL36 16GB (1x16GB)', // catalog has no DDR4; closest real DDR5 kit
      storage: 'Mushkin Vortex Redline 2TB SSD M.2 PCIe 4.0 NVMe', // catalog has no 1TB/Gen3; closest real 2TB Gen4
      cooler: 'Cooler Master Hyper 212 LED Air 160mm 66.3 CFM Rifle Bearing',
      psu: 'PowerSpec PSX Black 850W Fully Modular 80+ Gold Certified',
      case: 'Fractal Design Pop Air',
    },
  },
];
