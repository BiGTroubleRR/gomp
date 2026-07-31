// Canonical seed data shared by the Build (Config) and Admin pages, both of which read/write
// the same `gomp_components_db` / `gomp_builds_db` localStorage keys. Ported from
// GOMP_Config.dc.html's defaultCompDb() (fully specified in the source) — Admin's own
// defaultComponents() had additional entries in the original site that weren't fully
// legible during porting, so this shared seed intentionally uses the smaller, exactly-known
// Config dataset as the single source of truth for both pages rather than guessing at the
// missing values.
export type Category = 'mobo' | 'cpu' | 'cooler' | 'ram' | 'gpu' | 'storage' | 'psu' | 'case';
export const CATEGORIES: Category[] = ['mobo', 'cpu', 'cooler', 'ram', 'gpu', 'storage', 'psu', 'case'];

export type Tier = 'S' | 'A' | 'B' | 'C' | 'D';

export type Component = {
  id: string;
  name: string;
  price: number;
  specs: string;
  tier: Tier;
  passmark?: number;
  passmarkUrl?: string;
  marketPrice?: number | null;
  category?: string; // case only: Full Tower | Mid Tower | Mini Tower | SFF
};

export type ComponentDb = Record<Category, Component[]>;

export function defaultComponentDb(): ComponentDb {
  return {
    gpu: [
      { id: 'g1', name: 'NVIDIA RTX 5090 FE', price: 1739, specs: '24GB GDDR7 · 575W · PCIe 5.0', tier: 'S', passmark: 38960, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5090&id=5725' },
      { id: 'g2', name: 'NVIDIA RTX 4090', price: 1391, specs: '24GB GDDR6X · 450W · PCIe 4.0', tier: 'A', passmark: 38054, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4090&id=4606' },
      { id: 'g3', name: 'NVIDIA RTX 4080 Super', price: 869, specs: '16GB GDDR6X · 320W', tier: 'A', passmark: 34238, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4080+SUPER&id=4984' },
    ],
    cpu: [
      { id: 'c1', name: 'AMD Ryzen 9 9950X', price: 565, specs: '16C/32T · 5.7GHz · 170W', tier: 'S', passmark: 65758, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+9950X&id=6211' },
      { id: 'c2', name: 'Intel Core i9-14900K', price: 434, specs: '24C/32T · 6.0GHz · 125W', tier: 'A', passmark: 58312, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i9-14900K&id=5717' },
    ],
    ram: [
      { id: 'r1', name: 'G.Skill Trident Z5 32GB DDR5 6400', price: 130, specs: '2×16GB · CL32 · EXPO/XMP3', tier: 'S' },
      { id: 'r2', name: 'Corsair Dominator 32GB DDR5 5600', price: 112, specs: '2×16GB · CL36', tier: 'A' },
    ],
    storage: [
      { id: 's1', name: 'Samsung 990 Pro 2TB NVMe', price: 164, specs: 'PCIe 4.0 · 7450MB/s read', tier: 'S' },
      { id: 's2', name: 'WD Black SN850X 2TB NVMe', price: 156, specs: 'PCIe 4.0 · 7300MB/s read', tier: 'A' },
    ],
    mobo: [
      { id: 'm1', name: 'ASUS ROG STRIX X870E-E', price: 434, specs: 'AM5 · DDR5 · PCIe 5.0 · 4×M.2', tier: 'S' },
      { id: 'm2', name: 'MSI MAG Z790 TOMAHAWK', price: 260, specs: 'LGA1700 · DDR5 · PCIe 5.0', tier: 'B' },
    ],
    cooler: [
      { id: 'co1', name: 'NZXT Kraken 360 RGB', price: 156, specs: '360mm AIO · LCD head · AM5/LGA1700', tier: 'S' },
      { id: 'co2', name: 'Noctua NH-D15 chromax', price: 86, specs: 'Dual tower · 165mm', tier: 'A' },
    ],
    psu: [
      { id: 'p1', name: 'Corsair HX1200i ATX 3.0', price: 217, specs: '1200W · 80+ Platinum · Modular', tier: 'S' },
      { id: 'p2', name: 'Seasonic FOCUS GX-850', price: 130, specs: '850W · 80+ Gold · Modular', tier: 'A' },
    ],
    case: [
      { id: 'ca1', name: 'NZXT H1 V2', price: 217, specs: 'Mini-ITX · Tempered Glass · 280mm AIO Ready', tier: 'A', category: 'SFF' },
      { id: 'ca2', name: 'Fractal Design Pop Air', price: 95, specs: 'Micro-ATX · Mesh Front · 360mm AIO Ready', tier: 'B', category: 'Mini Tower' },
      { id: 'ca3', name: 'Fractal Design Meshify 2', price: 130, specs: 'Mid-Tower ATX · Mesh Front · 360mm AIO Ready', tier: 'A', category: 'Mid Tower' },
      { id: 'ca4', name: 'Lian Li O11D EVO XL', price: 208, specs: 'Full-Tower E-ATX · Tempered Glass · 420mm AIO Ready', tier: 'S', category: 'Full Tower' },
    ],
  };
}

export type Build = {
  id: number;
  name: string;
  tagline: string;
  cat: 'flagship' | 'performance' | 'midrange' | 'entry';
  tier: Tier;
  gpu: string;
  cpu: string;
  ram: string;
  storage: string;
  mobo: string;
  cooler: string;
  psu: string;
  price: number;
  rating: number;
  visible: boolean;
};

// Derived from GOMP_Shop.dc.html's fully-specified ALL_RAW list (the only place all 6
// builds' exact gpu/cpu/ram/storage/price/tier/rating were confirmed during porting).
// mobo/cooler/psu are left blank: the original Admin defaultBuilds() seed for those 3 fields
// wasn't legible during extraction, and guessing specific product names would misrepresent
// data that was never actually confirmed — blank is a valid, honest "not set" state the
// Admin build form already supports.
export function defaultBuilds(): Build[] {
  return [
    { id: 1, name: 'The Apex Predator', tagline: 'Ultimate 4K gaming & creation', cat: 'flagship', tier: 'S', gpu: 'NVIDIA RTX 5090 FE', cpu: 'AMD Ryzen 9 9950X', ram: '32GB DDR5 6400', storage: '2TB NVMe Gen5', mobo: '', cooler: '', psu: '', price: 3739, rating: 4.9, visible: true },
    { id: 2, name: 'The Marauder Pro', tagline: 'High-refresh 1440p / entry 4K', cat: 'performance', tier: 'A', gpu: 'NVIDIA RTX 4090', cpu: 'Intel Core i9-14900K', ram: '32GB DDR5 5600', storage: '2TB NVMe Gen4', mobo: '', cooler: '', psu: '', price: 2869, rating: 4.8, visible: true },
    { id: 3, name: 'The Marauder', tagline: 'Performance 1440p', cat: 'performance', tier: 'A', gpu: 'NVIDIA RTX 4080 Super', cpu: 'Intel Core i9-14900KS', ram: '32GB DDR5', storage: '2TB NVMe', mobo: '', cooler: '', psu: '', price: 2169, rating: 4.7, visible: true },
    { id: 4, name: 'The Ranger', tagline: 'Mid-range 1440p', cat: 'midrange', tier: 'B', gpu: 'NVIDIA RTX 4070 Ti Super', cpu: 'Intel Core i7-14700K', ram: '16GB DDR4 3600', storage: '1TB NVMe Gen4', mobo: '', cooler: '', psu: '', price: 1569, rating: 4.6, visible: true },
    { id: 5, name: 'The Scout Pro', tagline: 'Mid-range 1080p/1440p', cat: 'midrange', tier: 'B', gpu: 'NVIDIA RTX 4070 Super', cpu: 'Intel Core i5-14600K', ram: '16GB DDR4 3600', storage: '1TB NVMe Gen4', mobo: '', cooler: '', psu: '', price: 1299, rating: 4.5, visible: true },
    { id: 6, name: 'The Scout', tagline: 'Entry 1080p', cat: 'entry', tier: 'C', gpu: 'NVIDIA RTX 4070', cpu: 'Intel Core i5-14600K', ram: '16GB DDR4 3600', storage: '1TB NVMe Gen4', mobo: '', cooler: '', psu: '', price: 1039, rating: 4.4, visible: true },
  ];
}

export type Margin = { type: 'eur' | 'pct'; value: number };
export function defaultMargin(): Margin {
  return { type: 'eur', value: 0 };
}

export function computePrice(marketPrice: number | null, margin: Margin): number | null {
  if (marketPrice == null || isNaN(marketPrice)) return null;
  const v = Number(margin.value) || 0;
  const raw = margin.type === 'pct' ? marketPrice * (1 + v / 100) : marketPrice + v;
  return Math.round(raw);
}
