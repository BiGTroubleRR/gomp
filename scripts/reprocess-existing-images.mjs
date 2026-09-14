// One-off backfill: re-processes images uploaded BEFORE src/app/api/admin/upload-image/route.ts
// started resizing/re-encoding on the way in. Those older files can be several MB each, at
// whatever resolution the admin's camera/screenshot produced — this downloads each one, runs it
// through the exact same sharp settings the upload route now applies (resize to fit inside
// 1600x1600, re-encode to WebP q82; SVG/GIF passed through untouched), re-uploads it under a new
// path in the same `component-images` bucket, updates the owning row's image URL(s), and deletes
// the old Storage object once the DB write succeeds.
//
// Covers both tables that store images in this bucket: `components` (image_url, one per row) and
// `customer_builds` (image_urls, an array — every element is reprocessed).
//
// Usage: node --env-file=.env.local scripts/reprocess-existing-images.mjs [--apply]
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const apply = process.argv.includes('--apply');

const BUCKET = 'component-images';
const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 82;
const PUBLIC_PREFIX = `/storage/v1/object/public/${BUCKET}/`;

function pathFromPublicUrl(url) {
  const i = url.indexOf(PUBLIC_PREFIX);
  return i === -1 ? null : url.slice(i + PUBLIC_PREFIX.length);
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

// Returns null if the file is already WebP (already reprocessed, or a fresh upload from the new
// pipeline) or is SVG/GIF (passed through untouched by the live route too) — nothing to do.
async function reprocess(url, nameHint) {
  const oldPath = pathFromPublicUrl(url);
  if (!oldPath) return null;
  if (/\.(webp|svg|gif)$/i.test(oldPath)) return null;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed (${res.status})`);
  const original = Buffer.from(await res.arrayBuffer());

  const resized = await sharp(original)
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  const newPath = `${slugify(nameHint) || 'upload'}-${Date.now()}-${Math.floor(Math.random() * 1e6)}.webp`;
  return { oldPath, newPath, before: original.length, after: resized.length, bytes: resized };
}

async function processComponents() {
  const { data: rows, error } = await supabase.from('components').select('id, name, image_url');
  if (error) { console.error('components: SELECT failed —', error.message); return; }

  const candidates = rows.filter((r) => r.image_url && pathFromPublicUrl(r.image_url) && !/\.(webp|svg|gif)$/i.test(r.image_url));
  console.log(`\ncomponents: ${rows.length} rows, ${candidates.length} with a reprocessable image.`);

  let totalBefore = 0;
  let totalAfter = 0;
  for (const row of candidates) {
    let result;
    try {
      result = await reprocess(row.image_url, row.name);
    } catch (e) {
      console.error(`components[${row.id}] "${row.name}": FAILED —`, e.message);
      continue;
    }
    if (!result) continue;
    totalBefore += result.before;
    totalAfter += result.after;
    console.log(`components[${row.id}] "${row.name}": ${result.before}B -> ${result.after}B`);

    if (apply) {
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(result.newPath, result.bytes, { contentType: 'image/webp', upsert: false });
      if (upErr) { console.error(`  upload failed —`, upErr.message); continue; }
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(result.newPath);
      const { error: dbErr } = await supabase.from('components').update({ image_url: pub.publicUrl }).eq('id', row.id);
      if (dbErr) { console.error(`  DB update failed —`, dbErr.message); continue; }
      await supabase.storage.from(BUCKET).remove([result.oldPath]);
    }
  }
  console.log(`components: ${totalBefore} -> ${totalAfter} bytes across ${candidates.length} candidates (${apply ? 'applied' : 'dry run'}).`);
}

async function processCustomerBuilds() {
  const { data: rows, error } = await supabase.from('customer_builds').select('id, title, image_urls');
  if (error) { console.error('customer_builds: SELECT failed —', error.message); return; }

  console.log(`\ncustomer_builds: ${rows.length} rows.`);

  let totalBefore = 0;
  let totalAfter = 0;
  let touched = 0;
  for (const row of rows) {
    const urls = row.image_urls ?? [];
    const nextUrls = [...urls];
    const oldPaths = [];
    let changed = false;

    for (let i = 0; i < urls.length; i++) {
      let result;
      try {
        result = await reprocess(urls[i], row.title);
      } catch (e) {
        console.error(`customer_builds[${row.id}] "${row.title}" photo ${i}: FAILED —`, e.message);
        continue;
      }
      if (!result) continue;
      totalBefore += result.before;
      totalAfter += result.after;
      console.log(`customer_builds[${row.id}] "${row.title}" photo ${i}: ${result.before}B -> ${result.after}B`);

      if (apply) {
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(result.newPath, result.bytes, { contentType: 'image/webp', upsert: false });
        if (upErr) { console.error(`  upload failed —`, upErr.message); continue; }
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(result.newPath);
        nextUrls[i] = pub.publicUrl;
        oldPaths.push(result.oldPath);
        changed = true;
      }
    }

    if (apply && changed) {
      const { error: dbErr } = await supabase
        .from('customer_builds')
        .update({ image_urls: nextUrls, image_url: nextUrls[0] ?? null })
        .eq('id', row.id);
      if (dbErr) {
        console.error(`  DB update failed for customer_builds[${row.id}] —`, dbErr.message);
      } else {
        await supabase.storage.from(BUCKET).remove(oldPaths);
        touched++;
      }
    }
  }
  console.log(`customer_builds: ${totalBefore} -> ${totalAfter} bytes across ${touched || rows.length} rows checked (${apply ? 'applied' : 'dry run'}).`);
}

await processComponents();
await processCustomerBuilds();
console.log(apply ? '\nApplied.' : '\n(dry run — pass --apply to actually reprocess and re-upload)');
