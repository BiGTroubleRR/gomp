// Checks each live GPU row's real availability status directly on its eD system a.s. product
// page (public, no login needed) and reports the distribution of statuses found, plus which rows
// look genuinely unavailable. Read-only — does not write anything; scripts/hide-unavailable-
// edsystem-gpus.mjs (run after reviewing this report) does the actual is_live flip.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function cleanName(rawTitle) {
  let s = rawTitle.replace(/\s+/g, ' ').trim();
  s = s.replace(/\bVGA\b\s*/gi, '').replace(/\bNVIDIA\b\s*/gi, '').replace(/\bAMD\b\s*/gi, '');
  const parts = s.split(',').map((p) => p.trim()).filter(Boolean);
  let base = parts[0];
  const rest = parts.slice(1).join(' ');
  const mem = rest.match(/GDDR\d+X?/i);
  if (mem && !new RegExp(mem[0], 'i').test(base)) base = `${base} ${mem[0].toUpperCase()}`;
  return base;
}

const scriptText = readFileSync(new URL('./import-edsystem-gpus.mjs', import.meta.url), 'utf8');
const itemRe = /\{"h":"([^"]+)","n":"([^"]+)","i":"[^"]*"\}/g;
const nameToHref = new Map();
for (const m of scriptText.matchAll(itemRe)) {
  const [, href, title] = m;
  const name = cleanName(title);
  if (!nameToHref.has(name)) nameToHref.set(name, href);
}

const { data: rows, error } = await supabase.from('components').select('id,name').eq('category', 'gpu');
if (error) { console.error(error); process.exit(1); }

const EDSYSTEM = 'https://edshop.edsystem.cz';
const STOCK_RE = /pro-stock_text pro-stock_text--append">([^<]+)</;

const results = [];
for (const row of rows) {
  const href = nameToHref.get(row.name);
  if (!href) { results.push({ name: row.name, status: 'NO_URL_MATCH' }); continue; }
  try {
    const res = await fetch(EDSYSTEM + href);
    if (res.status === 404) { results.push({ name: row.name, status: 'PAGE_404' }); continue; }
    if (!res.ok) { results.push({ name: row.name, status: `HTTP_${res.status}` }); continue; }
    const html = await res.text();
    const m = html.match(STOCK_RE);
    results.push({ name: row.name, status: m ? m[1].trim() : 'NO_STOCK_TEXT_FOUND' });
  } catch (e) {
    results.push({ name: row.name, status: `FETCH_ERROR: ${e.message}` });
  }
  await new Promise((r) => setTimeout(r, 150));
}

const byStatus = {};
for (const r of results) (byStatus[r.status] ??= []).push(r.name);
console.log('=== Distribution of availability statuses across', results.length, 'live GPU rows ===\n');
for (const [status, names] of Object.entries(byStatus).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${status}  (${names.length})`);
  for (const n of names) console.log('   -', n);
}
