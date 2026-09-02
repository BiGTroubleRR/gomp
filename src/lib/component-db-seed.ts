// Canonical seed data shared by the Build (Config) and Admin pages, both of which read/write
// the same `gomp_components_db` / `gomp_builds_db` localStorage keys. Ported from
// GOMP_Config.dc.html's defaultCompDb() (fully specified in the source) — Admin's own
// defaultComponents() had additional entries in the original site that weren't fully
// legible during porting, so this shared seed intentionally uses the smaller, exactly-known
// Config dataset as the single source of truth for both pages rather than guessing at the
// missing values.
export type Category = 'mobo' | 'cpu' | 'cooler' | 'ram' | 'gpu' | 'storage' | 'psu' | 'case' | 'fan';
export const CATEGORIES: Category[] = ['mobo', 'cpu', 'cooler', 'ram', 'gpu', 'storage', 'psu', 'case', 'fan'];

export type Tier = 'S' | 'A' | 'B' | 'C' | 'D';

export type FormFactor = 'E-ATX' | 'ATX' | 'mATX' | 'Mini-ITX';

// A case's fan mounting positions — real manufacturer spec (max fan count and which sizes fit),
// not something buildcores-open-db's PCCase schema tracks at all, so this is hand-sourced per
// case rather than mined. 'side' is a mount on the (usually glass) side panel opposite the
// motherboard tray, distinct from 'front'/'top'/'bottom'/'rear'.
export type FanMountPosition = 'front' | 'top' | 'rear' | 'bottom' | 'side';
export type FanMountSpec = {
  position: FanMountPosition;
  maxCount: number;
  sizesMm: number[];
  // The fan(s) this case actually ships with at this position, out of the box — bundled into the
  // case's own price, so /build treats keeping this fan (or fewer of it) as free and only charges
  // for units beyond it or a swap to a different product. Admin-set (see the case form's
  // "Pre-installed fans" section); undefined/0 means this position ships empty even though it
  // supports fans, same as today for any case that's never had this configured.
  preinstalledFanName?: string;
  preinstalledCount?: number;
};

export type Component = {
  id: string;
  name: string;
  price: number;
  specs: string;
  // Optional rather than required: SKUs mined in bulk from buildcores-open-db (see the
  // manufacturer-coverage import) have no PassMark score to derive a tier from, unlike the
  // original hand-curated catalog — TierBadge/passmark UI already render nothing when unset.
  tier?: Tier;
  passmark?: number;
  // Per-component margin, used instead of the site-wide margin (see Margin/computePrice below)
  // when this component needs a different markup than everything else — e.g. a low-margin
  // loss-leader GPU, or a part with unusually high shipping/handling cost baked in.
  marginOverride?: Margin;
  passmarkUrl?: string;
  marketPrice?: number | null;
  category?: string; // case only: Full Tower | Mid Tower | Mini Tower | SFF
  socket?: string; // cpu + mobo only: AM5 | AM4 | LGA1700 | LGA1851
  formFactor?: FormFactor; // mobo only
  // Real physical dimensions (mm), sourced from buildcores-open-db (ODC-By licensed —
  // see the attribution note on /about) for the categories where per-SKU size actually
  // varies enough to matter. Drives the Build page's 3D scene scaling in build-scene.ts.
  caseWidthMm?: number; // case only
  caseHeightMm?: number; // case only
  caseDepthMm?: number; // case only
  maxGpuLengthMm?: number; // case only
  maxCoolerHeightMm?: number; // case only, air towers
  maxRadiatorMm?: number; // case only — largest radiator size any mounting position takes, AIO
  maxPsuLengthMm?: number; // case only
  gpuLengthMm?: number; // gpu only
  gpuSlotWidth?: number; // gpu only
  coolerHeightMm?: number; // cooler only, air towers
  coolerRadiatorMm?: number; // cooler only, AIO — the radiator that mounts on the case, not the pump block
  psuLengthMm?: number; // psu only
  ramHeightMm?: number; // ram only, per-SKU heatsink height — falls back to RAM_DIMM_SIZE_MM.height (bare PCB) when unset
  ramGeneration?: 4 | 5; // ram only: DDR4 vs DDR5 — drives the /build DDR filter
  ramSpeedMhz?: number; // ram only: rated speed, e.g. 6400 for "DDR5-6400" — drives the /build min-speed slider
  // ram only: groups rows that are the same real product line at different stick counts (e.g.
  // 1x16GB / 2x16GB / 4x16GB of the same manufacturer+speed+per-stick-capacity) so the picker can
  // show them as one card with a stick-count selector instead of separate rows. Rows without it
  // (older/manually-curated entries) just render as their own single-variant group.
  ramFamily?: string;
  fanMounts?: FanMountSpec[]; // case only — omitted/empty means a fixed design with no user-configurable fan slots
  fanSizeMm?: number; // fan only — the one size this SKU comes in; matched against a mount's sizesMm to decide where it fits
  imageUrl?: string; // admin-uploaded product shot, background already stripped client-side before upload
  // Whether this SKU is currently purchasable on /build — lets Admin pull a component out of the
  // live catalog (a bad price, a discontinued part, a mining artifact worth double-checking)
  // without deleting its row/history. Undefined is treated as live (matches the DB column's own
  // `not null default true`) so every pre-existing row/caller that never set this keeps working.
  isLive?: boolean;
};

export type ComponentDb = Record<Category, Component[]>;

// Which motherboard form factors physically fit in each case size — a case can always host a
// smaller board than it's rated for (a Full Tower happily takes a Mini-ITX board), just never
// a bigger one. Drives both the Case picker (hiding cases too small for the chosen board) and
// the reverse informational check.
export const CASE_FORM_FACTOR_SUPPORT: Record<string, FormFactor[]> = {
  'Full Tower': ['E-ATX', 'ATX', 'mATX', 'Mini-ITX'],
  'Mid Tower': ['ATX', 'mATX', 'Mini-ITX'],
  'Mini Tower': ['mATX', 'Mini-ITX'],
  SFF: ['Mini-ITX'],
};

export function caseFitsFormFactor(caseCategory: string | undefined, formFactor: FormFactor | undefined): boolean {
  if (!caseCategory || !formFactor) return true;
  const supported = CASE_FORM_FACTOR_SUPPORT[caseCategory];
  return supported ? supported.includes(formFactor) : true;
}

// Cases that mount the GPU vertically via a PCIe riser, in their own chamber, instead of
// horizontally below the motherboard (e.g. the NZXT H1 V2's dual-chamber layout) — by name
// since this is a fixed fact about a specific case's physical design, not a per-row admin
// attribute. A card mounted this way needs a different 3D position/orientation (see
// setGpuOrientation in build-scene.ts) or it renders outside a case this shallow.
const VERTICAL_GPU_MOUNT_CASES = new Set(['NZXT H1 V2']);
export function caseHasVerticalGpuMount(caseName: string | undefined): boolean {
  return !!caseName && VERTICAL_GPU_MOUNT_CASES.has(caseName);
}

// Physical clearance check between a part and a case — gpu length, cooler height (air) or
// radiator size (AIO), and psu length all have a real mm figure on both sides (the part's own
// size, and the case's clearance for that category); missing data on either side is treated as
// "no known conflict" rather than a false block, since most SKUs won't have every field filled.
export function fitsInCase(category: Category, comp: Component, caseComp: Component | undefined): boolean {
  if (!caseComp) return true;
  if (category === 'gpu') {
    if (comp.gpuLengthMm && caseComp.maxGpuLengthMm) return comp.gpuLengthMm <= caseComp.maxGpuLengthMm;
  } else if (category === 'cooler') {
    if (comp.coolerHeightMm && caseComp.maxCoolerHeightMm) return comp.coolerHeightMm <= caseComp.maxCoolerHeightMm;
    if (comp.coolerRadiatorMm && caseComp.maxRadiatorMm) return comp.coolerRadiatorMm <= caseComp.maxRadiatorMm;
  } else if (category === 'psu') {
    if (comp.psuLengthMm && caseComp.maxPsuLengthMm) return comp.psuLengthMm <= caseComp.maxPsuLengthMm;
  } else if (category === 'mobo') {
    return caseFitsFormFactor(caseComp.category, comp.formFactor);
  }
  return true;
}

// Standardized motherboard dimensions (mm) per the ATX spec family — unlike case/GPU/cooler/
// PSU, motherboard size barely varies within a form factor (a handful of mm at most), so this
// is a real, industry-standard lookup rather than a per-SKU fetch.
export const MOBO_FORM_FACTOR_SIZE_MM: Record<FormFactor, { width: number; depth: number }> = {
  'E-ATX': { width: 305, depth: 330 },
  ATX: { width: 305, depth: 244 },
  mATX: { width: 244, depth: 244 },
  'Mini-ITX': { width: 170, depth: 170 },
};

// Standardized desktop UDIMM size (mm) — length is fixed regardless of capacity/speed for every
// DDR4/DDR5 desktop stick. Height is the bare-PCB fallback for a SKU with no per-SKU heatsink
// height on file (Component.ramHeightMm) — real RGB heatsink heights vary a lot by model (e.g.
// 44mm on a G.Skill Trident Z5 vs ~56mm on a Corsair Dominator Platinum), so this constant
// undersells any SKU with a tall heatsink rather than a typical one.
export const RAM_DIMM_SIZE_MM = { length: 133.35, height: 31.25 };

// Standardized M.2 2280 SSD size (mm) — "2280" literally encodes 22mm x 80mm; every drive GOMP
// carries is this form factor.
export const STORAGE_M2_SIZE_MM = { length: 80, width: 22 };

// Standard ATX PSU cross-section (mm) per the Intel ATX PSU spec — every ATX unit is this
// width x height regardless of wattage/length; only length varies per model (Component.psuLengthMm).
export const PSU_ATX_SIZE_MM = { width: 150, height: 86 };

// A GPU's top-to-bottom height barely varies by model or length — e.g. the RTX 5090 FE (2-slot,
// 304mm) and RTX 5080 (3-slot, 304mm) are both exactly 137mm tall — so this is a flat constant
// rather than a per-SKU field, unlike gpuLengthMm/gpuSlotWidth which do vary meaningfully.
export const GPU_HEIGHT_MM = 137;
// Standard PCIe expansion-slot pitch (0.8in) — multiplied by Component.gpuSlotWidth to get a
// real thickness in mm (e.g. 2-slot ~= 41mm, 3.5-slot ~= 71mm).
export const PCIE_SLOT_PITCH_MM = 20.32;

// CPU manufacturer isn't a structured field — every name in the catalog already leads with the
// brand ("AMD Ryzen 9 9950X3D", "Intel Core Ultra 9 285K"), so this reads that prefix instead of
// adding a DB column + backfill for something already encoded in the name.
export function cpuManufacturer(name: string): string {
  return name.split(' ')[0] || '';
}

// Real catalog data mixes casing for the same brand across hand-curated vs bulk-imported rows
// (e.g. "G.Skill" vs "G.SKILL", "Adata" vs "ADATA" — see scripts/import-ram-variants.mjs's own
// MFR_PRIORITY list, which isn't uniformly cased either) — without normalizing, the /build RAM
// picker's brand+speed grouping would show near-duplicate entries for the same real brand.
const RAM_BRAND_CANONICAL: Record<string, string> = {
  'G.SKILL': 'G.Skill',
  CORSAIR: 'Corsair',
  KINGSTON: 'Kingston',
  TEAMGROUP: 'TeamGroup',
  CRUCIAL: 'Crucial',
  PATRIOT: 'Patriot',
  ADATA: 'ADATA',
};

// Same reasoning as cpuManufacturer above — RAM has no structured brand field either, and every
// name already leads with it ("G.Skill Trident Z5...", "Corsair Dominator..."). Used to group the
// /build RAM picker's first stage by brand + speed, independent of ramFamily (which is scoped to
// one fixed per-stick capacity and so can't answer "same brand+speed, any capacity").
export function ramBrand(name: string): string {
  const raw = name.split(' ')[0] || '';
  return RAM_BRAND_CANONICAL[raw.toUpperCase()] ?? raw;
}

// GPU/CPU/PSU specs already quote their wattage as a plain "570W"-style token (the same text
// the picker card displays), so this pulls the number straight from there instead of adding a
// parallel structured field that could drift out of sync with what's shown on screen.
export function extractWatts(specs: string): number | null {
  const m = specs.match(/(\d+)\s?W\b/);
  return m ? Number(m[1]) : null;
}

// Flat per-category draw for the parts that don't quote their own wattage — small next to a
// GPU/CPU, so a rough industry-typical estimate is enough for a "will my PSU handle this"
// gut-check rather than a precise measurement.
export const BASE_WATTS: Partial<Record<Category, number>> = {
  mobo: 50,
  ram: 6,
  storage: 6,
  cooler: 8,
};

// Case fans rarely quote wattage in their retail specs (RPM/CFM/dBA instead) the way a GPU/PSU
// does, and draw is per-unit-installed rather than a flat one-shot like BASE_WATTS above — so
// this is a fallback per fan (typical for a 120-140mm case fan) used only when extractWatts can't
// find a real number in that SKU's own specs string.
export const DEFAULT_FAN_WATTS = 3;

// The DDR generation a motherboard supports isn't a structured field (unlike RAM's own
// ramGeneration) — every board's specs string already leads with a "DDR4"/"DDR5" token
// ("X870E · DDR5 · PCIe 5.0 · ..."), so this reads that instead of adding a column that would
// just duplicate what the specs text already says.
export function moboRamGeneration(mobo: Component | undefined): 4 | 5 | undefined {
  const m = mobo?.specs.match(/DDR(4|5)/);
  return m ? (Number(m[1]) as 4 | 5) : undefined;
}

export type PcieGen = 3 | 4 | 5;

// A board's fastest M.2 slot generation isn't a structured field either, and unlike DDR
// generation it can't just be read off the specs text — bulk-imported mobo rows only quote
// "PCIe 5.0" etc. on the ~25 hand-curated SKUs; every buildcores-mined row's specs just says
// "<chipset> · DDR5 · N×M.2" with no PCIe token at all. What IS always present, on curated and
// bulk rows alike, is the chipset code itself, so this maps that to a generation instead —
// values below are lifted directly from what this catalog's own curated rows already quote for
// each chipset (e.g. m1's "X870E · DDR5 · PCIe 5.0" is where X870E: 5 comes from), extended to
// each chipset's un-curated siblings from the same tier/generation. This is necessarily the
// board's *best* slot, not every slot — a real board often also has slower chipset-fed M.2
// slots alongside its one fastest CPU-direct one — so treat a "no mismatch" read as "at least
// one slot should be fine," not a guarantee about whichever slot someone actually uses.
const CHIPSET_PCIE_GEN: Record<string, PcieGen> = {
  // AM5 (Ryzen 7000/9000)
  X870E: 5, X870: 5, B850: 5, B650E: 5,
  X670E: 5, X670: 5, B650: 4, A620: 4,
  // AM4 (Ryzen 1000-5000)
  X570: 4, B550: 4, A520: 3, X470: 3, B450: 3, A320: 3,
  // LGA1851 (Core Ultra 200S)
  Z890: 5, B860: 4,
  // LGA1700 (12th-14th gen Core)
  Z790: 5, H770: 4, B760: 4, H610: 4,
};
const CHIPSET_CODES = Object.keys(CHIPSET_PCIE_GEN).sort((a, b) => b.length - a.length);

export function moboPcieGeneration(mobo: Component | undefined): PcieGen | undefined {
  if (!mobo?.specs) return undefined;
  // Longest code first so "B650E" matches before the "B650" substring inside it does.
  const code = CHIPSET_CODES.find((c) => mobo.specs.includes(c));
  return code ? CHIPSET_PCIE_GEN[code] : undefined;
}

// Every storage SKU's specs (curated and bulk-imported alike) quotes its interface as a plain
// "PCIe 4.0"-style token, so this reads that directly rather than adding a parallel field.
export function storagePcieGeneration(storage: Component | undefined): PcieGen | undefined {
  const m = storage?.specs.match(/PCIe\s*(\d)\.0/i);
  return m ? (Number(m[1]) as PcieGen) : undefined;
}

export function defaultComponentDb(): ComponentDb {
  return {
    gpu: [
      { id: 'g1', name: 'NVIDIA RTX 5090 FE', price: 1999, specs: '32GB GDDR7 · 575W · PCIe 5.0', tier: 'S', passmark: 38965, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5090&id=5725', gpuLengthMm: 304, gpuSlotWidth: 2 },
      { id: 'g2', name: 'NVIDIA RTX 4090', price: 1599, specs: '24GB GDDR6X · 450W · PCIe 4.0', tier: 'S', passmark: 38039, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4090&id=4606', gpuLengthMm: 304, gpuSlotWidth: 3 },
      { id: 'g3', name: 'NVIDIA RTX 5080', price: 1099, specs: '16GB GDDR7 · 360W · PCIe 5.0', tier: 'A', passmark: 35624, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5080&id=5721', gpuLengthMm: 304, gpuSlotWidth: 2 },
      { id: 'g4', name: 'NVIDIA RTX 4080 Super', price: 999, specs: '16GB GDDR6X · 320W · PCIe 4.0', tier: 'A', passmark: 34226, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4080+SUPER&id=4984', gpuLengthMm: 304, gpuSlotWidth: 3 },
      { id: 'g5', name: 'NVIDIA RTX 4080', price: 1099, specs: '16GB GDDR6X · 320W · PCIe 4.0', tier: 'A', passmark: 34443, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4080&id=4622', gpuLengthMm: 304, gpuSlotWidth: 3 },
      { id: 'g6', name: 'AMD Radeon RX 7900 XTX', price: 899, specs: '24GB GDDR6 · 355W · PCIe 4.0', tier: 'A', passmark: 31443, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+7900+XTX&id=4644', gpuLengthMm: 320, gpuSlotWidth: 3 },
      { id: 'g7', name: 'NVIDIA RTX 5070 Ti', price: 899, specs: '16GB GDDR7 · 300W · PCIe 5.0', tier: 'A', passmark: 32349, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5070+Ti&id=5878', gpuLengthMm: 310, gpuSlotWidth: 3 },
      { id: 'g8', name: 'NVIDIA RTX 4070 Ti Super', price: 799, specs: '16GB GDDR6X · 285W · PCIe 4.0', tier: 'A', passmark: 31834, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4070+Ti+SUPER&id=4980', gpuLengthMm: 307, gpuSlotWidth: 3 },
      { id: 'g9', name: 'NVIDIA RTX 4070 Ti', price: 749, specs: '12GB GDDR6X · 285W · PCIe 4.0', tier: 'A', passmark: 31540, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4070+Ti&id=4699', gpuLengthMm: 308, gpuSlotWidth: 3 },
      { id: 'g10', name: 'NVIDIA RTX 3090 Ti', price: 799, specs: '24GB GDDR6X · 450W · PCIe 4.0', tier: 'B', passmark: 29257, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+3090+Ti&id=4524', gpuLengthMm: 313, gpuSlotWidth: 3 },
      { id: 'g11', name: 'AMD Radeon RX 7900 XT', price: 749, specs: '20GB GDDR6 · 315W · PCIe 4.0', tier: 'B', passmark: 29083, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+7900+XT&id=4646', gpuLengthMm: 317, gpuSlotWidth: 2.8 },
      { id: 'g12', name: 'NVIDIA RTX 4070 Super', price: 599, specs: '12GB GDDR6X · 220W · PCIe 4.0', tier: 'B', passmark: 29946, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4070+SUPER&id=4973', gpuLengthMm: 244, gpuSlotWidth: 2 },
      { id: 'g13', name: 'NVIDIA RTX 5070', price: 599, specs: '12GB GDDR7 · 250W · PCIe 5.0', tier: 'B', passmark: 28648, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5070&id=5940', gpuLengthMm: 242, gpuSlotWidth: 2 },
      { id: 'g14', name: 'AMD Radeon RX 9070 XT', price: 599, specs: '16GB GDDR6 · 304W · PCIe 5.0', tier: 'C', passmark: 26922, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+9070+XT&id=5956', gpuLengthMm: 338, gpuSlotWidth: 3.5 },
      { id: 'g15', name: 'NVIDIA RTX 3080 Ti', price: 549, specs: '12GB GDDR6X · 350W · PCIe 4.0', tier: 'C', passmark: 26754, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+3080+Ti&id=4409', gpuLengthMm: 285, gpuSlotWidth: 2 },
      { id: 'g16', name: 'NVIDIA RTX 4070', price: 549, specs: '12GB GDDR6X · 200W · PCIe 4.0', tier: 'C', passmark: 26874, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4070&id=4795', gpuLengthMm: 244, gpuSlotWidth: 2 },
      { id: 'g17', name: 'AMD Radeon RX 9070', price: 549, specs: '16GB GDDR6 · 220W · PCIe 5.0', tier: 'C', passmark: 25371, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+9070&id=5958', gpuLengthMm: 343, gpuSlotWidth: 3.5 },
      { id: 'g18', name: 'AMD Radeon RX 6800 XT', price: 449, specs: '16GB GDDR6 · 300W · PCIe 4.0', tier: 'C', passmark: 25068, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+6800+XT&id=4312', gpuLengthMm: 325, gpuSlotWidth: 3 },
      { id: 'g19', name: 'AMD Radeon RX 7800 XT', price: 499, specs: '16GB GDDR6 · 263W · PCIe 4.0', tier: 'C', passmark: 24433, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=Radeon+RX+7800+XT&id=4917', gpuLengthMm: 274, gpuSlotWidth: 2.5 },
      { id: 'g20', name: 'NVIDIA RTX 5060 Ti 16GB', price: 499, specs: '16GB GDDR7 · 180W · PCIe 5.0', tier: 'D', passmark: 22614, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5060+Ti+16GB&id=6160', gpuLengthMm: 232, gpuSlotWidth: 2 },
      { id: 'g21', name: 'NVIDIA RTX 4060 Ti', price: 399, specs: '8GB GDDR6 · 160W · PCIe 4.0', tier: 'D', passmark: 22596, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4060+Ti&id=4827', gpuLengthMm: 244, gpuSlotWidth: 2 },
      { id: 'g22', name: 'NVIDIA RTX 3070 Ti', price: 379, specs: '8GB GDDR6X · 290W · PCIe 4.0', tier: 'D', passmark: 23181, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+3070+Ti&id=4413', gpuLengthMm: 267, gpuSlotWidth: 2 },
      { id: 'g23', name: 'NVIDIA RTX 5060', price: 329, specs: '8GB GDDR7 · 145W · PCIe 5.0', tier: 'D', passmark: 20663, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+5060&id=5602', gpuLengthMm: 247, gpuSlotWidth: 2 },
      { id: 'g24', name: 'NVIDIA RTX 3060 Ti', price: 299, specs: '8GB GDDR6 · 200W · PCIe 4.0', tier: 'D', passmark: 20236, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+3060+Ti&id=4318', gpuLengthMm: 242, gpuSlotWidth: 2 },
      { id: 'g25', name: 'NVIDIA RTX 4060', price: 299, specs: '8GB GDDR6 · 115W · PCIe 4.0', tier: 'D', passmark: 19491, passmarkUrl: 'https://www.videocardbenchmark.net/gpu.php?gpu=GeForce+RTX+4060&id=4850', gpuLengthMm: 244, gpuSlotWidth: 2 },
    ],
    cpu: [
      { id: 'c1', name: 'AMD Ryzen 9 9950X3D', price: 650, specs: '16C/32T · 5.7GHz · 170W · 3D V-Cache', tier: 'S', socket: 'AM5', passmark: 70109, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+9950X3D&id=6549' },
      { id: 'c2', name: 'AMD Ryzen 9 9950X', price: 485, specs: '16C/32T · 5.7GHz · 170W', tier: 'S', socket: 'AM5', passmark: 65717, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+9950X&id=6211' },
      { id: 'c3', name: 'Intel Core Ultra 9 285K', price: 496, specs: '24C/24T · 5.7GHz · 125W', tier: 'S', socket: 'LGA1851', passmark: 67259, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+Ultra+9+285K&id=6296' },
      { id: 'c4', name: 'AMD Ryzen 9 7950X3D', price: 368, specs: '16C/32T · 5.7GHz · 120W · 3D V-Cache', tier: 'A', socket: 'AM5', passmark: 62303, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+7950X3D&id=5234' },
      { id: 'c5', name: 'AMD Ryzen 9 7950X', price: 385, specs: '16C/32T · 5.7GHz · 170W', tier: 'A', socket: 'AM5', passmark: 62150, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+7950X&id=5031' },
      { id: 'c6', name: 'Intel Core Ultra 7 265K', price: 324, specs: '20C/20T · 5.5GHz · 125W', tier: 'A', socket: 'LGA1851', passmark: 58599, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+Ultra+7+265K&id=6326' },
      { id: 'c7', name: 'Intel Core Ultra 7 265KF', price: 291, specs: '20C/20T · 5.5GHz · 125W', tier: 'A', socket: 'LGA1851', passmark: 58518, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+Ultra+7+265KF&id=6338' },
      { id: 'c8', name: 'Intel Core i9-14900K', price: 464, specs: '24C/32T · 6.0GHz · 125W', tier: 'A', socket: 'LGA1700', passmark: 58254, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i9-14900K&id=5717' },
      { id: 'c9', name: 'AMD Ryzen 9 9900X', price: 329, specs: '12C/24T · 5.6GHz · 120W', tier: 'B', socket: 'AM5', passmark: 54349, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+9900X&id=6171' },
      { id: 'c10', name: 'AMD Ryzen 9 7900X', price: 301, specs: '12C/24T · 5.6GHz · 170W', tier: 'B', socket: 'AM5', passmark: 51238, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+7900X&id=5027' },
      { id: 'c11', name: 'AMD Ryzen 9 5950X', price: 418, specs: '16C/32T · 4.9GHz · 105W', tier: 'B', socket: 'AM4', passmark: 45270, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+5950X&id=3862' },
      { id: 'c12', name: 'Intel Core i7-14700K', price: 371, specs: '20C/28T · 5.6GHz · 125W', tier: 'B', socket: 'LGA1700', passmark: 51958, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i7-14700K&id=5719' },
      { id: 'c13', name: 'Intel Core i7-13700K', price: 450, specs: '16C/24T · 5.4GHz · 125W', tier: 'B', socket: 'LGA1700', passmark: 45647, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i7-13700K&id=5060' },
      { id: 'c14', name: 'AMD Ryzen 7 9800X3D', price: 415, specs: '8C/16T · 5.2GHz · 120W · 3D V-Cache', tier: 'C', socket: 'AM5', passmark: 39941, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+7+9800X3D&id=6344' },
      { id: 'c15', name: 'AMD Ryzen 7 9700X', price: 280, specs: '8C/16T · 5.5GHz · 65W', tier: 'C', socket: 'AM5', passmark: 36970, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+7+9700X&id=6205' },
      { id: 'c16', name: 'AMD Ryzen 7 7700X', price: 218, specs: '8C/16T · 5.4GHz · 105W', tier: 'C', socket: 'AM5', passmark: 35496, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+7+7700X&id=5036' },
      { id: 'c17', name: 'AMD Ryzen 7 7800X3D', price: 272, specs: '8C/16T · 5.0GHz · 120W · 3D V-Cache', tier: 'C', socket: 'AM5', passmark: 34277, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+7+7800X3D&id=5299' },
      { id: 'c18', name: 'AMD Ryzen 7 7700', price: 299, specs: '8C/16T · 5.3GHz · 65W', tier: 'C', socket: 'AM5', passmark: 34337, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+7+7700&id=5169' },
      { id: 'c19', name: 'AMD Ryzen 7 8700G', price: 264, specs: '8C/16T · 5.1GHz · 65W · Radeon 780M iGPU', tier: 'C', socket: 'AM5', passmark: 31496, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+7+8700G&id=5836' },
      { id: 'c20', name: 'AMD Ryzen 9 5900X', price: 222, specs: '12C/24T · 4.8GHz · 105W', tier: 'C', socket: 'AM4', passmark: 38892, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+5900X&id=3870' },
      { id: 'c21', name: 'AMD Ryzen 9 3900X', price: 134, specs: '12C/24T · 4.6GHz · 105W', tier: 'C', socket: 'AM4', passmark: 32479, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+3900X&id=3493' },
      { id: 'c22', name: 'Intel Core Ultra 5 245K', price: 190, specs: '14C/14T · 5.2GHz · 125W', tier: 'C', socket: 'LGA1851', passmark: 43053, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+Ultra+5+245K&id=6324' },
      { id: 'c23', name: 'Intel Core Ultra 5 245KF', price: 182, specs: '14C/14T · 5.2GHz · 125W', tier: 'C', socket: 'LGA1851', passmark: 43114, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+Ultra+5+245KF&id=6336' },
      { id: 'c24', name: 'Intel Core i5-14600K', price: 259, specs: '14C/20T · 5.3GHz · 125W', tier: 'C', socket: 'LGA1700', passmark: 38412, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i5-14600K&id=5720' },
      { id: 'c25', name: 'Intel Core i5-13600K', price: 319, specs: '14C/20T · 5.1GHz · 125W', tier: 'C', socket: 'LGA1700', passmark: 37462, passmarkUrl: 'https://www.cpubenchmark.net/cpu.php?cpu=Intel+Core+i5-13600K&id=5008' },
    ],
    ram: [
      { id: 'r1', name: 'G.Skill Trident Z5 32GB DDR5 6400', price: 130, specs: '2×16GB · CL32 · EXPO/XMP3', tier: 'S', ramHeightMm: 44, ramGeneration: 5, ramSpeedMhz: 6400 },
      { id: 'r2', name: 'Corsair Dominator 32GB DDR5 5600', price: 112, specs: '2×16GB · CL36', tier: 'A', ramHeightMm: 56, ramGeneration: 5, ramSpeedMhz: 5600 },
    ],
    storage: [
      { id: 's1', name: 'Samsung 990 Pro 2TB NVMe', price: 164, specs: 'PCIe 4.0 · 7450MB/s read', tier: 'S' },
      { id: 's2', name: 'WD Black SN850X 2TB NVMe', price: 156, specs: 'PCIe 4.0 · 7300MB/s read', tier: 'A' },
    ],
    mobo: [
      { id: 'm1', name: 'ASUS ROG STRIX X870E-E GAMING WIFI', price: 480, specs: 'X870E · DDR5 · PCIe 5.0 · 4×M.2 · WiFi 7', tier: 'S', socket: 'AM5', formFactor: 'ATX' },
      { id: 'm2', name: 'ASUS ROG CROSSHAIR X870E HERO', price: 650, specs: 'X870E · DDR5 · PCIe 5.0 · 5×M.2 · WiFi 7', tier: 'S', socket: 'AM5', formFactor: 'E-ATX' },
      { id: 'm3', name: 'MSI MEG X870E GODLIKE', price: 950, specs: 'X870E · DDR5 · PCIe 5.0 · 5×M.2 · 10GbE', tier: 'S', socket: 'AM5', formFactor: 'E-ATX' },
      { id: 'm4', name: 'MSI MAG X670E TOMAHAWK WIFI', price: 330, specs: 'X670E · DDR5 · PCIe 5.0 · 4×M.2', tier: 'A', socket: 'AM5', formFactor: 'ATX' },
      { id: 'm5', name: 'Gigabyte B650 AORUS ELITE AX', price: 180, specs: 'B650 · DDR5 · PCIe 4.0 · 3×M.2 · WiFi 6E', tier: 'B', socket: 'AM5', formFactor: 'ATX' },
      { id: 'm6', name: 'ASRock B650M PG Lightning', price: 140, specs: 'B650 · DDR5 · PCIe 4.0 · 2×M.2', tier: 'B', socket: 'AM5', formFactor: 'mATX' },
      { id: 'm7', name: 'ASUS ROG STRIX B650E-I GAMING WIFI', price: 300, specs: 'B650E · DDR5 · PCIe 5.0 · 2×M.2 · WiFi 6E', tier: 'B', socket: 'AM5', formFactor: 'Mini-ITX' },
      { id: 'm8', name: 'Gigabyte A620M S2H', price: 90, specs: 'A620 · DDR5 · PCIe 4.0 · 1×M.2', tier: 'C', socket: 'AM5', formFactor: 'mATX' },
      { id: 'm9', name: 'ASUS ROG STRIX X570-E GAMING', price: 280, specs: 'X570 · DDR4 · PCIe 4.0 · 2×M.2', tier: 'B', socket: 'AM4', formFactor: 'ATX' },
      { id: 'm10', name: 'MSI B550 TOMAHAWK', price: 150, specs: 'B550 · DDR4 · PCIe 4.0 · 2×M.2', tier: 'C', socket: 'AM4', formFactor: 'ATX' },
      { id: 'm11', name: 'ASRock X570M Pro4', price: 150, specs: 'X570 · DDR4 · PCIe 4.0 · 2×M.2', tier: 'C', socket: 'AM4', formFactor: 'mATX' },
      { id: 'm12', name: 'Gigabyte B450M DS3H', price: 70, specs: 'B450 · DDR4 · PCIe 3.0 · 1×M.2', tier: 'D', socket: 'AM4', formFactor: 'mATX' },
      { id: 'm13', name: 'ASUS ROG MAXIMUS Z790 HERO', price: 630, specs: 'Z790 · DDR5 · PCIe 5.0 · 4×M.2 · WiFi 7', tier: 'S', socket: 'LGA1700', formFactor: 'ATX' },
      { id: 'm14', name: 'MSI MPG Z790 CARBON WIFI', price: 380, specs: 'Z790 · DDR5 · PCIe 5.0 · 5×M.2 · WiFi 6E', tier: 'A', socket: 'LGA1700', formFactor: 'ATX' },
      { id: 'm15', name: 'ASUS ROG STRIX Z790-I GAMING WIFI', price: 470, specs: 'Z790 · DDR5 · PCIe 5.0 · 2×M.2 · WiFi 6E', tier: 'A', socket: 'LGA1700', formFactor: 'Mini-ITX' },
      { id: 'm16', name: 'Gigabyte Z790 AORUS ELITE AX', price: 260, specs: 'Z790 · DDR5 · PCIe 5.0 · 4×M.2 · WiFi 6E', tier: 'B', socket: 'LGA1700', formFactor: 'ATX' },
      { id: 'm17', name: 'ASRock Z790 Pro RS', price: 190, specs: 'Z790 · DDR5 · PCIe 5.0 · 4×M.2', tier: 'B', socket: 'LGA1700', formFactor: 'ATX' },
      { id: 'm18', name: 'ASUS TUF GAMING B760M-PLUS WIFI', price: 160, specs: 'B760 · DDR5 · PCIe 4.0 · 2×M.2 · WiFi 6', tier: 'C', socket: 'LGA1700', formFactor: 'mATX' },
      { id: 'm19', name: 'MSI PRO B760M-A WIFI', price: 140, specs: 'B760 · DDR5 · PCIe 4.0 · 2×M.2 · WiFi 6', tier: 'C', socket: 'LGA1700', formFactor: 'mATX' },
      { id: 'm20', name: 'MSI MEG Z890 ACE', price: 700, specs: 'Z890 · DDR5 · PCIe 5.0 · 5×M.2 · 10GbE', tier: 'S', socket: 'LGA1851', formFactor: 'E-ATX' },
      { id: 'm21', name: 'ASUS ROG MAXIMUS Z890 HERO', price: 630, specs: 'Z890 · DDR5 · PCIe 5.0 · 5×M.2 · WiFi 7', tier: 'S', socket: 'LGA1851', formFactor: 'ATX' },
      { id: 'm22', name: 'MSI MPG Z890 CARBON WIFI', price: 400, specs: 'Z890 · DDR5 · PCIe 5.0 · 5×M.2 · WiFi 7', tier: 'A', socket: 'LGA1851', formFactor: 'ATX' },
      { id: 'm23', name: 'Gigabyte Z890 AORUS ELITE WIFI7', price: 280, specs: 'Z890 · DDR5 · PCIe 5.0 · 4×M.2 · WiFi 7', tier: 'B', socket: 'LGA1851', formFactor: 'ATX' },
      { id: 'm24', name: 'ASRock Z890 Pro RS WiFi', price: 230, specs: 'Z890 · DDR5 · PCIe 5.0 · 3×M.2 · WiFi 6E', tier: 'B', socket: 'LGA1851', formFactor: 'ATX' },
      { id: 'm25', name: 'ASUS PRIME B860M-A WIFI', price: 180, specs: 'B860 · DDR5 · PCIe 4.0 · 3×M.2 · WiFi 6E', tier: 'C', socket: 'LGA1851', formFactor: 'mATX' },
    ],
    cooler: [
      { id: 'co1', name: 'NZXT Kraken 360 RGB', price: 156, specs: '360mm AIO · LCD head · AM5/LGA1700', tier: 'S', coolerRadiatorMm: 360 },
      { id: 'co2', name: 'Noctua NH-D15 chromax', price: 86, specs: 'Dual tower · 165mm', tier: 'A', coolerHeightMm: 165 },
    ],
    psu: [
      { id: 'p1', name: 'Corsair HX1200i ATX 3.0', price: 217, specs: '1200W · 80+ Platinum · Modular', tier: 'S', psuLengthMm: 200 },
      { id: 'p2', name: 'Seasonic FOCUS GX-850', price: 130, specs: '850W · 80+ Gold · Modular', tier: 'A', psuLengthMm: 140 },
    ],
    case: [
      {
        id: 'ca1',
        name: 'NZXT H1 V2',
        price: 217,
        specs: 'Mini-ITX · Tempered Glass · 140mm AIO (pre-installed)',
        tier: 'A',
        category: 'SFF',
        caseWidthMm: 196,
        caseHeightMm: 405,
        caseDepthMm: 196,
        maxGpuLengthMm: 324,
        maxCoolerHeightMm: 45,
        maxRadiatorMm: 140,
        maxPsuLengthMm: 100,
        // Fixed dual-chamber SFF design — the AIO/exhaust fan are pre-installed and part of the
        // chassis, not a user-configurable slot.
        fanMounts: [],
      },
      {
        id: 'ca2',
        name: 'Fractal Design Pop Air',
        price: 95,
        specs: 'Micro-ATX · Mesh Front · 280mm AIO Ready',
        tier: 'B',
        category: 'Mini Tower',
        caseWidthMm: 215,
        caseHeightMm: 454,
        caseDepthMm: 473.5,
        maxGpuLengthMm: 405,
        maxCoolerHeightMm: 170,
        maxRadiatorMm: 280,
        maxPsuLengthMm: 170,
        fanMounts: [
          { position: 'front', maxCount: 2, sizesMm: [120, 140] },
          { position: 'top', maxCount: 2, sizesMm: [120, 140] },
          { position: 'rear', maxCount: 1, sizesMm: [120] },
        ],
      },
      {
        id: 'ca3',
        name: 'Fractal Design Meshify 2',
        price: 130,
        specs: 'Mid-Tower ATX · Mesh Front · 420mm AIO Ready',
        tier: 'A',
        category: 'Mid Tower',
        caseWidthMm: 210,
        caseHeightMm: 475,
        caseDepthMm: 424,
        maxGpuLengthMm: 467,
        maxCoolerHeightMm: 169,
        maxRadiatorMm: 420,
        maxPsuLengthMm: 250,
        fanMounts: [
          { position: 'front', maxCount: 3, sizesMm: [120, 140] },
          { position: 'top', maxCount: 3, sizesMm: [120, 140] },
          { position: 'rear', maxCount: 1, sizesMm: [120, 140] },
          { position: 'bottom', maxCount: 2, sizesMm: [120, 140] },
        ],
      },
      {
        id: 'ca4',
        name: 'Lian Li O11D EVO XL',
        price: 208,
        specs: 'Full-Tower E-ATX · Tempered Glass · 420mm AIO Ready',
        tier: 'S',
        category: 'Full Tower',
        caseWidthMm: 285,
        caseHeightMm: 517,
        caseDepthMm: 490,
        maxGpuLengthMm: 460,
        maxCoolerHeightMm: 167,
        maxRadiatorMm: 420,
        maxPsuLengthMm: 220,
        fanMounts: [
          { position: 'top', maxCount: 3, sizesMm: [120, 140] },
          { position: 'side', maxCount: 3, sizesMm: [120, 140] },
          { position: 'bottom', maxCount: 3, sizesMm: [120, 140] },
          { position: 'rear', maxCount: 2, sizesMm: [120] },
        ],
      },
    ],
    fan: [
      { id: 'f1', name: 'Noctua NF-A12x25', price: 30, specs: '2000 RPM · 60.1 CFM · 22.6 dBA · 4-pin PWM', tier: 'S', fanSizeMm: 120 },
      { id: 'f2', name: 'Corsair ML140', price: 25, specs: '1600 RPM · 75.0 CFM · 24.7 dBA · 4-pin PWM', tier: 'A', fanSizeMm: 140 },
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
