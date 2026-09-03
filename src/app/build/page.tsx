'use client';

import { useEffect, useMemo, useRef, useState, useCallback, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter, usePathname } from 'next/navigation';
import { useSite } from '@/contexts/SiteContext';
import TransitionLink from '@/components/TransitionLink';
import SiteNav from '@/components/SiteNav';
import { navigateWithTransition } from '@/lib/gomp-nav';
import { writeJSON } from '@/lib/gomp-storage';
import { fetchComponentDb, subscribeComponents } from '@/lib/supabase/components';
import { passmarkLookup, tierFromPassmark, ramTier, TIER_COLORS, type Tier } from '@/lib/passmark';
import TierGlowOrb from '@/components/TierGlowOrb';
import {
  defaultComponentDb,
  caseFitsFormFactor,
  caseHasVerticalGpuMount,
  fitsInCase,
  cpuManufacturer,
  ramBrand,
  extractWatts,
  BASE_WATTS,
  DEFAULT_FAN_WATTS,
  RAM_DIMM_SIZE_MM,
  PSU_ATX_SIZE_MM,
  moboPcieGeneration,
  storagePcieGeneration,
  type Category,
  type Component,
  type ComponentDb,
  type FanMountPosition,
  type FormFactor,
  type PcieGen,
} from '@/lib/component-db-seed';
import { autoBuildForBudget, BUDGET_STEPS, type AutoBuildNote } from '@/lib/auto-build';
import {
  createBuildScene,
  SLOTS,
  CASE_SIZES,
  mmToUnits,
  cm,
  caseUnitsFor,
  ramModuleCount,
  ramPerStickCapacityGB,
  moboRamSlotCount,
  dimensionSpecsFor,
  type BuildScene,
  type CompId,
} from '@/lib/build-scene';
import { useIsMobile } from '@/lib/use-media-query';
import { setDustCursorVisible, isDustEnabled } from '@/lib/cursor-dust';

const T = {
  en: {
    nav_home: 'Home', nav_shop: 'Shop', nav_build: 'Build', nav_about: 'About', nav_account: 'Account',
    pc_builder: 'PC Builder', select_components: 'Select components to add', build_complete: 'Build Complete PC',
    clear_all: 'Clear All', drag_to_orbit: 'Drag to orbit  ·  Scroll to zoom', hide_panel: 'Hide Side Panel',
    show_panel: 'Show Side Panel', complete: 'Complete', your_build: 'Your Build', selected_part: 'Selected Part',
    build_total: 'Build Total', passmark_score: 'PassMark Score', verify_passmark: 'Verify on PassMark ↗', dimensions: 'Dimensions',
    passmark_title: (score: number) => `PassMark: ${score.toLocaleString()}`,
    fans: 'Case Fans',
    fan_positions: { front: 'Front', top: 'Top', rear: 'Rear', bottom: 'Bottom', side: 'Side' },
    fan_generic: 'Generic (unbranded)', fan_included: 'included',
    show_can: 'Add Can for Scale', hide_can: 'Remove Can', show_dims: 'Show Dimensions', hide_dims: 'Hide Dimensions',
    continue_benchmarks: 'Continue to Benchmarks →', save_build: 'Save Build', preparing_order: 'Booting up your legend...',
    no_components: '(no components — add in Admin)', none_add_admin: '(none — add in Admin)',
    cat_names: { mobo: 'Motherboard', cpu: 'CPU', cooler: 'CPU Cooler', ram: 'RAM', gpu: 'GPU', storage: 'Storage', psu: 'PSU', case: 'Case' },
    cat_desc: {
      mobo: 'The foundation of your build — defines CPU compatibility, expansion options, and overclocking potential.',
      cpu: 'The brain of your system, handling all compute tasks from gaming to content creation.',
      cooler: 'Keeps your CPU running cool and quiet under sustained load.',
      ram: 'High-speed memory for snappy multitasking and improved frame rates.',
      gpu: 'Drives your gaming visuals and accelerates creative workloads.',
      storage: 'Fast NVMe storage for quick boot times and near-instant load times.',
      psu: 'Stable, efficient power delivery for your entire system.',
      case: 'The enclosure that defines your form factor, airflow, and aesthetics — and scales the 3D preview live.',
    },
    case_cats: [
      { id: 'Full Tower', label: 'Full Tower  (55–75 cm)' },
      { id: 'Mid Tower', label: 'Mid Tower   (35–55 cm)' },
      { id: 'Mini Tower', label: 'Mini Tower  (30–45 cm)' },
      { id: 'SFF', label: 'SFF          (< 35 cm)' },
    ],
    installed: (n: number) => `${n} / 8 installed`,
    ofComponents: (n: number) => `${n} of 8 components`,
    step_of: (n: number) => `Step ${n} of 8`,
    back: 'Back', next: 'Next', size: 'Size',
    no_socket_match: (socket: string) => `No CPUs match the ${socket} socket of your selected motherboard — pick a different motherboard, or check Admin.`,
    no_case_fit: (formFactor: string) => `No cases fit a ${formFactor} motherboard at this size — try a larger size, or a smaller motherboard.`,
    no_mobo_fit_case: (caseCategory: string) => `No motherboards fit a ${caseCategory} case — try a larger case, or a smaller motherboard.`,
    no_part_fit: (caseName: string) => `Nothing here fits inside the ${caseName} — pick a bigger case, or a smaller part.`,
    no_case_fit_part: 'No cases at this size fit everything you already picked — try a larger size, or remove a part.',
    no_ram_match: 'No RAM kits match this filter — try a lower minimum speed, or a different DDR generation.',
    ram_gen_all: 'All', ram_min_speed: 'Minimum speed', ram_min_speed_any: 'Any',
    ram_from_price: (price: string) => `from ${price}`,
    ram_back_to_brand_speed: '← Brand & speed',
    ram_choose_sticks: 'RAM count',
    ram_choose_capacity: 'Capacity per RAM',
    filter_all: 'All',
    show_more: (n: number) => `Show ${n} more`, show_less: 'Show less',
    no_mobo_match: 'No motherboards match this filter — try a different socket or form factor.',
    no_socket_match_mobo: (socket: string) => `No motherboards match the ${socket} socket of your selected CPU — pick a different CPU, or check Admin.`,
    no_cpu_mfr_match: (mfr: string) => `No ${mfr} CPUs match your other filters.`,
    no_storage_match: 'No storage drives match this filter — try a different PCIe generation.',
    storage_pcie_capped_title: 'Bottlenecked',
    storage_pcie_capped: (ssdGen: number, moboGen: number) =>
      `This is a PCIe ${ssdGen}.0 drive, but the selected motherboard's fastest M.2 slot is PCIe ${moboGen}.0 — it'll run, just capped to Gen ${moboGen} speed.`,
    sort_by_tier: 'Sort by tier',
    power_draw: 'Estimated power draw',
    psu_ok: 'Comfortably within your PSU’s capacity.',
    psu_insufficient: 'Over your PSU’s rated capacity — pick a higher-wattage unit.',
    budget: 'Budget',
    budget_hint: 'Drag, then Build Complete PC picks the best value for this amount.',
    auto_build_note_psu_over_budget: 'Picked a pricier PSU than this budget’s share to keep power delivery safe.',
    auto_build_note_case_over_budget: 'Picked a pricier case than this budget’s share so everything actually fits.',
    auto_build_note_no_psu_sufficient: 'No PSU in the catalog comfortably covers this build’s power draw — picked the highest-wattage one available.',
    auto_build_note_no_case_fits: 'No case fits every picked part at once — picked the roomiest one available.',
    auto_build_note_category_empty: (cat: string) => `No ${cat} available in the catalog yet.`,
  },
  sk: {
    nav_home: 'Domov', nav_shop: 'Obchod', nav_build: 'Zostaviť', nav_about: 'O nás', nav_account: 'Účet',
    pc_builder: 'Konfigurátor PC', select_components: 'Vyberte komponenty na pridanie', build_complete: 'Zostaviť kompletné PC',
    clear_all: 'Vymazať všetko', drag_to_orbit: 'Ťahaním otáčať  ·  Kolieskom priblížiť', hide_panel: 'Skryť bočný panel',
    show_panel: 'Zobraziť bočný panel', complete: 'Dokončené', your_build: 'Vaša zostava', selected_part: 'Vybraný diel',
    build_total: 'Celková cena', passmark_score: 'Skóre PassMark', verify_passmark: 'Overiť na PassMark ↗', dimensions: 'Rozmery',
    passmark_title: (score: number) => `PassMark: ${score.toLocaleString()}`,
    fans: 'Ventilátory skrine',
    fan_positions: { front: 'Predné', top: 'Horné', rear: 'Zadné', bottom: 'Spodné', side: 'Bočné' },
    fan_generic: 'Bez značky', fan_included: 'v cene',
    show_can: 'Vložiť plechovku pre mierku', hide_can: 'Odstrániť plechovku', show_dims: 'Zobraziť rozmery', hide_dims: 'Skryť rozmery',
    continue_benchmarks: 'Pokračovať na benchmarky →', save_build: 'Uložiť zostavu', preparing_order: 'Spúšťame vašu legendu...',
    no_components: '(žiadne komponenty — pridajte v Admine)', none_add_admin: '(žiadne — pridajte v Admine)',
    cat_names: { mobo: 'Základná doska', cpu: 'CPU', cooler: 'Chladič CPU', ram: 'RAM', gpu: 'GPU', storage: 'Úložisko', psu: 'Zdroj', case: 'Skriňa' },
    cat_desc: {
      mobo: 'Základ vašej zostavy — určuje kompatibilitu s CPU, možnosti rozšírenia a potenciál na pretaktovanie.',
      cpu: 'Mozog vášho systému, ktorý zvláda všetky výpočtové úlohy od hrania po tvorbu obsahu.',
      cooler: 'Udržiava váš CPU chladný a tichý aj pri dlhodobej záťaži.',
      ram: 'Vysokorýchlostná pamäť pre plynulý multitasking a lepšie snímkové frekvencie.',
      gpu: 'Poháňa herné vizuály a urýchľuje kreatívne úlohy.',
      storage: 'Rýchle NVMe úložisko pre okamžité spustenie a takmer bezprostredné načítanie.',
      psu: 'Stabilné a efektívne napájanie pre celý váš systém.',
      case: 'Skriňa určuje formát, prúdenie vzduchu a estetiku — a naživo mení mierku 3D náhľadu.',
    },
    case_cats: [
      { id: 'Full Tower', label: 'Veľká skriňa  (55–75 cm)' },
      { id: 'Mid Tower', label: 'Stredná skriňa (35–55 cm)' },
      { id: 'Mini Tower', label: 'Malá skriňa  (30–45 cm)' },
      { id: 'SFF', label: 'Mini skriňa    (< 35 cm)' },
    ],
    installed: (n: number) => `${n} / 8 nainštalovaných`,
    ofComponents: (n: number) => `${n} z 8 komponentov`,
    step_of: (n: number) => `Krok ${n} z 8`,
    back: 'Späť', next: 'Ďalej', size: 'Veľkosť',
    no_socket_match: (socket: string) => `Žiadne CPU nesedí na pätici ${socket} vybranej základnej dosky — zvoľte inú dosku, alebo skontrolujte Admin.`,
    no_case_fit: (formFactor: string) => `Žiadna skriňa tejto veľkosti neposkytne miesto pre dosku ${formFactor} — skúste väčšiu veľkosť alebo menšiu dosku.`,
    no_mobo_fit_case: (caseCategory: string) => `Žiadna základná doska sa nezmestí do skrine ${caseCategory} — skúste väčšiu skriňu alebo menšiu dosku.`,
    no_part_fit: (caseName: string) => `Nič tu sa nezmestí do skrine ${caseName} — zvoľte väčšiu skriňu alebo menší diel.`,
    no_case_fit_part: 'Žiadna skriňa tejto veľkosti neposkytne miesto pre všetko, čo ste už vybrali — skúste väčšiu veľkosť alebo odstráňte diel.',
    no_ram_match: 'Žiadna sada RAM nevyhovuje tomuto filtru — skúste nižšiu minimálnu rýchlosť alebo inú generáciu DDR.',
    ram_gen_all: 'Všetky', ram_min_speed: 'Minimálna rýchlosť', ram_min_speed_any: 'Ľubovoľná',
    ram_from_price: (price: string) => `od ${price}`,
    ram_back_to_brand_speed: '← Značka a rýchlosť',
    ram_choose_sticks: 'Počet RAM',
    ram_choose_capacity: 'Kapacita na RAM',
    filter_all: 'Všetky',
    show_more: (n: number) => `Zobraziť ďalších ${n}`, show_less: 'Zobraziť menej',
    no_mobo_match: 'Žiadna základná doska nevyhovuje tomuto filtru — skúste inú pätici alebo formát.',
    no_socket_match_mobo: (socket: string) => `Žiadna základná doska nesedí na pätici ${socket} vybraného CPU — zvoľte iné CPU, alebo skontrolujte Admin.`,
    no_cpu_mfr_match: (mfr: string) => `Žiadne CPU značky ${mfr} nevyhovuje ostatným filtrom.`,
    no_storage_match: 'Žiadne úložisko nevyhovuje tomuto filtru — skúste inú generáciu PCIe.',
    storage_pcie_capped_title: 'Obmedzená rýchlosť',
    storage_pcie_capped: (ssdGen: number, moboGen: number) =>
      `Toto je disk PCIe ${ssdGen}.0, ale najrýchlejší M.2 slot vybranej základnej dosky je PCIe ${moboGen}.0 — bude fungovať, len obmedzený na rýchlosť Gen ${moboGen}.`,
    sort_by_tier: 'Zoradiť podľa triedy',
    power_draw: 'Odhadovaný príkon',
    psu_ok: 'S rezervou v rámci kapacity vášho zdroja.',
    psu_insufficient: 'Nad menovitú kapacitu vášho zdroja — zvoľte silnejší zdroj.',
    budget: 'Rozpočet',
    budget_hint: 'Potiahnite a „Zostaviť kompletné PC“ vyberie najlepší pomer ceny a výkonu za túto sumu.',
    auto_build_note_psu_over_budget: 'Vybraný drahší zdroj, než by pripadalo na tento rozpočet — pre bezpečné napájanie.',
    auto_build_note_case_over_budget: 'Vybraná drahšia skriňa, než by pripadalo na tento rozpočet — aby sa všetko naozaj zmestilo.',
    auto_build_note_no_psu_sufficient: 'Žiadny zdroj v katalógu s rezervou nepokryje príkon tejto zostavy — vybraný najsilnejší dostupný.',
    auto_build_note_no_case_fits: 'Žiadna skriňa nepojme všetky vybrané diely naraz — vybraná najpriestrannejšia dostupná.',
    auto_build_note_category_empty: (cat: string) => `V katalógu zatiaľ nie je k dispozícii žiadna kategória ${cat}.`,
  },
  cz: {
    nav_home: 'Domů', nav_shop: 'Obchod', nav_build: 'Sestavit', nav_about: 'O nás', nav_account: 'Účet',
    pc_builder: 'Konfigurátor PC', select_components: 'Vyberte komponenty k přidání', build_complete: 'Sestavit kompletní PC',
    clear_all: 'Vymazat vše', drag_to_orbit: 'Tažením otáčet  ·  Kolečkem přiblížit', hide_panel: 'Skrýt boční panel',
    show_panel: 'Zobrazit boční panel', complete: 'Dokončeno', your_build: 'Vaše sestava', selected_part: 'Vybraný díl',
    build_total: 'Celková cena', passmark_score: 'Skóre PassMark', verify_passmark: 'Ověřit na PassMark ↗', dimensions: 'Rozměry',
    passmark_title: (score: number) => `PassMark: ${score.toLocaleString()}`,
    fans: 'Ventilátory skříně',
    fan_positions: { front: 'Přední', top: 'Horní', rear: 'Zadní', bottom: 'Spodní', side: 'Boční' },
    fan_generic: 'Bez značky', fan_included: 'v ceně',
    show_can: 'Vložit plechovku pro měřítko', hide_can: 'Odebrat plechovku', show_dims: 'Zobrazit rozměry', hide_dims: 'Skrýt rozměry',
    continue_benchmarks: 'Pokračovat na benchmarky →', save_build: 'Uložit sestavu', preparing_order: 'Spouštíme vaši legendu...',
    no_components: '(žádné komponenty — přidejte v Adminu)', none_add_admin: '(žádné — přidejte v Adminu)',
    cat_names: { mobo: 'Základní deska', cpu: 'CPU', cooler: 'Chladič CPU', ram: 'RAM', gpu: 'GPU', storage: 'Úložiště', psu: 'Zdroj', case: 'Skříň' },
    cat_desc: {
      mobo: 'Základ vaší sestavy — určuje kompatibilitu s CPU, možnosti rozšíření a potenciál pro přetaktování.',
      cpu: 'Mozek vašeho systému, který zvládá všechny výpočetní úlohy od hraní po tvorbu obsahu.',
      cooler: 'Udržuje váš CPU chladný a tichý i při dlouhodobé zátěži.',
      ram: 'Vysokorychlostní paměť pro plynulý multitasking a lepší snímkovou frekvenci.',
      gpu: 'Pohání herní vizuály a urychluje kreativní úlohy.',
      storage: 'Rychlé NVMe úložiště pro rychlé spouštění a téměř okamžité načítání.',
      psu: 'Stabilní a efektivní napájení pro celý váš systém.',
      case: 'Skříň určuje formát, proudění vzduchu a estetiku — a naživo mění měřítko 3D náhledu.',
    },
    case_cats: [
      { id: 'Full Tower', label: 'Velká skříň  (55–75 cm)' },
      { id: 'Mid Tower', label: 'Střední skříň (35–55 cm)' },
      { id: 'Mini Tower', label: 'Malá skříň  (30–45 cm)' },
      { id: 'SFF', label: 'Mini skříň    (< 35 cm)' },
    ],
    installed: (n: number) => `${n} / 8 nainstalováno`,
    ofComponents: (n: number) => `${n} z 8 komponent`,
    step_of: (n: number) => `Krok ${n} z 8`,
    back: 'Zpět', next: 'Další', size: 'Velikost',
    no_socket_match: (socket: string) => `Žádné CPU nesedí na patici ${socket} vybrané základní desky — zvolte jinou desku, nebo zkontrolujte Admin.`,
    no_case_fit: (formFactor: string) => `Žádná skříň této velikosti neposkytne místo pro desku ${formFactor} — zkuste větší velikost nebo menší desku.`,
    no_mobo_fit_case: (caseCategory: string) => `Žádná základní deska se nevejde do skříně ${caseCategory} — zkuste větší skříň nebo menší desku.`,
    no_part_fit: (caseName: string) => `Nic z tohoto se nevejde do skříně ${caseName} — zvolte větší skříň nebo menší díl.`,
    no_case_fit_part: 'Žádná skříň této velikosti neposkytne místo pro vše, co jste již vybrali — zkuste větší velikost nebo odeberte díl.',
    no_ram_match: 'Žádná sada RAM nevyhovuje tomuto filtru — zkuste nižší minimální rychlost nebo jinou generaci DDR.',
    ram_gen_all: 'Všechny', ram_min_speed: 'Minimální rychlost', ram_min_speed_any: 'Libovolná',
    ram_from_price: (price: string) => `od ${price}`,
    ram_back_to_brand_speed: '← Značka a rychlost',
    ram_choose_sticks: 'Počet modulů RAM',
    ram_choose_capacity: 'Kapacita na modul',
    filter_all: 'Všechny',
    show_more: (n: number) => `Zobrazit dalších ${n}`, show_less: 'Zobrazit méně',
    no_mobo_match: 'Žádná základní deska nevyhovuje tomuto filtru — zkuste jinou patici nebo formát.',
    no_socket_match_mobo: (socket: string) => `Žádná základní deska nesedí na patici ${socket} vybraného CPU — zvolte jiné CPU, nebo zkontrolujte Admin.`,
    no_cpu_mfr_match: (mfr: string) => `Žádné CPU značky ${mfr} nevyhovuje ostatním filtrům.`,
    no_storage_match: 'Žádné úložiště nevyhovuje tomuto filtru — zkuste jinou generaci PCIe.',
    storage_pcie_capped_title: 'Omezená rychlost',
    storage_pcie_capped: (ssdGen: number, moboGen: number) =>
      `Toto je disk PCIe ${ssdGen}.0, ale nejrychlejší M.2 slot vybrané základní desky je PCIe ${moboGen}.0 — bude fungovat, jen omezený na rychlost Gen ${moboGen}.`,
    sort_by_tier: 'Seřadit podle třídy',
    power_draw: 'Odhadovaný příkon',
    psu_ok: 'S rezervou v rámci kapacity vašeho zdroje.',
    psu_insufficient: 'Nad jmenovitou kapacitu vašeho zdroje — zvolte silnější zdroj.',
    budget: 'Rozpočet',
    budget_hint: 'Přetáhněte a „Sestavit kompletní PC“ vybere nejlepší poměr ceny a výkonu za tuto částku.',
    auto_build_note_psu_over_budget: 'Vybrán dražší zdroj, než by připadalo na tento rozpočet — pro bezpečné napájení.',
    auto_build_note_case_over_budget: 'Vybrána dražší skříň, než by připadalo na tento rozpočet — aby se vše skutečně vešlo.',
    auto_build_note_no_psu_sufficient: 'Žádný zdroj v katalogu s rezervou nepokryje příkon této sestavy — vybrán nejsilnější dostupný.',
    auto_build_note_no_case_fits: 'Žádná skříň nepojme všechny vybrané díly najednou — vybrána nejprostornější dostupná.',
    auto_build_note_category_empty: (cat: string) => `V katalogu zatím není k dispozici žádná kategorie ${cat}.`,
  },
} as const;

const BG = '#F5F0E6';
const PANEL = '#FDFAF4';
const INK = '#1C1C1A';
const MUTED = '#7A7469';
const MAROON = '#6E1423';
const GOLD = '#C4A35A';
const POSH_GREEN = '#5C7A5C'; // muted sage, so the wattage bar's "safe" end still reads as part of the site's palette

// Best-to-worst tier order for the sort-by-tier toggle; an unset tier (bulk-imported SKUs with
// no PassMark score — see the Component.tier comment in component-db-seed.ts) sorts last rather
// than throwing off indexOf('') === -1 landing before 'S'.
const TIER_ORDER = ['S', 'A', 'B', 'C', 'D', ''];
// mobo/cpu/ram get their own dedicated filters (socket+form-factor, manufacturer, DDR+speed)
// instead — sort-by-tier is for the categories that only have a plain tier to go on.
const SORT_BY_TIER_STEPS: CompId[] = ['cooler', 'gpu', 'storage', 'psu', 'case'];
// How many picker rows render before the list caps to a "Show N more" button — mobo/cpu/gpu
// already sit at 25 rows even in the small static fallback catalog, and the bulk-import scripts
// are designed to push several categories into the hundreds, so an uncapped list isn't a
// hypothetical problem. Counted post-filter/post-grouping, so a narrowed-down list under this
// count never shows the button at all.
const SHOW_MORE_STEP = 8;

// Stage-1 grouping key for the RAM picker: brand + speed only, independent of ramFamily (which
// is scoped to one fixed per-stick capacity, so the same brand+speed can span several ramFamily
// values — see the plan this was built from). Works for hand-curated rows too since ramSpeedMhz
// and the brand-from-name convention are both already structured/derivable for every row.
function ramBrandSpeedKey(c: Component): string {
  return `${ramBrand(c.name)}|${c.ramSpeedMhz ?? 'x'}`;
}

// Real 4-DIMM kits are rare in the mined catalog data — most brand+speed groups only have 1x/2x
// rows. Rather than leaving the RAM stage-2 stick-count row stuck at 1x/2x for those, synthesize
// a 4x option priced as two of the cheapest matching 2x kit (the real-world way to actually reach
// 4 sticks when no bundled 4-pack SKU/price exists) for every brand+speed+per-stick-capacity
// combo that has a 2x row but no real 4x row at that same capacity. Skipped entirely wherever a
// real 4x SKU already covers that capacity, so an actual bundled kit's own price always wins.
function synthesizeDoubledRamKits(ramList: Component[]): Component[] {
  const byBrandSpeed = new Map<string, Component[]>();
  ramList.forEach((c) => {
    const key = ramBrandSpeedKey(c);
    if (!byBrandSpeed.has(key)) byBrandSpeed.set(key, []);
    byBrandSpeed.get(key)!.push(c);
  });

  const synthetic: Component[] = [];
  byBrandSpeed.forEach((rows) => {
    const realFourCapacities = new Set(
      rows.filter((c) => ramModuleCount(c) === 4).map((c) => ramPerStickCapacityGB(c)),
    );
    const cheapestTwoByCapacity = new Map<number, Component>();
    rows.filter((c) => ramModuleCount(c) === 2).forEach((c) => {
      const capacity = ramPerStickCapacityGB(c);
      if (capacity == null) return;
      const existing = cheapestTwoByCapacity.get(capacity);
      if (!existing || c.price < existing.price) cheapestTwoByCapacity.set(capacity, c);
    });
    cheapestTwoByCapacity.forEach((base, capacity) => {
      if (realFourCapacities.has(capacity)) return;
      const specs = `${base.specs.replace(/^2(\s*×)/, '4$1')} · 2× kits`;
      synthetic.push({
        ...base,
        id: `${base.id}::x2kit`,
        // Must differ from the base kit's name — every selection/lookup in this file is keyed by
        // component name (selections[id] stores a name, not an id), so the 2x and synthesized 4x
        // rows need distinct names or they'd resolve to the same catalog entry once picked.
        name: `${base.name} (2× kits)`,
        price: Math.round(base.price * 2),
        specs,
        // Recomputed against the doubled specs (4 sticks, not 2) rather than inherited from
        // base — tier now depends on stick count, so a synthetic 4-stick bundle should get the
        // 4-stick bonus, not silently keep the base 2-stick kit's tier.
        tier: ramTier(base.ramSpeedMhz, specs) ?? base.tier,
      });
    });
  });
  return synthetic;
}

// fanName is optional: a position can still be filled with a generic, unbranded fan (free, purely
// cosmetic — today's original behavior) when the case has no preinstalledFanName for it and the
// visitor hasn't swapped in a real product from the 'fan' catalog either.
type FanConfig = Partial<Record<FanMountPosition, { count: number; sizeMm: number; fanName?: string }>>;

// Seeds fanConfig from whatever the case actually ships with (see FanMountSpec.preinstalledFanName/
// preinstalledCount in component-db-seed.ts) instead of the old empty-until-touched default —
// a freshly-picked case should visibly show its real stock fans, not look like it has none.
function defaultFanConfigForCase(caseComp: Component | undefined, fanDb: Component[]): FanConfig {
  const out: FanConfig = {};
  (caseComp?.fanMounts || []).forEach((m) => {
    if (!m.preinstalledCount) return;
    const fan = m.preinstalledFanName ? fanDb.find((f) => f.name === m.preinstalledFanName) : undefined;
    out[m.position] = { count: m.preinstalledCount, sizeMm: fan?.fanSizeMm ?? m.sizesMm[0], fanName: m.preinstalledFanName };
  });
  return out;
}

function TierBadge({ tier, small }: { tier?: Tier; small?: boolean }) {
  if (!tier) return null;
  const c = TIER_COLORS[tier];
  const sz = small ? 18 : 22;
  return (
    <div
      style={{
        width: sz, height: sz, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: c.bg, color: c.text, border: `1.5px solid ${c.border}`, borderRadius: 3,
        fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: small ? 10 : 12,
      }}
    >
      {tier}
    </div>
  );
}

// Small monospace tag for a CPU/motherboard's socket or a motherboard's form factor — shown
// right next to the tier badge on picker cards so compatibility is visible before you click.
function SpecPill({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: '2px 6px', borderRadius: 3, border: '1px solid rgba(28,28,26,0.2)',
        fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 9, color: MUTED, whiteSpace: 'nowrap',
      }}
    >
      {label}
    </div>
  );
}

// Shared small toggle-chip look already used inline for the case-size buckets — pulled out once
// there were three separate filter rows (mobo socket/form-factor, cpu manufacturer) that all
// needed the exact same active/inactive styling.
function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 9px', borderRadius: 4,
        border: `1px solid ${active ? MAROON : 'rgba(28,28,26,0.2)'}`,
        background: active ? 'rgba(110,20,35,0.08)' : 'transparent',
        color: active ? MAROON : MUTED,
        fontFamily: 'var(--font-mono)', fontSize: 9, cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

// Feeds the .gomp-slider CSS (globals.css) the current fill percentage — WebKit has no built-in
// "filled track" the way Firefox's ::-moz-range-progress does, so both browsers read this same
// custom property, one driven by JS and the other effectively ignoring it in favor of its own.
function sliderFillStyle(value: number, max: number): CSSProperties {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return { ['--gomp-slider-fill' as string]: `${pct}%` } as CSSProperties;
}

// Same data, formatted as a single line of text for the side panel / hover tooltip (the 3D
// annotations above are the blueprint-style version of the same numbers).
function dimensionLabel(id: CompId, comp: Component | undefined): string | null {
  if (!comp) return null;
  if (id === 'case' && comp.caseWidthMm && comp.caseHeightMm && comp.caseDepthMm) {
    return `${cm(comp.caseWidthMm)} × ${cm(comp.caseHeightMm)} × ${cm(comp.caseDepthMm)}`;
  }
  if (id === 'gpu' && comp.gpuLengthMm) {
    return comp.gpuSlotWidth ? `${cm(comp.gpuLengthMm)} long · ${comp.gpuSlotWidth}-slot` : `${cm(comp.gpuLengthMm)} long`;
  }
  if (id === 'cooler') {
    if (comp.coolerRadiatorMm) return `${cm(comp.coolerRadiatorMm)} radiator`;
    if (comp.coolerHeightMm) return `${cm(comp.coolerHeightMm)} tall`;
  }
  if (id === 'psu' && comp.psuLengthMm) return `${cm(PSU_ATX_SIZE_MM.width)} × ${cm(PSU_ATX_SIZE_MM.height)} × ${cm(comp.psuLengthMm)}`;
  // Motherboard size is deliberately not quoted — ATX/mATX/E-ATX/Mini-ITX are standard size
  // classes already shown as their own badge, so exact cm figures on top are redundant.
  // RAM length is dropped for the same reason (every desktop DIMM is 133.35mm) — only the
  // height actually varies by SKU, and it's the one that can collide with a tall air cooler.
  if (id === 'ram') return `${cm(comp.ramHeightMm ?? RAM_DIMM_SIZE_MM.height)} tall`;
  // Storage isn't quoted at all — every M.2 drive here is the same fixed 2280 size, nothing to
  // call out (see the matching annotate: false in build-scene.ts's dimensionSpecsFor).
  return null;
}

export default function BuildPage() {
  const { lang, fmt } = useSite();
  const router = useRouter();
  const pathname = usePathname();
  const t = T[lang];
  function autoBuildNoteMessage(note: AutoBuildNote): string {
    switch (note.code) {
      case 'psu_over_budget':
        return t.auto_build_note_psu_over_budget;
      case 'case_over_budget':
        return t.auto_build_note_case_over_budget;
      case 'no_psu_sufficient':
        return t.auto_build_note_no_psu_sufficient;
      case 'no_case_fits':
        return t.auto_build_note_no_case_fits;
      case 'category_empty':
        return t.auto_build_note_category_empty(t.cat_names[note.category as CompId]);
    }
  }
  const isMobile = useIsMobile();
  // Desktop's sidebar/right panel float semi-transparently over the 3D scene — a hard cream
  // outline (four offset copies, not just a soft blur) keeps the text legible against both the
  // light empty scene and the dark case body, since a single soft halo isn't opaque enough at
  // small sizes to beat a mid-gray backdrop. Mobile keeps a fully opaque panel (see below), so
  // it needs no such treatment.
  const textPop: CSSProperties = !isMobile
    ? {
        textShadow:
          '0 0 4px #FDFAF4, 0 0 4px #FDFAF4, 1px 1px 1px #FDFAF4, -1px -1px 1px #FDFAF4, 1px -1px 1px #FDFAF4, -1px 1px 1px #FDFAF4',
      }
    : {};

  const [compDb, setCompDb] = useState<ComponentDb>(defaultComponentDb());
  const [selected, setSelected] = useState<Record<CompId, boolean>>({} as Record<CompId, boolean>);
  const [selections, setSelections] = useState<Record<CompId, string>>({} as Record<CompId, string>);
  const [caseCat, setCaseCat] = useState('Mid Tower');
  const [ramGenFilter, setRamGenFilter] = useState<0 | 4 | 5>(0); // 0 = all generations
  const [storagePcieGenFilter, setStoragePcieGenFilter] = useState<0 | PcieGen>(0); // 0 = all generations
  const [ramMinSpeedIdx, setRamMinSpeedIdx] = useState(0); // index into the speed steps computed below; 0 = no minimum
  const [moboSocketFilter, setMoboSocketFilter] = useState(''); // '' = all sockets
  const [moboFormFactorFilter, setMoboFormFactorFilter] = useState(''); // '' = all form factors
  const [cpuMfrFilter, setCpuMfrFilter] = useState(''); // '' = all manufacturers
  const [sortByTier, setSortByTier] = useState(false); // cooler/gpu/storage/psu/case only
  // Two-stage RAM picker: stage 1 picks brand + speed, stage 2 switches to a 1×/2×/4×
  // stick-count filter for that group (with a capacity sub-choice only when a count maps to more
  // than one per-stick capacity). selectedBrandSpeedKey is `${brand}|${speedMHz}` — see
  // ramBrandSpeedKey below. Reset/restored whenever the RAM step is (re)entered, see the effect
  // near ramSpeedSteps.
  const [ramStage, setRamStage] = useState<'brandSpeed' | 'sticks'>('brandSpeed');
  const [selectedBrandSpeedKey, setSelectedBrandSpeedKey] = useState<string | null>(null);
  // Once a stick count maps to more than one per-stick capacity, this holds which count is
  // currently expanded to show its capacity sub-row (null = no count expanded yet / resolved).
  const [expandedStickCount, setExpandedStickCount] = useState<number | null>(null);
  // Per-category "show all" flag for the picker list cap (see SHOW_MORE_STEP below) — a category
  // stays expanded if you leave and come back to it, but a freshly-opened one starts capped.
  const [showAllByStep, setShowAllByStep] = useState<Partial<Record<CompId, boolean>>>({});
  const [budgetIdx, setBudgetIdx] = useState(Math.floor(BUDGET_STEPS.length / 2)); // index into BUDGET_STEPS
  const [autoBuildNotes, setAutoBuildNotes] = useState<AutoBuildNote[]>([]);
  // Set while buildAll is waiting for an existing build's clear-out to actually finish before
  // rebuilding fresh — see the effect below for why this can't just be a setTimeout.
  const [rebuildPending, setRebuildPending] = useState(false);
  // Drives the right sidebar's picked-components list: the row for this category renders its
  // full detail card instead of its compact summary for a few seconds after a pick, then
  // collapses back down — see flashRecentlyPicked below.
  const [recentlyPickedId, setRecentlyPickedId] = useState<CompId | null>(null);
  const recentlyPickedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeStep, setActiveStep] = useState<CompId>(SLOTS[0]);
  const [ordering, setOrdering] = useState(false);
  const [glassHidden, setGlassHidden] = useState(false);
  const [canVisible, setCanVisible] = useState(false);
  const [dimensionsVisible, setDimensionsVisible] = useState(true);
  const [fanConfig, setFanConfigState] = useState<FanConfig>({});
  const [showComplete, setShowComplete] = useState(false);
  const [completionRunning, setCompletionRunning] = useState(false);
  const [hoverId, setHoverId] = useState<CompId | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  // Drives the tier glow's hover-brightened state on picker cards — kept separate from
  // hoverId/hoverPos above, which are driven by 3D-viewport raycasting and also open the
  // viewport's own hover-preview popup; reusing them here would trigger that popup on every
  // card hover too. Keyed the same way as each card's own React key (ramFamily when grouped,
  // otherwise id) so a RAM family's stick-count variants glow as one unit.
  const [hoveredCardKey, setHoveredCardKey] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BuildScene | null>(null);

  // Load the shared component catalog from Supabase (managed by /admin) on mount, and keep it
  // live: any Admin edit (insert/update/delete) broadcasts over Realtime and gets refetched
  // here, so an already-open /build tab picks up new prices/stock without a reload. Per-slot
  // selections are only seeded once, from that very first load — later catalog refreshes must
  // not silently reset whatever the visitor has already picked.
  const catalogInitializedRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const db = await fetchComponentDb();
      if (cancelled) return;
      // fetchComponentDb is shared with Admin, which needs to see hidden SKUs too (to toggle them
      // back live) — the public catalog is the one place that must actually drop them.
      SLOTS.forEach((id) => {
        db[id] = (db[id] || []).filter((c) => c.isLive !== false);
      });
      db.ram = [...(db.ram || []), ...synthesizeDoubledRamKits(db.ram || [])];
      setCompDb(db);
      if (!catalogInitializedRef.current) {
        catalogInitializedRef.current = true;
        const initSelections = {} as Record<CompId, string>;
        SLOTS.forEach((id) => {
          const list = db[id] || [];
          // The case model must match the default caseCat filter, or the picker (which only
          // shows 'Mid Tower' options initially) would show a different item than what's
          // actually stored in state/passed to the 3D scene.
          const pick = id === 'case' ? list.find((c) => c.category === 'Mid Tower') || list[0] : list[0];
          if (pick) initSelections[id] = pick.name;
        });
        setSelections(initSelections);
      }
    }
    load();
    const unsubscribe = subscribeComponents(load);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const scene = createBuildScene(containerRef.current, {
      onCompletionStart: () => {
        setCompletionRunning(true);
        setTimeout(() => setShowComplete(true), 680);
        setTimeout(() => setShowComplete(false), 680 + 4200);
      },
      onCompletionEnd: () => setCompletionRunning(false),
    });
    sceneRef.current = scene;
    const size = CASE_SIZES[caseCat] || CASE_SIZES['Mid Tower'];
    scene.updateCase(size.w, size.h, size.d);
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fires the completion camera sequence once, exactly once, when every slot becomes filled.
  // The `armed` ref (rather than firing inline inside toggleComponent's setSelected updater)
  // is what makes this safe under React Strict Mode's dev-only double-invocation of updater
  // functions — a setTimeout side effect living inside that updater would fire twice.
  const completionArmedRef = useRef(false);
  useEffect(() => {
    const allSelected = SLOTS.every((id) => selected[id]);
    if (!allSelected) {
      completionArmedRef.current = false;
      return;
    }
    if (completionArmedRef.current) return;
    completionArmedRef.current = true;
    const timer = setTimeout(() => sceneRef.current?.triggerCompletion(), 1400);
    return () => clearTimeout(timer);
  }, [selected]);

  // Swaps the native cursor for the same gold dot used on nav-link hovers whenever the
  // pointer is over a built component in the 3D view (see handleViewportPointerMove below).
  useEffect(() => {
    setDustCursorVisible(!!hoverId);
    return () => setDustCursorVisible(false);
  }, [hoverId]);

  // Fans aren't a SLOTS category (there's no single "pick one" the way every other part works —
  // see FanConfig/defaultFanConfigForCase above), so their price/wattage contribution is computed
  // separately and folded into totalPrice/estimatedWatts below rather than picked up by the
  // SLOTS.forEach loops those already run. Keeping the fan that came with the case (or fewer
  // units of it) is free — it's already inside the case's own price — anything beyond that
  // (more units, or a different product) is billed at that fan's own price. Wattage counts every
  // installed fan regardless of who's paying, since that's physical draw, not a billing question.
  const fanTotals = useMemo(() => {
    let price = 0;
    let watts = 0;
    const caseComp = selected.case ? (compDb.case || []).find((c) => c.name === selections.case) : undefined;
    (Object.keys(fanConfig) as FanMountPosition[]).forEach((position) => {
      const cfg = fanConfig[position];
      if (!cfg || cfg.count <= 0 || !cfg.fanName) return;
      const fan = (compDb.fan || []).find((f) => f.name === cfg.fanName);
      if (!fan) return;
      const mount = caseComp?.fanMounts?.find((m) => m.position === position);
      const freeCount = cfg.fanName === mount?.preinstalledFanName ? Math.min(cfg.count, mount?.preinstalledCount ?? 0) : 0;
      price += fan.price * Math.max(0, cfg.count - freeCount);
      watts += (extractWatts(fan.specs) ?? DEFAULT_FAN_WATTS) * cfg.count;
    });
    return { price, watts };
  }, [fanConfig, compDb.fan, compDb.case, selected.case, selections.case]);

  const totalPrice = useMemo(() => {
    let sum = fanTotals.price;
    SLOTS.forEach((id) => {
      if (!selected[id]) return;
      const list = compDb[id] || [];
      const comp = list.find((c) => c.name === selections[id]) || list[0];
      if (comp) sum += comp.price;
    });
    return sum;
  }, [selected, selections, compDb, fanTotals.price]);

  // Estimated system draw vs. the selected PSU's rated wattage — a buildcores-style "will this
  // PSU handle it" gut-check, not a precise measurement (see BASE_WATTS/extractWatts above).
  const { estimatedWatts, psuWatts } = useMemo(() => {
    let watts = fanTotals.watts;
    let psu: number | null = null;
    SLOTS.forEach((id) => {
      if (!selected[id]) return;
      const list = compDb[id] || [];
      const comp = list.find((c) => c.name === selections[id]) || list[0];
      if (!comp) return;
      if (id === 'gpu' || id === 'cpu') watts += extractWatts(comp.specs) ?? 0;
      else if (id === 'psu') psu = extractWatts(comp.specs);
      else watts += BASE_WATTS[id] ?? 0;
    });
    return { estimatedWatts: watts, psuWatts: psu };
  }, [selected, selections, compDb, fanTotals.watts]);

  // The min-speed slider snaps across the real speeds present in the catalog (for whichever DDR
  // generation is currently filtered) rather than a continuous 1MHz range — "common frequencies"
  // means whatever kits actually exist, not an arbitrary guessed list that could drift from the
  // catalog. Shared between the filter UI and the actual list filtering below so both agree on
  // what index N means.
  const ramSpeedSteps = useMemo(() => {
    const pool = (compDb.ram || [])
      .filter((c) => !ramGenFilter || c.ramGeneration === ramGenFilter)
      .map((c) => c.ramSpeedMhz)
      .filter((s): s is number => s != null);
    return Array.from(new Set(pool)).sort((a, b) => a - b);
  }, [compDb.ram, ramGenFilter]);

  // Re-entering the RAM step (navigating back into it, or arriving fresh) resets/restores the
  // two-stage picker: jump straight to stage 2 for the already-installed RAM's own brand+speed
  // group if one is selected (so changing stick count doesn't force re-picking brand/speed),
  // otherwise start over at stage 1. Only depends on activeStep — deliberately not on every
  // selections/compDb change, the same narrow-deps pattern used elsewhere in this file.
  useEffect(() => {
    if (activeStep !== 'ram') return;
    const comp = selected.ram ? (compDb.ram || []).find((c) => c.name === selections.ram) : undefined;
    if (comp) {
      setSelectedBrandSpeedKey(ramBrandSpeedKey(comp));
      setRamStage('sticks');
    } else {
      setSelectedBrandSpeedKey(null);
      setRamStage('brandSpeed');
    }
    setExpandedStickCount(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep]);

  // Chip options for the mobo/cpu filters are read straight off the catalog rather than a fixed
  // list, so a newly-imported socket/form-factor/manufacturer shows up automatically instead of
  // needing this file edited every time the catalog grows.
  const moboSockets = useMemo(
    () => Array.from(new Set((compDb.mobo || []).map((c) => c.socket).filter((s): s is string => !!s))).sort(),
    [compDb.mobo],
  );
  const moboFormFactors = useMemo(
    () => Array.from(new Set((compDb.mobo || []).map((c) => c.formFactor).filter((f): f is FormFactor => !!f))).sort(),
    [compDb.mobo],
  );
  const cpuManufacturers = useMemo(
    () => Array.from(new Set((compDb.cpu || []).map((c) => cpuManufacturer(c.name)).filter(Boolean))).sort(),
    [compDb.cpu],
  );
  const storagePcieGens = useMemo(
    () => Array.from(new Set((compDb.storage || []).map((c) => storagePcieGeneration(c)).filter((g): g is PcieGen => !!g))).sort(),
    [compDb.storage],
  );

  const installedCount = SLOTS.filter((id) => selected[id]).length;

  // Falls back to a compatible default rather than always list[0] — otherwise "Build Complete
  // PC" (which just toggles every unpicked category via its list-item default) could default
  // into a combo the picker itself would never let you click together, e.g. a 360mm-radiator
  // cooler defaulted before a case that only clears 140mm.
  function findComp(id: CompId): Component | undefined {
    const list = compDb[id] || [];
    const preferred = list.find((c) => c.name === selections[id]);
    if (preferred) return preferred;
    if (id === 'case') {
      const mobo = selected.mobo ? (compDb.mobo || []).find((c) => c.name === selections.mobo) : undefined;
      const compatible = list.find((c) => {
        if (mobo?.formFactor && !caseFitsFormFactor(c.category, mobo.formFactor)) return false;
        return (['gpu', 'cooler', 'psu'] as CompId[]).every((otherId) => {
          if (!selected[otherId]) return true;
          const otherComp = (compDb[otherId] || []).find((x) => x.name === selections[otherId]);
          return !otherComp || fitsInCase(otherId, otherComp, c);
        });
      });
      if (compatible) return compatible;
    } else if ((id === 'gpu' || id === 'cooler' || id === 'psu' || id === 'mobo') && selected.case) {
      const caseComp = (compDb.case || []).find((c) => c.name === selections.case);
      const compatible = caseComp && list.find((c) => fitsInCase(id, c, caseComp));
      if (compatible) return compatible;
    }
    return list[0];
  }

  function flashRecentlyPicked(id: CompId) {
    setRecentlyPickedId(id);
    if (recentlyPickedTimerRef.current) clearTimeout(recentlyPickedTimerRef.current);
    recentlyPickedTimerRef.current = setTimeout(() => setRecentlyPickedId((cur) => (cur === id ? null : cur)), 4000);
  }

  const toggleComponent = useCallback(
    (id: CompId) => {
      const next = !selected[id];
      setSelected((s) => ({ ...s, [id]: next }));
      if (next) flashRecentlyPicked(id);
      const comp = next ? findComp(id) : undefined;
      if (id === 'case' && next) sceneRef.current?.setGpuOrientation(caseHasVerticalGpuMount(comp?.name));
      if (id === 'mobo') sceneRef.current?.setMoboRamSlots(moboRamSlotCount(comp));
      // Removing the case leaves its fan meshes orphaned in the scene otherwise — they're tracked
      // separately from the case mesh itself (see setFans), so toggling the case off doesn't
      // implicitly remove them the way it does for the case mesh. Selecting one for the first
      // time (rather than swapping — see changeSelection/changeCaseCat for that path) needs the
      // same seeding from its pre-installed loadout, or a freshly-picked case would show no fans
      // at all until the visitor happened to touch the case category/selection again.
      if (id === 'case') {
        const newFanConfig = next ? defaultFanConfigForCase(comp, compDb.fan || []) : {};
        setFanConfigState(newFanConfig);
        sceneRef.current?.setFans(newFanConfig);
      }
      if (comp) sceneRef.current?.setSizeScale(id, dimensionSpecsFor(id, comp));
      if (id === 'ram' && comp) sceneRef.current?.setRamModules(ramModuleCount(comp));
      sceneRef.current?.toggleComponent(id, next);
      const gpuVertical =
        id === 'gpu' && selected.case
          ? caseHasVerticalGpuMount((compDb.case || []).find((c) => c.name === selections.case)?.name)
          : false;
      sceneRef.current?.setComponentDimensions(id, comp ? dimensionSpecsFor(id, comp, gpuVertical) : []);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, compDb, selections],
  );

  // A smaller case can strand an already-installed gpu/cooler/psu that no longer physically
  // fits — mirrors the mobo-swap block below that drops a stranded cpu/case, just for the other
  // direction (case swap dropping the parts that mount inside it) using the same fitsInCase
  // check the picker's own case-step filter already applies going forward.
  function dropPartsIncompatibleWithCase(newCase: Component | undefined) {
    (['mobo', 'gpu', 'cooler', 'psu'] as CompId[]).forEach((otherId) => {
      if (!selected[otherId]) return;
      const otherComp = (compDb[otherId] || []).find((c) => c.name === selections[otherId]);
      if (otherComp && !fitsInCase(otherId, otherComp, newCase)) {
        setSelected((s) => ({ ...s, [otherId]: false }));
        sceneRef.current?.toggleComponent(otherId, false);
      }
    });
  }

  // Only takes effect immediately when `id` is already selected in the scene (a same-category
  // SKU swap) — a first-time select is handled by selectCard right after it calls
  // toggleComponent(id, true), since the scene doesn't mark itself selected until then.
  function changeSelection(id: CompId, name: string) {
    setSelections((s) => ({ ...s, [id]: name }));
    const comp = (compDb[id] || []).find((c) => c.name === name);
    if (id === 'case') {
      dropPartsIncompatibleWithCase(comp);
      const size = caseUnitsFor(comp, comp?.category || 'Mid Tower');
      sceneRef.current?.updateCase(size.w, size.h, size.d);
      const vertical = caseHasVerticalGpuMount(comp?.name);
      sceneRef.current?.setGpuOrientation(vertical);
      // A different case has different fan positions/limits — an old count could exceed the
      // new case's maxCount, or reference a position it doesn't even have. Seed from the new
      // case's own pre-installed loadout rather than clearing to empty.
      const newFanConfig = defaultFanConfigForCase(comp, compDb.fan || []);
      setFanConfigState(newFanConfig);
      sceneRef.current?.setFans(newFanConfig);
      // The card's own dimension annotation axis depends on the case it's mounted in — refresh
      // it here too, since changing the case doesn't otherwise touch the gpu selection at all.
      if (selected.gpu) {
        const gpuComp = (compDb.gpu || []).find((c) => c.name === selections.gpu);
        sceneRef.current?.setComponentDimensions('gpu', gpuComp ? dimensionSpecsFor('gpu', gpuComp, vertical) : []);
      }
    } else if (comp) {
      // Also covers a same-category SKU swap while already installed (e.g. GPU already on,
      // user picks a different card) — that path doesn't go through toggleComponent (see
      // selectCard), so this is what picks up the new part's real size in that case.
      sceneRef.current?.setSizeScale(id, dimensionSpecsFor(id, comp));
      if (id === 'ram') sceneRef.current?.setRamModules(ramModuleCount(comp));
      if (id === 'mobo') sceneRef.current?.setMoboRamSlots(moboRamSlotCount(comp));
    }
    const gpuVertical =
      id === 'gpu' && selected.case
        ? caseHasVerticalGpuMount((compDb.case || []).find((c) => c.name === selections.case)?.name)
        : false;
    sceneRef.current?.setComponentDimensions(id, comp ? dimensionSpecsFor(id, comp, gpuVertical) : []);
  }

  function changeCaseCat(cat: string) {
    setCaseCat(cat);
    const list = (compDb.case || []).filter((c) => c.category === cat);
    const pick = list[0] || (compDb.case || [])[0];
    if (pick) {
      dropPartsIncompatibleWithCase(pick);
      setSelections((s) => ({ ...s, case: pick.name }));
      const size = caseUnitsFor(pick, cat);
      sceneRef.current?.updateCase(size.w, size.h, size.d);
      sceneRef.current?.setComponentDimensions('case', dimensionSpecsFor('case', pick));
      const vertical = caseHasVerticalGpuMount(pick.name);
      sceneRef.current?.setGpuOrientation(vertical);
      const newFanConfig = defaultFanConfigForCase(pick, compDb.fan || []);
      setFanConfigState(newFanConfig);
      sceneRef.current?.setFans(newFanConfig);
      if (selected.gpu) {
        const gpuComp = (compDb.gpu || []).find((c) => c.name === selections.gpu);
        sceneRef.current?.setComponentDimensions('gpu', gpuComp ? dimensionSpecsFor('gpu', gpuComp, vertical) : []);
      }
    }
  }

  // Picking a card in the progressive picker: swap the selection, install it into the 3D
  // scene if this category isn't already on (a re-pick of the same category just swaps the
  // SKU, matching the old dropdown's behavior), and auto-advance to the next category —
  // picking a category's card twice in a row deselects it instead, since the one-by-one flow
  // has no other obvious "remove" affordance.
  // advanceStep is false only from buildAll's own batch — that path already jumps straight to
  // the last step once it's done, so letting each of its 8 picks auto-advance too would flip
  // the visible category (and thus the whole card list + its enter/exit animation) through
  // every step in rapid succession, which is what made the button visibly lag the page.
  function selectCard(id: CompId, name: string, advanceStep = true) {
    if (selected[id] && selections[id] === name) {
      setSelected((s) => ({ ...s, [id]: false }));
      sceneRef.current?.toggleComponent(id, false);
      // Removing the motherboard this way (re-clicking an already-selected card, rather than
      // toggleComponent's own path) skipped this same follow-up — the empty-slot outlines are
      // keyed off mobo presence, not just visibility.
      if (id === 'mobo') sceneRef.current?.setMoboRamSlots(0);
      return;
    }
    // changeSelection (above) already applies this pick's size/scale/orientation, but the scene
    // only builds a dimension annotation once the part is marked selected — which toggleComponent
    // below is what actually does for a first-time install — so the annotation still needs
    // setting again here, after that flip (changeSelection's own call was a no-op until now).
    changeSelection(id, name);
    flashRecentlyPicked(id);
    if (!selected[id]) {
      setSelected((s) => ({ ...s, [id]: true }));
      sceneRef.current?.toggleComponent(id, true);
      const comp = (compDb[id] || []).find((c) => c.name === name);
      const gpuVertical =
        id === 'gpu' && selected.case
          ? caseHasVerticalGpuMount((compDb.case || []).find((c) => c.name === selections.case)?.name)
          : false;
      sceneRef.current?.setComponentDimensions(id, comp ? dimensionSpecsFor(id, comp, gpuVertical) : []);
    }

    // Swapping the motherboard can strand an already-picked CPU (wrong socket) or case (too
    // small for the new board's form factor) — drop those picks rather than silently keeping
    // an invalid pairing installed.
    if (id === 'mobo') {
      const newMobo = (compDb.mobo || []).find((c) => c.name === name);
      if (selected.cpu) {
        const currentCpu = (compDb.cpu || []).find((c) => c.name === selections.cpu);
        if (currentCpu?.socket && newMobo?.socket && currentCpu.socket !== newMobo.socket) {
          setSelected((s) => ({ ...s, cpu: false }));
          sceneRef.current?.toggleComponent('cpu', false);
        }
      }
      if (selected.case) {
        const currentCase = (compDb.case || []).find((c) => c.name === selections.case);
        if (!caseFitsFormFactor(currentCase?.category, newMobo?.formFactor)) {
          setSelected((s) => ({ ...s, case: false }));
          sceneRef.current?.toggleComponent('case', false);
        }
      }
    }

    if (!advanceStep) return;
    const idx = SLOTS.indexOf(id);
    if (idx < SLOTS.length - 1) setActiveStep(SLOTS[idx + 1]);
  }

  function toggleGlassPanel() {
    const next = !glassHidden;
    setGlassHidden(next);
    sceneRef.current?.toggleGlass(next);
  }

  // Reference can: a real 500ml can placed beside the case purely as a familiar object to
  // gauge every other part's size against.
  function toggleCan() {
    const next = !canVisible;
    setCanVisible(next);
    sceneRef.current?.setCanVisible(next);
  }

  // Hides every blueprint-style measurement (case/gpu/cooler/psu/mobo/cpu/ram/storage, and the
  // can's own) at once, for a cleaner look once you've seen the numbers you needed.
  function toggleDimensions() {
    const next = !dimensionsVisible;
    setDimensionsVisible(next);
    sceneRef.current?.setDimensionsVisible(next);
  }

  // Case fans: count/size per mount position, constrained by the selected case's own fanMounts
  // spec (see the picker UI below). Cleared whenever the case changes, since a different case
  // has different positions/limits and an old count could exceed the new one.
  function setFanCount(position: FanMountPosition, count: number) {
    setFanConfigState((prev) => {
      const caseComp = selected.case ? (compDb.case || []).find((c) => c.name === selections.case) : undefined;
      const mount = caseComp?.fanMounts?.find((m) => m.position === position);
      const sizeMm = prev[position]?.sizeMm ?? mount?.sizesMm[0] ?? 120;
      const next = { ...prev, [position]: { count, sizeMm, fanName: prev[position]?.fanName } };
      sceneRef.current?.setFans(next);
      return next;
    });
  }

  function setFanSize(position: FanMountPosition, sizeMm: number) {
    setFanConfigState((prev) => {
      const next = { ...prev, [position]: { count: prev[position]?.count ?? 0, sizeMm, fanName: prev[position]?.fanName } };
      sceneRef.current?.setFans(next);
      return next;
    });
  }

  // Swaps which real fan product occupies a position — '' means "generic/unbranded" (the old
  // cosmetic-only behavior: free, no specific SKU). Picking a real product snaps sizeMm to that
  // SKU's own fanSizeMm rather than leaving whatever generic size was previously set, since a
  // fan's size isn't independently choosable once you've picked an actual product.
  function setFanProduct(position: FanMountPosition, fanName: string) {
    setFanConfigState((prev) => {
      const caseComp = selected.case ? (compDb.case || []).find((c) => c.name === selections.case) : undefined;
      const mount = caseComp?.fanMounts?.find((m) => m.position === position);
      const fan = fanName ? (compDb.fan || []).find((f) => f.name === fanName) : undefined;
      const sizeMm = fan?.fanSizeMm ?? prev[position]?.sizeMm ?? mount?.sizesMm[0] ?? 120;
      const next = { ...prev, [position]: { count: prev[position]?.count ?? 0, sizeMm, fanName: fanName || undefined } };
      sceneRef.current?.setFans(next);
      return next;
    });
  }

  function handleViewportPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const id = sceneRef.current?.pickComponentAt(e.clientX, e.clientY) ?? null;
    setHoverId(id);
    setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top, w: rect.width, h: rect.height });
  }

  function handleViewportPointerLeave() {
    setHoverId(null);
    setHoverPos(null);
  }

  // Builds a fresh, complete PC for the budget slider's current target — rather than the old
  // "just take whatever's first in the catalog" fallback (see findComp's list[0] default).
  function runFreshBuild() {
    const { selections: picks, notes } = autoBuildForBudget(BUDGET_STEPS[budgetIdx], compDb, {});
    setAutoBuildNotes(notes);
    SLOTS.forEach((id, i) => {
      const name = picks[id];
      if (!name) return;
      setTimeout(() => selectCard(id, name, false), i * 90);
    });
    setActiveStep(SLOTS[SLOTS.length - 1]);
  }

  // Fires once the clear-out triggered by buildAll (below) has actually landed in `selected` —
  // deliberately not a plain setTimeout from inside buildAll: that timeout's callback would
  // close over the `selected`/`selections` from the render buildAll was called in, which still
  // says everything is installed. selectCard's own "is this already selected?" check would then
  // read that stale, all-true snapshot and conclude every part was already there, silently
  // skipping the actual (re)install — the rebuild would fire but nothing would visibly happen.
  // Waiting on this effect instead means runFreshBuild always closes over the render where the
  // clear has genuinely finished.
  useEffect(() => {
    if (!rebuildPending) return;
    if (!SLOTS.every((id) => !selected[id])) return;
    // Flips rebuildPending back to false only once this fires, not before — setting it
    // synchronously here would change this same effect's own dependency, triggering an
    // immediate re-run whose cleanup (below) cancels this timer before its 650ms are up.
    const t = setTimeout(() => {
      setRebuildPending(false);
      runFreshBuild();
    }, 650);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rebuildPending, selected]);

  // Always a full rebuild, never locked to whatever's already installed: if every slot happens
  // to already be filled (a previous build, possibly for a since-changed budget), this used to
  // have nothing left to do and silently no-op — dragging the slider to a new target and
  // pressing the button again just sat there with the old build. Clearing first (with the same
  // fly-out animation Clear All uses) and rebuilding from nothing makes the button's result
  // always match the currently selected budget.
  function buildAll() {
    const currentlySelected = SLOTS.filter((id) => selected[id]);
    if (currentlySelected.length === 0) {
      runFreshBuild();
      return;
    }
    currentlySelected.forEach((id, i) => {
      setTimeout(() => toggleComponent(id), i * 80);
    });
    setRebuildPending(true);
  }

  function clearAll() {
    if (completionRunning) return;
    SLOTS.forEach((id, i) => {
      if (!selected[id]) return;
      setTimeout(() => toggleComponent(id), i * 80);
    });
    setShowComplete(false);
    setActiveStep(SLOTS[0]);
  }

  function handleOrder() {
    if (ordering) return;
    writeJSON('gomp_build', { selected, selections, compDb, totalPrice, fanConfig });
    setOrdering(true);
    setTimeout(() => navigateWithTransition(pathname, '/benchmarks', () => router.push('/benchmarks')), 300);
  }

  const hoverComp = hoverId ? findComp(hoverId) : null;
  const hoverPassmark = hoverComp ? passmarkLookup(hoverComp.name) : null;
  const hoverTier: Tier | undefined = hoverPassmark
    ? tierFromPassmark(hoverId === 'gpu', hoverPassmark.score)
    : (hoverComp?.tier as Tier | undefined);

  return (
    <div style={{ position: 'relative', background: BG, minHeight: '100vh', paddingBottom: isMobile ? 72 : 0 }}>
      {/* ---- Nav ---- */}
      <SiteNav />

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: isMobile ? 'auto' : '100vh', minHeight: isMobile ? '100vh' : undefined, paddingTop: 60 }}>
        {/* ---- Sidebar ----
            Desktop: floats over the full-bleed 3D viewport, semi-transparent + blurred, rather
            than sitting beside it. Mobile: opaque and in normal flow — the see-through look
            made component names and specs unreadable against the scene, so mobile keeps a
            solid panel instead. */}
        <div
          style={{
            width: isMobile ? '100%' : 264,
            order: isMobile ? 2 : 0,
            position: isMobile ? 'static' : 'absolute',
            top: isMobile ? undefined : 60,
            bottom: isMobile ? undefined : 0,
            left: isMobile ? undefined : 0,
            zIndex: isMobile ? undefined : 10,
            background: isMobile ? PANEL : 'rgba(253,250,244,0.5)',
            backdropFilter: isMobile ? undefined : 'blur(20px)',
            borderRight: isMobile ? 'none' : '0.5px solid rgba(28,28,26,0.1)',
            borderTop: isMobile ? '0.5px solid rgba(28,28,26,0.1)' : 'none',
            borderBottom: isMobile ? '0.5px solid rgba(28,28,26,0.1)' : 'none',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
            <div style={{ padding: isMobile ? '20px 20px 10px' : '20px 20px 14px' }}>
              <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600, color: MUTED, letterSpacing: 2.5, textTransform: 'uppercase' }}>{t.pc_builder}</div>
              <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 12, color: '#A09890', marginTop: 4 }}>{t.select_components}</div>
            </div>
            {/* ---- Budget slider — snaps to common breakpoints (see BUDGET_STEPS), same
                convention as the RAM min-speed slider below. Drives "Build Complete PC"'s
                automatic pick; has no effect on manual per-part selection. ---- */}
            <div style={{ padding: isMobile ? '0 20px 14px' : '0 20px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600, color: MUTED, letterSpacing: 1.5, textTransform: 'uppercase' }}>{t.budget}</span>
                <span style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 14, color: MAROON, fontWeight: 600 }}>{fmt(BUDGET_STEPS[budgetIdx])}</span>
              </div>
              <input
                type="range"
                className="gomp-slider"
                min={0}
                max={BUDGET_STEPS.length - 1}
                step={1}
                value={budgetIdx}
                onChange={(e) => setBudgetIdx(Number(e.target.value))}
                style={{ width: '100%', display: 'block', ...sliderFillStyle(budgetIdx, BUDGET_STEPS.length - 1) }}
              />
              <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 10, color: '#A09890', marginTop: 4, lineHeight: 1.4 }}>{t.budget_hint}</div>
            </div>
            <div style={{ flex: isMobile ? 'none' : 1, overflowY: isMobile ? 'visible' : 'auto', padding: '0 20px 16px' }}>
              {/* ---- Step pills — free-jump between categories, green/checked once picked ---- */}
              <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 9, color: MUTED, letterSpacing: 1, marginBottom: 8 }}>
                {t.step_of(SLOTS.indexOf(activeStep) + 1)}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {SLOTS.map((id) => {
                  const done = !!selected[id];
                  const isActive = id === activeStep;
                  return (
                    <button
                      key={id}
                      onClick={() => setActiveStep(id)}
                      style={{
                        ...(isActive ? {} : textPop),
                        display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20,
                        border: `1px solid ${isActive ? MAROON : done ? 'rgba(110,20,35,0.4)' : 'rgba(28,28,26,0.2)'}`,
                        background: isActive ? MAROON : done ? 'rgba(110,20,35,0.08)' : 'transparent',
                        color: isActive ? '#FDFAF4' : done ? MAROON : MUTED,
                        fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: isActive ? 600 : 500, cursor: 'pointer',
                      }}
                    >
                      {done && !isActive && <span style={{ fontSize: 9 }}>✓</span>}
                      {t.cat_names[id]}
                    </button>
                  );
                })}
              </div>

              {/* ---- Active category ---- */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ ...textPop, fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 20, color: INK }}>{t.cat_names[activeStep]}</div>
                <p style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 11, color: MUTED, marginTop: 4, lineHeight: 1.4 }}>{t.cat_desc[activeStep]}</p>
              </div>

              {activeStep === 'mobo' && (moboSockets.length > 1 || moboFormFactors.length > 1) && (
                <div style={{ marginBottom: 12 }}>
                  {moboSockets.length > 1 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: moboFormFactors.length > 1 ? 6 : 0 }}>
                      <FilterChip active={!moboSocketFilter} label={t.filter_all} onClick={() => setMoboSocketFilter('')} />
                      {moboSockets.map((s) => (
                        <FilterChip key={s} active={moboSocketFilter === s} label={s} onClick={() => setMoboSocketFilter(s)} />
                      ))}
                    </div>
                  )}
                  {moboFormFactors.length > 1 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      <FilterChip active={!moboFormFactorFilter} label={t.filter_all} onClick={() => setMoboFormFactorFilter('')} />
                      {moboFormFactors.map((f) => (
                        <FilterChip key={f} active={moboFormFactorFilter === f} label={f} onClick={() => setMoboFormFactorFilter(f)} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeStep === 'cpu' && cpuManufacturers.length > 1 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  <FilterChip active={!cpuMfrFilter} label={t.filter_all} onClick={() => setCpuMfrFilter('')} />
                  {cpuManufacturers.map((m) => (
                    <FilterChip key={m} active={cpuMfrFilter === m} label={m} onClick={() => setCpuMfrFilter(m)} />
                  ))}
                </div>
              )}

              {activeStep === 'case' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {t.case_cats.map((c) => (
                    <FilterChip key={c.id} active={caseCat === c.id} label={c.label} onClick={() => changeCaseCat(c.id)} />
                  ))}
                </div>
              )}

              {activeStep === 'ram' && ramStage === 'brandSpeed' && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: ramSpeedSteps.length > 1 ? 10 : 0 }}>
                    {([0, 4, 5] as const).map((gen) => (
                      <FilterChip
                        key={gen}
                        active={ramGenFilter === gen}
                        label={gen === 0 ? t.ram_gen_all : `DDR${gen}`}
                        onClick={() => { setRamGenFilter(gen); setRamMinSpeedIdx(0); }}
                      />
                    ))}
                  </div>
                  {ramSpeedSteps.length > 1 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 10, color: MUTED }}>{t.ram_min_speed}</span>
                        <span style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 11, color: INK, fontWeight: 600 }}>
                          {ramMinSpeedIdx === 0 ? t.ram_min_speed_any : `${ramSpeedSteps[Math.min(ramMinSpeedIdx, ramSpeedSteps.length - 1)]} MHz+`}
                        </span>
                      </div>
                      <input
                        type="range"
                        className="gomp-slider"
                        min={0}
                        max={ramSpeedSteps.length - 1}
                        step={1}
                        value={Math.min(ramMinSpeedIdx, ramSpeedSteps.length - 1)}
                        onChange={(e) => setRamMinSpeedIdx(Number(e.target.value))}
                        style={{ width: '100%', ...sliderFillStyle(Math.min(ramMinSpeedIdx, ramSpeedSteps.length - 1), ramSpeedSteps.length - 1) }}
                      />
                    </div>
                  )}
                </div>
              )}

              {activeStep === 'storage' && storagePcieGens.length > 1 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  <FilterChip active={!storagePcieGenFilter} label={t.filter_all} onClick={() => setStoragePcieGenFilter(0)} />
                  {storagePcieGens.map((gen) => (
                    <FilterChip key={gen} active={storagePcieGenFilter === gen} label={`PCIe ${gen}.0`} onClick={() => setStoragePcieGenFilter(gen)} />
                  ))}
                </div>
              )}

              {SORT_BY_TIER_STEPS.includes(activeStep) && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, cursor: 'pointer', width: 'fit-content' }}>
                  <input type="checkbox" checked={sortByTier} onChange={(e) => setSortByTier(e.target.checked)} />
                  <span style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 11, color: MUTED }}>{t.sort_by_tier}</span>
                </label>
              )}

              {/* ---- Product cards for the active category only ----
                  Motherboard and CPU are filtered by each other's socket in both directions —
                  pick the CPU first and only sockets it fits show up under Motherboard, or pick
                  the motherboard first and only its socket's CPUs show up, whichever happens
                  first. Case is filtered to sizes that fit the selected motherboard's form
                  factor (never a smaller-rated case for a bigger board) AND to cases with
                  enough clearance for whichever gpu/cooler/psu are already installed. GPU/
                  cooler/psu are filtered the other way — to parts that fit inside the selected
                  case — so an incompatible pairing can never be selected in either direction.
                  Everything stays unfiltered until the part(s) it depends on are actually
                  picked. */}
              {(() => {
                const selectedMobo = selected.mobo ? (compDb.mobo || []).find((c) => c.name === selections.mobo) : undefined;
                const selectedCpu = selected.cpu ? (compDb.cpu || []).find((c) => c.name === selections.cpu) : undefined;
                const selectedCase = selected.case ? (compDb.case || []).find((c) => c.name === selections.case) : undefined;

                // RAM gets its own two-stage picker instead of the generic per-SKU card list
                // below: stage 1 picks brand + speed, stage 2 switches to a 1×/2×/4× stick-count
                // filter (with a capacity sub-row only when a count maps to more than one
                // per-stick capacity). See ramBrandSpeedKey/ramStage/selectedBrandSpeedKey.
                if (activeStep === 'ram') {
                  let ramList = compDb.ram || [];
                  if (ramGenFilter) ramList = ramList.filter((c) => c.ramGeneration === ramGenFilter);
                  if (ramMinSpeedIdx > 0) {
                    const threshold = ramSpeedSteps[Math.min(ramMinSpeedIdx, ramSpeedSteps.length - 1)];
                    if (threshold != null) ramList = ramList.filter((c) => (c.ramSpeedMhz ?? 0) >= threshold);
                  }
                  if (ramList.length === 0) {
                    const reason = ramGenFilter || ramMinSpeedIdx > 0 ? t.no_ram_match : t.none_add_admin;
                    return <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 11, color: '#A09890', padding: '12px 0' }}>{reason}</div>;
                  }

                  const brandSpeedGroups = new Map<string, Component[]>();
                  ramList.forEach((c) => {
                    const key = ramBrandSpeedKey(c);
                    if (!brandSpeedGroups.has(key)) brandSpeedGroups.set(key, []);
                    brandSpeedGroups.get(key)!.push(c);
                  });

                  if (ramStage === 'brandSpeed' || !selectedBrandSpeedKey || !brandSpeedGroups.has(selectedBrandSpeedKey)) {
                    const groups = Array.from(brandSpeedGroups.entries())
                      .map(([key, rows]) => {
                        const cheapest = rows.reduce((min, c) => (c.price < min.price ? c : min), rows[0]);
                        return { key, brand: ramBrand(cheapest.name), speed: cheapest.ramSpeedMhz, gen: cheapest.ramGeneration, cheapest };
                      })
                      .sort((a, b) => a.brand.localeCompare(b.brand) || (a.speed ?? 0) - (b.speed ?? 0));
                    return (
                      <>
                        <AnimatePresence initial={false} key="ram-brand-speed">
                          {groups.map((g) => (
                            <motion.div
                              key={g.key}
                              layout="position"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.18 }}
                              onClick={() => { setSelectedBrandSpeedKey(g.key); setRamStage('sticks'); setExpandedStickCount(null); }}
                              onMouseEnter={() => setHoveredCardKey(g.key)}
                              onMouseLeave={() => setHoveredCardKey((key) => (key === g.key ? null : key))}
                              style={{
                                border: '1.5px solid rgba(28,28,26,0.12)', background: 'transparent',
                                borderRadius: 6, padding: '10px 12px', marginBottom: 8, cursor: 'pointer',
                                position: 'relative', zIndex: 0, overflow: 'hidden',
                              }}
                            >
                              <TierGlowOrb tier={g.cheapest.tier} width={140} intense={hoveredCardKey === g.key} />
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: INK }}>
                                  {g.brand}{g.gen && g.speed ? ` · DDR${g.gen}-${g.speed}` : ''}
                                </div>
                                <span title={g.cheapest.passmark ? t.passmark_title(g.cheapest.passmark) : undefined}>
                                  <TierBadge tier={g.cheapest.tier} small />
                                </span>
                              </div>
                              <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 11, color: MUTED, marginTop: 4 }}>
                                {t.ram_from_price(fmt(g.cheapest.price))}
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </>
                    );
                  }

                  // Stage 2: 1×/2×/4× buttons for whatever counts exist in the chosen brand+speed
                  // group, deduped by (count, per-stick capacity) since a brand+speed group can
                  // span several capacities — a duplicate within one bucket prefers the actually
                  // higher tier (every RAM row has a real computed tier now, see ramTier in
                  // passmark.ts), then the cheaper of the two.
                  const groupRows = brandSpeedGroups.get(selectedBrandSpeedKey)!;
                  const byCount = new Map<number, Component[]>();
                  groupRows.forEach((c) => {
                    const n = ramModuleCount(c);
                    if (!byCount.has(n)) byCount.set(n, []);
                    byCount.get(n)!.push(c);
                  });
                  byCount.forEach((rows, count) => {
                    const byCapacity = new Map<number, Component>();
                    rows.forEach((c) => {
                      const capacity = ramPerStickCapacityGB(c) ?? 0;
                      const existing = byCapacity.get(capacity);
                      if (!existing) { byCapacity.set(capacity, c); return; }
                      const existingScore = existing.tier ? TIER_ORDER.indexOf(existing.tier) : TIER_ORDER.length;
                      const cScore = c.tier ? TIER_ORDER.indexOf(c.tier) : TIER_ORDER.length;
                      if (cScore < existingScore || (cScore === existingScore && c.price < existing.price)) byCapacity.set(capacity, c);
                    });
                    byCount.set(count, Array.from(byCapacity.values()).sort((a, b) => (ramPerStickCapacityGB(a) ?? 0) - (ramPerStickCapacityGB(b) ?? 0)));
                  });
                  const counts = Array.from(byCount.keys()).sort((a, b) => a - b);
                  const [brandLabel] = selectedBrandSpeedKey.split('|');
                  const speedLabel = groupRows[0]?.ramSpeedMhz;
                  const genLabel = groupRows[0]?.ramGeneration;

                  function pickStickCount(count: number) {
                    const rows = byCount.get(count) ?? [];
                    if (rows.length === 1) {
                      selectCard('ram', rows[0].name);
                      setExpandedStickCount(null);
                    } else {
                      setExpandedStickCount(count);
                    }
                  }

                  return (
                    <div>
                      <button
                        onClick={() => { setRamStage('brandSpeed'); setExpandedStickCount(null); }}
                        style={{
                          ...textPop, fontFamily: 'var(--font-sans)', fontSize: 11, color: MUTED,
                          background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', padding: 0, marginBottom: 10,
                        }}
                      >
                        {t.ram_back_to_brand_speed}
                      </button>
                      <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: INK, marginBottom: 10 }}>
                        {brandLabel}{genLabel && speedLabel ? ` · DDR${genLabel}-${speedLabel}` : ''}
                      </div>
                      <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 10, color: MUTED, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {t.ram_choose_sticks}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                        {counts.map((count) => {
                          const rows = byCount.get(count) ?? [];
                          const isInstalledCount = selected.ram && rows.some((r) => r.name === selections.ram);
                          const isExpanded = expandedStickCount === count;
                          return (
                            <button
                              key={count}
                              onClick={() => pickStickCount(count)}
                              style={{
                                ...textPop, flex: 1, fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, padding: '10px 0',
                                borderRadius: 6, cursor: 'pointer', outline: 'none',
                                border: `1.5px solid ${isInstalledCount || isExpanded ? MAROON : 'rgba(28,28,26,0.15)'}`,
                                background: isInstalledCount ? MAROON : isExpanded ? 'rgba(110,20,35,0.06)' : 'transparent',
                                color: isInstalledCount ? '#FDFAF4' : INK,
                              }}
                            >
                              {count}×
                            </button>
                          );
                        })}
                      </div>
                      {expandedStickCount != null && (byCount.get(expandedStickCount)?.length ?? 0) > 1 && (
                        <div>
                          <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 10, color: MUTED, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {t.ram_choose_capacity}
                          </div>
                          <AnimatePresence initial={false} key={`ram-capacity-${expandedStickCount}`}>
                            {byCount.get(expandedStickCount)!.map((c) => {
                              const isThisSelected = selected.ram && selections.ram === c.name;
                              const capacity = ramPerStickCapacityGB(c);
                              return (
                                <motion.div
                                  key={c.id}
                                  layout="position"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.18 }}
                                  onClick={() => selectCard('ram', c.name)}
                                  style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                                    border: `1.5px solid ${isThisSelected ? MAROON : 'rgba(28,28,26,0.12)'}`,
                                    background: isThisSelected ? 'rgba(110,20,35,0.06)' : 'transparent',
                                    borderRadius: 6, padding: '10px 12px', marginBottom: 8, cursor: 'pointer',
                                  }}
                                >
                                  <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 12, color: isThisSelected ? MAROON : INK }}>
                                    {capacity ? `${capacity}GB/RAM` : c.specs}
                                  </div>
                                  <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 13, color: INK }}>{fmt(c.price)}</div>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  );
                }

                let list = (compDb[activeStep] || []);
                if (activeStep === 'case') {
                  list = list.filter((c) => c.category === caseCat);
                  if (selectedMobo?.formFactor) {
                    list = list.filter((c) => caseFitsFormFactor(c.category, selectedMobo.formFactor));
                  }
                  (['gpu', 'cooler', 'psu'] as CompId[]).forEach((otherId) => {
                    if (!selected[otherId]) return;
                    const otherComp = (compDb[otherId] || []).find((c) => c.name === selections[otherId]);
                    if (otherComp) list = list.filter((c) => fitsInCase(otherId, otherComp, c));
                  });
                } else if (activeStep === 'cpu') {
                  if (selectedMobo?.socket) list = list.filter((c) => c.socket === selectedMobo.socket);
                  if (cpuMfrFilter) list = list.filter((c) => cpuManufacturer(c.name) === cpuMfrFilter);
                } else if (activeStep === 'gpu' || activeStep === 'cooler' || activeStep === 'psu') {
                  if (selectedCase) list = list.filter((c) => fitsInCase(activeStep, c, selectedCase));
                } else if (activeStep === 'mobo') {
                  if (selectedCpu?.socket) list = list.filter((c) => c.socket === selectedCpu.socket);
                  if (moboSocketFilter) list = list.filter((c) => c.socket === moboSocketFilter);
                  if (moboFormFactorFilter) list = list.filter((c) => c.formFactor === moboFormFactorFilter);
                  if (selectedCase?.category) list = list.filter((c) => caseFitsFormFactor(selectedCase.category, c.formFactor));
                } else if (activeStep === 'storage') {
                  if (storagePcieGenFilter) list = list.filter((c) => storagePcieGeneration(c) === storagePcieGenFilter);
                }
                if (sortByTier && SORT_BY_TIER_STEPS.includes(activeStep)) {
                  list = [...list].sort((a, b) => TIER_ORDER.indexOf(a.tier ?? '') - TIER_ORDER.indexOf(b.tier ?? ''));
                }
                if (list.length === 0) {
                  const reason =
                    activeStep === 'cpu' && selectedMobo?.socket
                      ? t.no_socket_match(selectedMobo.socket)
                      : activeStep === 'cpu' && cpuMfrFilter
                        ? t.no_cpu_mfr_match(cpuMfrFilter)
                        : activeStep === 'case' && selectedMobo?.formFactor
                          ? t.no_case_fit(selectedMobo.formFactor)
                          : activeStep === 'case'
                            ? t.no_case_fit_part
                            : (activeStep === 'gpu' || activeStep === 'cooler' || activeStep === 'psu') && selectedCase
                              ? t.no_part_fit(selectedCase.name)
                              : activeStep === 'mobo' && selectedCpu?.socket
                                  ? t.no_socket_match_mobo(selectedCpu.socket)
                                  : activeStep === 'mobo' && selectedCase?.category
                                    ? t.no_mobo_fit_case(selectedCase.category)
                                    : activeStep === 'mobo' && (moboSocketFilter || moboFormFactorFilter)
                                      ? t.no_mobo_match
                                      : activeStep === 'storage' && storagePcieGenFilter
                                      ? t.no_storage_match
                                      : t.none_add_admin;
                  return <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 11, color: '#A09890', padding: '12px 0' }}>{reason}</div>;
                }
                const showAll = showAllByStep[activeStep] ?? false;
                const visibleList = showAll ? list : list.slice(0, SHOW_MORE_STEP);
                return (
                  <>
                  {/* Keyed by activeStep so switching categories remounts this AnimatePresence
                      outright (a normal React unmount, tearing down any in-flight animation)
                      instead of asking it to exit-animate the old category's ~20+ cards while
                      entering the new category's — that cross-category swap could leave the old
                      cards' exit animation stuck forever, since there's no shared identity for
                      Motion's layout projection to reconcile between two unrelated lists. Filter
                      changes *within* one category keep the same key, so they still get the
                      smooth reflow/exit this was actually built for. */}
                  <AnimatePresence initial={false} key={activeStep}>
                    {visibleList.map((c) => {
                      const isThisSelected = selected[activeStep] && selections[activeStep] === c.name;
                      const cardKey = c.id;
                      return (
                        <motion.div
                          key={cardKey}
                          layout="position"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          onClick={() => selectCard(activeStep, c.name)}
                          onMouseEnter={() => setHoveredCardKey(cardKey)}
                          onMouseLeave={() => setHoveredCardKey((key) => (key === cardKey ? null : key))}
                          style={{
                            border: `1.5px solid ${isThisSelected ? MAROON : 'rgba(28,28,26,0.12)'}`,
                            background: isThisSelected ? 'rgba(110,20,35,0.06)' : 'transparent',
                            borderRadius: 6, padding: '10px 12px', marginBottom: 8, cursor: 'pointer',
                            position: 'relative', zIndex: 0, overflow: 'hidden',
                          }}
                        >
                      <TierGlowOrb tier={c.tier} width={140} intense={hoveredCardKey === cardKey} />
                      <div style={{ display: 'flex', gap: 10 }}>
                        {c.imageUrl && (
                          <motion.div
                            whileHover={{ scale: 1.9, y: [0, -5, 0] }}
                            transition={{ scale: { duration: 0.2, ease: 'easeOut' }, y: { repeat: Infinity, duration: 1.8, ease: 'easeInOut' } }}
                            style={{
                              width: 36, height: 36, borderRadius: 4, flexShrink: 0,
                              background: 'repeating-conic-gradient(rgba(28,28,26,0.06) 0% 25%, transparent 0% 50%) 0 0 / 10px 10px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                              transformOrigin: 'right center', position: 'relative', zIndex: 2,
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={c.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          </motion.div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: isThisSelected ? MAROON : INK }}>{c.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                              {c.formFactor && <SpecPill label={c.formFactor} />}
                              {c.socket && <SpecPill label={c.socket} />}
                              {activeStep === 'storage' && storagePcieGeneration(c) && <SpecPill label={`PCIe ${storagePcieGeneration(c)}.0`} />}
                              <span title={c.passmark ? t.passmark_title(c.passmark) : undefined}>
                                <TierBadge tier={c.tier} small />
                              </span>
                            </div>
                          </div>
                          <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 9, color: MUTED, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.specs}
                          </div>
                          {activeStep === 'storage' &&
                            selectedMobo &&
                            (() => {
                              const ssdGen = storagePcieGeneration(c);
                              const moboGen = moboPcieGeneration(selectedMobo);
                              if (!ssdGen || !moboGen || ssdGen <= moboGen) return null;
                              return (
                                <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 9.5, color: MAROON, marginTop: 3, lineHeight: 1.3 }}>
                                  {t.storage_pcie_capped(ssdGen, moboGen)}
                                </div>
                              );
                            })()}
                          {dimensionLabel(activeStep, c) && (
                            <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 9, color: '#A89A78', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {dimensionLabel(activeStep, c)}
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                            <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 13, color: INK }}>{fmt(c.price)}</div>
                            <div
                              style={{
                                width: 16, height: 16, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: isThisSelected ? MAROON : 'transparent', border: `1px solid ${isThisSelected ? MAROON : 'rgba(28,28,26,0.3)'}`,
                                color: isThisSelected ? '#FDFAF4' : MUTED, fontSize: 10, fontWeight: 700,
                              }}
                            >
                              {isThisSelected ? '✓' : '+'}
                            </div>
                          </div>
                        </div>
                      </div>
                      </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {(showAll ? list.length > SHOW_MORE_STEP : list.length > visibleList.length) && (
                    <button
                      onClick={() => setShowAllByStep((s) => ({ ...s, [activeStep]: !showAll }))}
                      style={{
                        ...textPop, width: '100%', padding: '8px', marginTop: 2, marginBottom: 8,
                        background: 'transparent', border: '0.5px dashed rgba(28,28,26,0.25)', borderRadius: 4,
                        color: MUTED, fontFamily: 'var(--font-sans)', fontSize: 11, cursor: 'pointer',
                      }}
                    >
                      {showAll ? t.show_less : t.show_more(list.length - visibleList.length)}
                    </button>
                  )}
                  </>
                );
              })()}

              {/* ---- Back / Next ---- */}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => { const i = SLOTS.indexOf(activeStep); if (i > 0) setActiveStep(SLOTS[i - 1]); }}
                  disabled={SLOTS.indexOf(activeStep) === 0}
                  style={{
                    ...textPop, flex: 1, padding: '9px', background: 'transparent',
                    color: SLOTS.indexOf(activeStep) === 0 ? '#c9c2b4' : MUTED,
                    border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 3,
                    fontFamily: 'var(--font-sans)', fontSize: 11,
                    cursor: SLOTS.indexOf(activeStep) === 0 ? 'default' : 'pointer',
                  }}
                >
                  ← {t.back}
                </button>
                <button
                  onClick={() => { const i = SLOTS.indexOf(activeStep); if (i < SLOTS.length - 1) setActiveStep(SLOTS[i + 1]); }}
                  disabled={SLOTS.indexOf(activeStep) === SLOTS.length - 1}
                  style={{
                    ...(SLOTS.indexOf(activeStep) === SLOTS.length - 1 ? textPop : {}), flex: 1, padding: '9px',
                    background: SLOTS.indexOf(activeStep) === SLOTS.length - 1 ? 'transparent' : MAROON,
                    color: SLOTS.indexOf(activeStep) === SLOTS.length - 1 ? '#c9c2b4' : '#FDFAF4',
                    border: SLOTS.indexOf(activeStep) === SLOTS.length - 1 ? '0.5px solid rgba(28,28,26,0.2)' : 'none',
                    borderRadius: 3, fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
                    cursor: SLOTS.indexOf(activeStep) === SLOTS.length - 1 ? 'default' : 'pointer',
                  }}
                >
                  {t.next} →
                </button>
              </div>
            </div>
            <div style={{ padding: 16, borderTop: '0.5px solid rgba(28,28,26,0.1)' }}>
              <button onClick={buildAll} style={{ width: '100%', padding: '11px', background: MAROON, color: '#FDFAF4', border: 'none', borderRadius: 3, fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}>
                {t.build_complete}
              </button>
              <button
                onClick={clearAll}
                disabled={completionRunning}
                style={{ ...textPop, width: '100%', padding: '10px', background: 'transparent', color: completionRunning ? '#c9c2b4' : MUTED, border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 3, fontFamily: 'var(--font-sans)', fontSize: 12, cursor: completionRunning ? 'default' : 'pointer' }}
              >
                {t.clear_all}
              </button>
              {autoBuildNotes.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {autoBuildNotes.map((note, i) => (
                    <div key={i} style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 10, color: MUTED, lineHeight: 1.4 }}>
                      · {autoBuildNoteMessage(note)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        {/* ---- 3D viewport ---- */}
        <div
          ref={viewportRef}
          onPointerMove={handleViewportPointerMove}
          onPointerLeave={handleViewportPointerLeave}
          style={{
            flex: isMobile ? 'none' : 1,
            height: isMobile ? '46vh' : undefined,
            minHeight: isMobile ? 320 : undefined,
            order: isMobile ? 0 : 1,
            position: 'relative',
            cursor: hoverId && isDustEnabled() ? 'none' : undefined,
          }}
        >
          <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div style={{ ...textPop, position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(28,28,26,0.35)' }}>
              {t.installed(installedCount)}
            </div>
            <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(253,250,244,0.85)', padding: '6px 14px', borderRadius: 20, fontFamily: 'var(--font-sans)', fontSize: 11, color: MUTED }}>
              {t.drag_to_orbit}
            </div>
            <div
              style={{
                position: 'absolute',
                top: 16,
                right: isMobile ? 16 : 288 + 16,
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
                gap: 8,
                maxWidth: isMobile ? 'calc(100% - 32px)' : 320,
                pointerEvents: 'all',
              }}
            >
              <button
                onClick={toggleGlassPanel}
                style={{ background: 'rgba(253,250,244,0.9)', border: '0.5px solid rgba(28,28,26,0.15)', borderRadius: 4, padding: '7px 12px', fontFamily: 'var(--font-sans)', fontSize: 11, color: INK, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {glassHidden ? t.show_panel : t.hide_panel}
              </button>
              <button
                onClick={toggleCan}
                style={{
                  background: canVisible ? MAROON : 'rgba(253,250,244,0.9)',
                  border: `0.5px solid ${canVisible ? MAROON : 'rgba(28,28,26,0.15)'}`,
                  borderRadius: 4, padding: '7px 12px', fontFamily: 'var(--font-sans)', fontSize: 11,
                  color: canVisible ? '#FDFAF4' : INK, cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {canVisible ? t.hide_can : t.show_can}
              </button>
              <button
                onClick={toggleDimensions}
                style={{ background: 'rgba(253,250,244,0.9)', border: '0.5px solid rgba(28,28,26,0.15)', borderRadius: 4, padding: '7px 12px', fontFamily: 'var(--font-sans)', fontSize: 11, color: INK, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {dimensionsVisible ? t.hide_dims : t.show_dims}
              </button>
            </div>
            {hoverId && hoverComp && hoverPos && !isMobile && (
              <div
                style={{
                  position: 'absolute',
                  ...(hoverPos.x > hoverPos.w / 2 ? { right: hoverPos.w - hoverPos.x + 18 } : { left: hoverPos.x + 18 }),
                  ...(hoverPos.y > hoverPos.h / 2 ? { bottom: hoverPos.h - hoverPos.y + 18 } : { top: hoverPos.y + 18 }),
                  minWidth: 190,
                  maxWidth: 240,
                  background: 'rgba(20,17,15,0.94)',
                  backdropFilter: 'blur(6px)',
                  border: '0.5px solid rgba(196,163,90,0.35)',
                  borderRadius: 6,
                  padding: '12px 14px',
                  boxShadow: '0 16px 36px rgba(0,0,0,0.35)',
                  zIndex: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 600, color: 'rgba(245,240,230,0.55)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                    {t.cat_names[hoverId]}
                  </span>
                  <TierBadge tier={hoverTier} small />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  {hoverComp.imageUrl && (
                    <div
                      style={{
                        width: 44, height: 44, borderRadius: 4, flexShrink: 0,
                        background: 'repeating-conic-gradient(rgba(245,240,230,0.08) 0% 25%, transparent 0% 50%) 0 0 / 8px 8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={hoverComp.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                  )}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: GOLD, fontWeight: 600, lineHeight: 1.3 }}>{hoverComp.name}</div>
                </div>
                <div style={{ marginBottom: hoverPassmark || dimensionLabel(hoverId, hoverComp) ? 8 : 0 }}>
                  {(hoverComp.specs || '').split(' · ').map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(245,240,230,0.85)', marginBottom: 3 }}>
                      <span style={{ width: 3, height: 3, borderRadius: '50%', background: GOLD, flexShrink: 0 }} /> {s}
                    </div>
                  ))}
                </div>
                {dimensionLabel(hoverId, hoverComp) && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-sans)', fontSize: 10, color: 'rgba(245,240,230,0.5)', marginBottom: 8 }}>
                    <span>{t.dimensions}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'rgba(245,240,230,0.9)' }}>{dimensionLabel(hoverId, hoverComp)}</span>
                  </div>
                )}
                {hoverPassmark && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-sans)', fontSize: 10, color: 'rgba(245,240,230,0.5)', marginBottom: 8 }}>
                    <span>{t.passmark_score}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'rgba(245,240,230,0.9)' }}>{hoverPassmark.score.toLocaleString()}</span>
                  </div>
                )}
                <div style={{ borderTop: '0.5px solid rgba(245,240,230,0.14)', paddingTop: 8, fontFamily: 'var(--font-mono)', fontSize: 14, color: '#FDFAF4', fontWeight: 500 }}>
                  {fmt(hoverComp.price)}
                </div>
              </div>
            )}
            {showComplete && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 16 : 0 }}>
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(26,18,20,0.86), rgba(10,8,10,0.9))',
                    border: '1px solid rgba(196,163,90,0.25)',
                    boxShadow: '0 24px 70px rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 12,
                    padding: isMobile ? '28px 32px' : '42px 64px',
                    textAlign: 'center',
                    animation: 'gompCompleteFadeIn 0.7s 0.15s cubic-bezier(0.16,1,0.3,1) both',
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, letterSpacing: isMobile ? 4 : 7, color: 'rgba(245,240,230,0.65)', textTransform: 'uppercase' }}>
                    {t.complete}
                  </div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 500, fontSize: isMobile ? 34 : 58, color: '#FDFAF4', margin: '10px 0' }}>
                    {t.your_build}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: isMobile ? 26 : 38, color: GOLD, fontWeight: 600, letterSpacing: 1 }}>{fmt(totalPrice)}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ---- Right panel ---- */}
        <div
          style={{
            width: isMobile ? '100%' : 288,
            order: isMobile ? 3 : 2,
            position: isMobile ? 'static' : 'absolute',
            top: isMobile ? undefined : 60,
            bottom: isMobile ? undefined : 0,
            right: isMobile ? undefined : 0,
            zIndex: isMobile ? undefined : 10,
            background: isMobile ? PANEL : 'rgba(253,250,244,0.5)',
            backdropFilter: isMobile ? undefined : 'blur(20px)',
            borderLeft: isMobile ? 'none' : '0.5px solid rgba(28,28,26,0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: isMobile ? 'visible' : 'auto',
          }}
        >
          <div style={{ padding: 20, flex: isMobile ? 'none' : 1 }}>
            {installedCount === 0 ? (
              <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 12, color: '#A09890' }}>{t.select_components}</div>
            ) : (
              <AnimatePresence initial={false} mode="popLayout">
                {SLOTS.filter((id) => selected[id]).map((id) => {
                  const comp = findComp(id);
                  if (!comp) return null;
                  const passmark = passmarkLookup(comp.name);
                  const tier: Tier | undefined = passmark ? tierFromPassmark(id === 'gpu', passmark.score) : (comp.tier as Tier | undefined);
                  const expanded = recentlyPickedId === id;
                  return (
                    <motion.div
                      key={id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ opacity: { duration: 0.18 } }}
                      style={{ marginBottom: 8, border: '1px solid rgba(28,28,26,0.1)', borderRadius: 6, padding: expanded ? 12 : '8px 10px', overflow: 'hidden' }}
                    >
                      {expanded ? (
                        <>
                          <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600, color: MUTED, letterSpacing: 1.5, textTransform: 'uppercase' }}>{t.cat_names[id]}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                            <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 14, color: MAROON, fontWeight: 600 }}>{comp.name}</div>
                            <TierBadge tier={tier} small />
                          </div>
                          <p style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 12, color: MUTED, marginTop: 10, lineHeight: 1.5 }}>{t.cat_desc[id]}</p>
                          <div style={{ marginTop: 12 }}>
                            {(comp.specs || '').split(' · ').map((s, i) => (
                              <div key={i} style={{ ...textPop, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: INK, marginBottom: 4 }}>
                                <span style={{ width: 3, height: 3, borderRadius: '50%', background: MAROON }} /> {s}
                              </div>
                            ))}
                          </div>
                          {dimensionLabel(id, comp) && (
                            <div style={{ marginTop: 12, borderTop: '0.5px solid rgba(28,28,26,0.1)', paddingTop: 12 }}>
                              <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: 1 }}>{t.dimensions}</div>
                              <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 14, color: INK, fontWeight: 600 }}>{dimensionLabel(id, comp)}</div>
                            </div>
                          )}
                          {passmark && (
                            <div style={{ marginTop: 12, borderTop: '0.5px solid rgba(28,28,26,0.1)', paddingTop: 12 }}>
                              <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: 1 }}>{t.passmark_score}</div>
                              <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 16, color: tier ? TIER_COLORS[tier].text : INK, fontWeight: 600 }}>{passmark.score.toLocaleString()}</div>
                              <a href={passmark.url} target="_blank" rel="noopener noreferrer" style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 11, color: MAROON }}>{t.verify_passmark}</a>
                            </div>
                          )}
                          <div style={{ ...textPop, marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 15, color: INK }}>{fmt(comp.price)}</div>
                        </>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t.cat_names[id]}</div>
                            <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 12, color: INK, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{comp.name}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <TierBadge tier={tier} small />
                            <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 12, color: INK }}>{fmt(comp.price)}</div>
                          </div>
                        </div>
                      )}
                      {id === 'storage' &&
                        selected.mobo &&
                        (() => {
                          const ssdGen = storagePcieGeneration(comp);
                          const moboGen = moboPcieGeneration((compDb.mobo || []).find((c) => c.name === selections.mobo));
                          if (!ssdGen || !moboGen || ssdGen <= moboGen) return null;
                          return (
                            <div style={{ marginTop: 12, borderTop: '0.5px solid rgba(28,28,26,0.1)', paddingTop: 12 }}>
                              <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 10, color: MAROON, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
                                {t.storage_pcie_capped_title}
                              </div>
                              <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 12, color: MAROON, marginTop: 3, lineHeight: 1.4 }}>
                                {t.storage_pcie_capped(ssdGen, moboGen)}
                              </div>
                            </div>
                          );
                        })()}
                      {id === 'case' && comp.fanMounts && comp.fanMounts.length > 0 && (
                        <div style={{ marginTop: 12, borderTop: '0.5px solid rgba(28,28,26,0.1)', paddingTop: 12 }}>
                          <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{t.fans}</div>
                          {comp.fanMounts.map((mount) => {
                            const cfg = fanConfig[mount.position] || { count: 0, sizeMm: mount.sizesMm[0] };
                            // Real fan products (from the 'fan' catalog) that physically fit this mount —
                            // only shown once Admin has actually added matching-size SKUs; otherwise this
                            // position keeps behaving exactly like the original generic count/size knob.
                            const matchingFans = (compDb.fan || []).filter((f) => f.fanSizeMm != null && mount.sizesMm.includes(f.fanSizeMm));
                            return (
                              <div key={mount.position} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 6 }}>
                                <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 12, color: INK }}>{t.fan_positions[mount.position]}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                  {cfg.count > 0 && matchingFans.length > 0 && (
                                    <select
                                      value={cfg.fanName || ''}
                                      onChange={(e) => setFanProduct(mount.position, e.target.value)}
                                      style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 10, color: MUTED, background: 'transparent', border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 3, padding: '2px 4px', maxWidth: 150 }}
                                    >
                                      <option value="">{t.fan_generic}</option>
                                      {matchingFans.map((f) => (
                                        <option key={f.id} value={f.name}>
                                          {f.name} {f.name === mount.preinstalledFanName ? `(${t.fan_included})` : `(+${fmt(f.price)})`}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                  {!cfg.fanName && mount.sizesMm.length > 1 && cfg.count > 0 && (
                                    <select
                                      value={cfg.sizeMm}
                                      onChange={(e) => setFanSize(mount.position, Number(e.target.value))}
                                      style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 10, color: MUTED, background: 'transparent', border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 3, padding: '2px 4px' }}
                                    >
                                      {mount.sizesMm.map((s) => (
                                        <option key={s} value={s}>{s}mm</option>
                                      ))}
                                    </select>
                                  )}
                                  <button
                                    onClick={() => setFanCount(mount.position, Math.max(0, cfg.count - 1))}
                                    disabled={cfg.count <= 0}
                                    style={{ width: 20, height: 20, borderRadius: 3, border: '0.5px solid rgba(28,28,26,0.2)', background: 'transparent', color: cfg.count <= 0 ? '#c9c2b4' : INK, cursor: cfg.count <= 0 ? 'default' : 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1 }}
                                  >
                                    −
                                  </button>
                                  <span style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 12, color: INK, minWidth: 12, textAlign: 'center' }}>{cfg.count}</span>
                                  <button
                                    onClick={() => setFanCount(mount.position, Math.min(mount.maxCount, cfg.count + 1))}
                                    disabled={cfg.count >= mount.maxCount}
                                    style={{ width: 20, height: 20, borderRadius: 3, border: '0.5px solid rgba(28,28,26,0.2)', background: 'transparent', color: cfg.count >= mount.maxCount ? '#c9c2b4' : INK, cursor: cfg.count >= mount.maxCount ? 'default' : 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1 }}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
          {estimatedWatts > 0 && (
            <div style={{ padding: '16px 20px 0', borderTop: '0.5px solid rgba(28,28,26,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: 1 }}>{t.power_draw}</div>
                <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 13, color: psuWatts && estimatedWatts > psuWatts ? MAROON : INK, fontWeight: 600 }}>
                  {estimatedWatts}W{psuWatts ? ` / ${psuWatts}W` : ''}
                </div>
              </div>
              {psuWatts != null && (
                <>
                  <div style={{ height: 5, borderRadius: 3, background: 'rgba(28,28,26,0.08)', marginTop: 6, overflow: 'hidden', position: 'relative' }}>
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: `linear-gradient(to right, ${POSH_GREEN} 0%, ${GOLD} 65%, ${MAROON} 100%)`,
                        clipPath: `inset(0 ${100 - Math.min(100, (estimatedWatts / psuWatts) * 100)}% 0 0)`,
                        transition: 'clip-path 0.3s',
                      }}
                    />
                  </div>
                  <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 10, color: estimatedWatts > psuWatts ? MAROON : MUTED, marginTop: 5, marginBottom: 2 }}>
                    {estimatedWatts > psuWatts ? t.psu_insufficient : t.psu_ok}
                  </div>
                </>
              )}
            </div>
          )}
          <div style={{ padding: 20, borderTop: estimatedWatts > 0 ? 'none' : '0.5px solid rgba(28,28,26,0.1)', marginTop: 'auto' }}>
            <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: 1.5 }}>{t.build_total}</div>
            <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 40, color: INK, fontWeight: 500, margin: '4px 0' }}>{fmt(totalPrice)}</div>
            <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 11, color: '#A09890', marginBottom: 14 }}>{t.ofComponents(installedCount)}</div>
            <button onClick={handleOrder} style={{ width: '100%', padding: 13, background: MAROON, color: '#FDFAF4', border: 'none', borderRadius: 3, fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}>
              {t.continue_benchmarks}
            </button>
            <button style={{ width: '100%', padding: 11, background: 'transparent', color: MUTED, border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 3, fontFamily: 'var(--font-sans)', fontSize: 12, cursor: 'pointer' }}>
              {t.save_build}
            </button>
          </div>
        </div>
      </div>

      {/* ---- Mobile sticky total/CTA bar ----
          On mobile the sidebar and detail panel stack in normal page flow below the 3D view,
          so a category with a long card list can push the real total/CTA panel (bottom of the
          right panel) a full screen or more down the page. This bar is pinned to the viewport
          so the total and primary action are always reachable without scrolling to the end. */}
      {isMobile && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 16px',
            background: PANEL,
            borderTop: '0.5px solid rgba(28,28,26,0.1)',
            boxShadow: '0 -4px 16px rgba(28,28,26,0.08)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...textPop, fontFamily: 'var(--font-sans)', fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: 1 }}>{t.build_total}</div>
            <div style={{ ...textPop, fontFamily: 'var(--font-mono)', fontSize: 18, color: INK, fontWeight: 600 }}>{fmt(totalPrice)}</div>
          </div>
          <button
            onClick={handleOrder}
            style={{ padding: '11px 20px', background: MAROON, color: '#FDFAF4', border: 'none', borderRadius: 3, fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {t.continue_benchmarks}
          </button>
        </div>
      )}

      {/* ---- Order overlay ---- */}
      {ordering && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'radial-gradient(circle at 50% 40%, #8E2A3A 0%, #6E1423 55%, #4A0E1A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: 640, height: 640, margin: '-320px 0 0 -320px', border: '0.5px solid rgba(196,163,90,0.22)', borderRadius: '50%', animation: 'gompRotateSlow 8s linear infinite' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: 420, height: 420, margin: '-210px 0 0 -210px', border: '0.5px solid rgba(196,163,90,0.32)', borderRadius: '50%', animation: 'gompRotateSlowRev 6s linear infinite' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: 960, height: 960, margin: '-480px 0 0 -480px', background: 'radial-gradient(circle, rgba(196,163,90,0.16) 0%, transparent 60%)', animation: 'gompGlowPulse 2.2s ease-in-out infinite' }} />
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13, fontWeight: 500, color: 'rgba(245,240,230,0.75)', letterSpacing: 6, textTransform: 'uppercase', position: 'relative', zIndex: 1, animation: 'gompCompleteFadeIn 0.35s 0.05s cubic-bezier(0.16,1,0.3,1) both' }}>
            {t.preparing_order}
          </div>
        </div>
      )}
    </div>
  );
}
