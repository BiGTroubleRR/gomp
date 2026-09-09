// Enriches each live GPU's specs text with real port counts, memory bus width, and recommended
// PSU/power-connector info — pulled directly from eD system a.s.'s own "Technické parametry"
// table (same public, no-login page already used by scripts/fetch-edsystem-gpu-dims.mjs and
// scripts/check-edsystem-gpu-availability.mjs). Real data only: a field is skipped, not guessed,
// if eD's own page doesn't have it.
//
// Appends after whatever's already in specs (the base "capacity · wattage · PCIe" prefix, plus the
// "LxWxDmm" dimension suffix fetch-edsystem-gpu-dims.mjs added for rows it could match) in the
// form: " · N×DP, N×HDMI · NNN-bit bus · rec. NNNW PSU · Nx NN-pin". Idempotent: ENRICH_RE strips
// a previously-appended enrichment block before adding the current one, so re-running this script
// never stacks duplicates.
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

const { data: rows, error } = await supabase.from('components').select('id,name,specs').eq('category', 'gpu');
if (error) { console.error('SELECT failed:', error.message); process.exit(1); }

const apply = process.argv.includes('--apply');
const EDSYSTEM = 'https://edshop.edsystem.cz';
const PAIR_RE = /<th[^>]*>([^<]+?):?<\/th>\s*<td[^>]*>\s*(?:<div>)?\s*([^<]+?)\s*(?:<\/div>)?\s*<\/td>/g;
// Strips a previously-appended enrichment block (starts at the ports segment, runs to end of string).
const ENRICH_RE = / · \d+×DP.*$/;

const results = [];
for (const row of rows) {
  const href = nameToHref.get(row.name);
  if (!href) { results.push({ name: row.name, status: 'NO_URL_MATCH' }); continue; }
  try {
    const res = await fetch(EDSYSTEM + href);
    if (!res.ok) { results.push({ name: row.name, status: `HTTP_${res.status}` }); continue; }
    const html = await res.text();
    const fields = {};
    let m;
    while ((m = PAIR_RE.exec(html))) fields[m[1].trim()] = m[2].trim();

    const dp = fields['DisplayPort']?.match(/\d+/)?.[0];
    const hdmi = fields['HDMI']?.match(/\d+/)?.[0];
    const vga = fields['VGA']?.match(/\d+/)?.[0];
    const dvi = fields['DVI']?.match(/\d+/)?.[0];
    const bus = fields['Paměťová sběrnice'];
    const psuW = fields['Doporučený výkon napájecího zdroje']?.match(/\d+/)?.[0];
    const connector = fields['Napájecí konektory'];

    const parts = [];
    const ports = [dp && `${dp}×DP`, hdmi && `${hdmi}×HDMI`, vga && `${vga}×VGA`, dvi && `${dvi}×DVI`].filter(Boolean);
    if (ports.length) parts.push(ports.join(', '));
    if (bus) parts.push(`${bus} bus`);
    if (psuW) parts.push(`rec. ${psuW}W PSU`);
    if (connector) parts.push(connector);

    if (!parts.length) { results.push({ name: row.name, status: 'NO_FIELDS_FOUND', href }); continue; }

    const base = row.specs.replace(ENRICH_RE, '');
    const newSpecs = `${base} · ${parts.join(' · ')}`;
    results.push({ name: row.name, status: 'OK', oldSpecs: row.specs, newSpecs });
    if (apply) {
      const { error: updErr } = await supabase.from('components').update({ specs: newSpecs }).eq('id', row.id);
      if (updErr) console.error(`UPDATE failed for ${row.name}:`, updErr.message);
    }
  } catch (e) {
    results.push({ name: row.name, status: 'FETCH_ERROR', error: e.message });
  }
  await new Promise((r) => setTimeout(r, 150));
}

const ok = results.filter((r) => r.status === 'OK');
const notOk = results.filter((r) => r.status !== 'OK');
console.log(`Enriched ${ok.length}/${rows.length} live GPU rows.\n`);
for (const r of ok) console.log(`${r.name}\n  old: ${r.oldSpecs}\n  new: ${r.newSpecs}\n`);
if (notOk.length) {
  console.log(`${notOk.length} rows not enriched:`);
  for (const r of notOk) console.log(`  ${r.status.padEnd(16)} ${r.name}`);
}
console.log(apply ? '\nApplied.' : '\n(dry run — pass --apply to write these values)');
