// One-off import: 13 real cases from Fractal Design, Cooler Master and NZXT, hand-sourced from
// eD system a.s. (edshop.edsystem.cz), a Czech B2B IT distributor whose product pages carry a
// genuinely rich per-model spec sheet — including real fan-mount and radiator-support data per
// position, which buildcores-open-db (the source for scripts/import-case-variants.mjs) has never
// had for the case category at all (see that script's own header comment).
//
// Dimensions (case_width/height/depth_mm) are taken from buildcores-open-db instead of eD's own
// "Velikost" field wherever a match exists, because eD's dimension triplet order turned out to be
// brand-inconsistent (NZXT lists H x W x D; Fractal/Cooler Master list D x W x H) and cross-checking
// against buildcores-open-db's separately-labelled width/height/depth fields was the only reliable
// way to be sure which axis was which — getting this wrong would visibly distort the case box in
// the 3D viewport. Fan mounts, radiator support, max GPU/cooler/PSU length are eD-only data (not in
// buildcores-open-db) and were read directly off each product's spec table; one product (NZXT H5
// Flow) had its "Podpora vodního chlazení" (water-cooling) and "Podpora ventilátorů" (fan support)
// table sections mislabelled/swapped on the live site — corrected by hand below, values otherwise
// taken as published. Fan preinstall counts/positions are inferred from each product's own title
// (e.g. "3x 120mm ARGB Fan") distributed across the position(s) that size fits — a heuristic default
// like the rest of this category's fan_mounts data, refinable later via Admin.
//
// Product photos are the site's own "_0a.jpg" gallery image (confirmed to be the largest/original
// variant available, vs. the smaller "_0a_7.jpg"/"_0a_9.jpg" IMGCACHE-resized thumbnails used in
// listing views) — downloaded and re-hosted in this project's own `component-images` Supabase
// Storage bucket via the admin upload route's own convention, not hotlinked from eD's CDN.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = 'component-images';
const EDSYSTEM = 'https://edshop.edsystem.cz';

const PRICE_BY_BUCKET = { 'Full Tower': 208, 'Mid Tower': 130, 'Mini Tower': 95, SFF: 217 };

const CASES = [
  {
    name: 'Fractal Design Define 7 XL',
    bucket: 'Full Tower',
    dims: { width: 240, height: 566, depth: 604 },
    gpu: 524,
    cooler: 185,
    psu: 250,
    radiator: 480,
    image: '/IMGCACHE/_1510/1510717_0a.jpg',
    fanMounts: [
      { position: 'front', sizesMm: [120, 140], maxCount: 4, preinstalledCount: 2 },
      { position: 'top', sizesMm: [120, 140], maxCount: 4, preinstalledCount: 0 },
      { position: 'rear', sizesMm: [120, 140], maxCount: 1, preinstalledCount: 1 },
      { position: 'bottom', sizesMm: [120, 140], maxCount: 2, preinstalledCount: 0 },
    ],
  },
  {
    name: 'Fractal Design Define 7',
    bucket: 'Mid Tower',
    dims: { width: 240, height: 475, depth: 547 },
    gpu: 467,
    cooler: 185,
    psu: 250,
    radiator: 420,
    image: '/IMGCACHE/_1510/1510694_0a.jpg',
    fanMounts: [
      { position: 'front', sizesMm: [120, 140], maxCount: 3, preinstalledCount: 2 },
      { position: 'top', sizesMm: [120, 140], maxCount: 3, preinstalledCount: 0 },
      { position: 'rear', sizesMm: [120, 140], maxCount: 1, preinstalledCount: 1 },
      { position: 'bottom', sizesMm: [120, 140], maxCount: 2, preinstalledCount: 0 },
    ],
  },
  {
    name: 'Fractal Design North XL',
    bucket: 'Full Tower',
    dims: { width: 240, height: 509, depth: 503 },
    gpu: 413,
    cooler: 185,
    psu: 175,
    radiator: 420,
    image: '/IMGCACHE/_1736/1736566_0a.jpg',
    fanMounts: [
      { position: 'front', sizesMm: [120, 140], maxCount: 3, preinstalledCount: 2 },
      { position: 'top', sizesMm: [120, 140, 180], maxCount: 3, preinstalledCount: 2 },
      { position: 'rear', sizesMm: [120, 140], maxCount: 1, preinstalledCount: 0 },
      { position: 'side', sizesMm: [120, 140], maxCount: 2, preinstalledCount: 0 },
    ],
  },
  {
    name: 'Fractal Design Core 2300',
    bucket: 'Mid Tower',
    dims: { width: 195, height: 431, depth: 450 },
    gpu: 380,
    cooler: 162,
    psu: 185,
    radiator: 280,
    image: '/IMGCACHE/_514/514597_0a.jpg',
    fanMounts: [
      { position: 'front', sizesMm: [120, 140], maxCount: 2, preinstalledCount: 1 },
      { position: 'rear', sizesMm: [120], maxCount: 1, preinstalledCount: 1 },
      { position: 'top', sizesMm: [120, 140], maxCount: 2, preinstalledCount: 0 },
      { position: 'bottom', sizesMm: [120, 140], maxCount: 1, preinstalledCount: 0 },
      { position: 'side', sizesMm: [140], maxCount: 1, preinstalledCount: 0 },
    ],
  },
  {
    name: 'Cooler Master MasterBox MB520 ARGB',
    bucket: 'Mid Tower',
    dims: { width: 217, height: 469, depth: 496 },
    gpu: 410,
    cooler: 165,
    psu: 180,
    radiator: 360,
    image: '/IMGCACHE/_1508/1508644_0a.jpg',
    fanMounts: [
      { position: 'front', sizesMm: [120, 140], maxCount: 3, preinstalledCount: 3 },
      { position: 'top', sizesMm: [120, 140], maxCount: 3, preinstalledCount: 0 },
      { position: 'rear', sizesMm: [120], maxCount: 1, preinstalledCount: 1 },
    ],
  },
  {
    name: 'Cooler Master MasterFrame 600',
    bucket: 'Mid Tower',
    dims: { width: 261, height: 544, depth: 531 },
    gpu: 485,
    cooler: 190,
    psu: 235,
    radiator: 420,
    image: '/IMGCACHE/_1758/1758012_0a.jpg',
    fanMounts: [
      { position: 'front', sizesMm: [120, 140, 180, 200], maxCount: 3, preinstalledCount: 3 },
      { position: 'top', sizesMm: [120, 140, 180, 200], maxCount: 2, preinstalledCount: 0 },
      { position: 'side', sizesMm: [120, 140], maxCount: 3, preinstalledCount: 0 },
      { position: 'bottom', sizesMm: [120, 140, 180, 200], maxCount: 1, preinstalledCount: 0 },
      { position: 'rear', sizesMm: [120], maxCount: 1, preinstalledCount: 1 },
    ],
  },
  {
    name: 'Cooler Master Elite 600',
    bucket: 'Mid Tower',
    dims: { width: 285, height: 410, depth: 445 },
    gpu: 425,
    cooler: 160,
    psu: 240,
    radiator: 360,
    image: '/IMGCACHE/_1768/1768037_0a.jpg',
    fanMounts: [
      { position: 'side', sizesMm: [120, 140], maxCount: 3, preinstalledCount: 3 },
      { position: 'top', sizesMm: [120, 140], maxCount: 3, preinstalledCount: 0 },
      { position: 'bottom', sizesMm: [120], maxCount: 3, preinstalledCount: 0 },
      { position: 'rear', sizesMm: [120], maxCount: 1, preinstalledCount: 1 },
    ],
  },
  {
    name: 'Cooler Master Elite 302',
    bucket: 'Mini Tower',
    dims: { width: 203.5, height: 430, depth: 390 },
    gpu: 365,
    cooler: 163.5,
    psu: 160,
    radiator: 360,
    image: '/IMGCACHE/_1758/1758013_0a.jpg',
    fanMounts: [
      { position: 'front', sizesMm: [120], maxCount: 3, preinstalledCount: 3 },
      { position: 'top', sizesMm: [120, 140], maxCount: 2, preinstalledCount: 0 },
      { position: 'rear', sizesMm: [120], maxCount: 1, preinstalledCount: 0 },
    ],
  },
  {
    name: 'Cooler Master CMP 520',
    bucket: 'Mid Tower',
    dims: { width: 204, height: 463, depth: 439 },
    gpu: 350,
    cooler: 161,
    psu: 160,
    radiator: 280,
    image: '/IMGCACHE/_1621/1621191_0a.jpg',
    fanMounts: [
      { position: 'front', sizesMm: [120, 140], maxCount: 2, preinstalledCount: 2 },
      { position: 'top', sizesMm: [120, 140], maxCount: 3, preinstalledCount: 0 },
      { position: 'rear', sizesMm: [120], maxCount: 1, preinstalledCount: 1 },
    ],
  },
  {
    name: 'NZXT H9 Flow RGB',
    bucket: 'Full Tower',
    dims: { width: 315, height: 506, depth: 481 },
    gpu: 459,
    cooler: 165,
    psu: 200,
    radiator: 420,
    image: '/IMGCACHE/_1776/1776935_0a.jpg',
    fanMounts: [
      { position: 'front', sizesMm: [120, 140], maxCount: 3, preinstalledCount: 1 },
      { position: 'top', sizesMm: [120, 140], maxCount: 3, preinstalledCount: 0 },
      { position: 'bottom', sizesMm: [120, 140], maxCount: 3, preinstalledCount: 0 },
      { position: 'rear', sizesMm: [120], maxCount: 1, preinstalledCount: 1 },
    ],
  },
  {
    name: 'NZXT H6 Flow',
    bucket: 'Mid Tower',
    dims: { width: 287, height: 435, depth: 415 },
    gpu: 365,
    cooler: 163,
    psu: 200,
    radiator: 360,
    image: '/IMGCACHE/_1765/1765331_0a.jpg',
    fanMounts: [
      { position: 'front', sizesMm: [120], maxCount: 3, preinstalledCount: 3 },
      { position: 'top', sizesMm: [120, 140], maxCount: 3, preinstalledCount: 0 },
      { position: 'bottom', sizesMm: [140], maxCount: 2, preinstalledCount: 0 },
      { position: 'rear', sizesMm: [120], maxCount: 1, preinstalledCount: 0 },
    ],
  },
  {
    name: 'NZXT H5 Flow',
    bucket: 'Mid Tower',
    dims: { width: 225, height: 465, depth: 430 },
    gpu: 410,
    cooler: 170,
    psu: 200,
    radiator: 360,
    image: '/IMGCACHE/_1765/1765305_0a.jpg',
    fanMounts: [
      { position: 'front', sizesMm: [120, 140], maxCount: 3, preinstalledCount: 2 },
      { position: 'top', sizesMm: [120, 140], maxCount: 2, preinstalledCount: 0 },
      { position: 'bottom', sizesMm: [120], maxCount: 2, preinstalledCount: 0 },
      { position: 'rear', sizesMm: [120], maxCount: 1, preinstalledCount: 0 },
    ],
  },
  {
    name: 'NZXT H3 Flow',
    bucket: 'Mini Tower',
    dims: { width: 225, height: 400, depth: 389 },
    gpu: 377,
    cooler: 170,
    psu: 185,
    radiator: 280,
    image: '/IMGCACHE/_1765/1765335_0a.jpg',
    fanMounts: [
      { position: 'front', sizesMm: [120, 140], maxCount: 2, preinstalledCount: 1 },
      { position: 'top', sizesMm: [120, 140], maxCount: 2, preinstalledCount: 0 },
      { position: 'bottom', sizesMm: [120], maxCount: 2, preinstalledCount: 0 },
      { position: 'rear', sizesMm: [120], maxCount: 1, preinstalledCount: 0 },
    ],
  },
];

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

async function uploadImage(caseDef) {
  const res = await fetch(EDSYSTEM + caseDef.image);
  if (!res.ok) throw new Error(`Failed to download ${caseDef.image}: ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const path = `${slugify(caseDef.name)}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw new Error(`Upload failed for ${caseDef.name}: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

const apply = process.argv.includes('--apply');
const results = [];

for (const c of CASES) {
  const row = {
    category: 'case',
    name: c.name,
    price: PRICE_BY_BUCKET[c.bucket],
    specs: `${c.bucket} · ${c.dims.width}×${c.dims.height}×${c.dims.depth}mm`,
    tier: null,
    case_size: c.bucket,
    case_width_mm: c.dims.width,
    case_height_mm: c.dims.height,
    case_depth_mm: c.dims.depth,
    max_gpu_length_mm: c.gpu,
    max_cooler_height_mm: c.cooler,
    max_psu_length_mm: c.psu,
    max_radiator_mm: c.radiator,
    fan_mounts: c.fanMounts,
    sort_order: 100,
    image_url: null,
  };

  if (apply) {
    console.log(`Uploading image for ${c.name}...`);
    row.image_url = await uploadImage(c);
  }

  results.push(row);
}

console.log(`\nTotal new case rows to insert: ${results.length}`);
console.log(JSON.stringify(results, null, 2));

if (apply) {
  const { error } = await supabase.from('components').insert(results);
  if (error) console.error('INSERT FAILED', error.message);
  else console.log(`Inserted ${results.length} rows (with real eD system product photos)`);
} else {
  console.log('\n(dry run — pass --apply to actually download images, upload them, and insert)');
}
