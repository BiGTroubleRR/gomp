'use client';

import { CSSProperties } from 'react';
import { useSite } from '@/contexts/SiteContext';
import TransitionLink from '@/components/TransitionLink';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import { useIsMobile } from '@/lib/use-media-query';

const MAROON = '#6E1423';
const INK = '#1C1C1A';
const MUTED = '#7A7469';
const PAGE_BG = '#F5F0E6';
const PANEL_BG = '#FDFAF4';

const serif: CSSProperties = { fontFamily: 'var(--font-serif)' };
const sans: CSSProperties = { fontFamily: 'var(--font-sans)' };

// A body paragraph is either plain text, or a labelled bullet list (kept as a small
// discriminated shape rather than raw HTML, since every section here is plain-language
// content authored directly in this file, in both languages).
type Block = { p: string } | { ul: string[] };

type Section = { id: string; title: string; blocks: Block[] };

const CHROME = {
  en: {
    nav_startbuilding: 'Start Building →',
    eyebrow: 'Legal',
    title: 'Terms & Conditions',
    subtitle: 'Všeobecné obchodní podmínky',
    updated: 'Last updated: [TODO: fill in effective date]',
    intro:
      'These Terms & Conditions ("VOP") govern the purchase of goods through the GOMP online store operated at this website. Please read them before placing an order. Where this English version and the Slovak/Czech version differ, the version in the language in which you concluded the contract governs; for the avoidance of doubt, the governing text for legal purposes is the Czech-language version, as these VOP are issued under the law of the Czech Republic.',
    toc_label: 'Contents',
    privacy_note: 'For details on how we handle personal data, see our',
    privacy_link: 'Privacy Policy',
  },
  sk: {
    nav_startbuilding: 'Začať stavať →',
    eyebrow: 'Právne',
    title: 'Obchodné podmienky',
    subtitle: 'Všeobecné obchodné podmienky (VOP)',
    updated: 'Posledná aktualizácia: [TODO: doplniť dátum účinnosti]',
    intro:
      'Tieto Všeobecné obchodné podmienky ("VOP") upravujú nákup tovaru prostredníctvom internetového obchodu GOMP prevádzkovaného na tejto webovej stránke. Pred odoslaním objednávky si ich, prosím, prečítajte. Tieto VOP sa riadia právnym poriadkom Českej republiky, keďže spoločnosť má sídlo v Českej republike (pozri nižšie).',
    toc_label: 'Obsah',
    privacy_note: 'Podrobnosti o spracovaní osobných údajov nájdete v dokumente',
    privacy_link: 'Ochrana osobných údajov',
  },
  cz: {
    nav_startbuilding: 'Začít stavět →',
    eyebrow: 'Právní',
    title: 'Obchodní podmínky',
    subtitle: 'Všeobecné obchodní podmínky (VOP)',
    updated: 'Poslední aktualizace: [TODO: doplnit datum účinnosti]',
    intro:
      'Tyto Všeobecné obchodní podmínky ("VOP") upravují nákup zboží prostřednictvím internetového obchodu GOMP provozovaného na těchto webových stránkách. Před odesláním objednávky si je, prosím, přečtěte. Tyto VOP se řídí právním řádem České republiky, neboť společnost má sídlo v České republice (viz níže).',
    toc_label: 'Obsah',
    privacy_note: 'Podrobnosti o zpracování osobních údajů naleznete v dokumentu',
    privacy_link: 'Ochrana osobních údajů',
  },
} as const;

const SECTIONS: Record<'en' | 'sk' | 'cz', Section[]> = {
  en: [
    {
      id: 'definitions',
      title: '1. Definitions and Scope',
      blocks: [
        { p: 'For the purposes of these VOP: "Seller" means the operator of this website identified in Section 2 below; "Buyer" or "Customer" means any natural or legal person who places an order through the website; "Consumer" means a Buyer who is a natural person acting outside the scope of their trade, business, craft, or profession, within the meaning of Section 419 of Act No. 89/2012 Coll., the Civil Code; "Goods" means the custom-configured and prebuilt computer systems, components, and accessories offered for sale on the website.' },
        { p: 'These VOP apply to all purchase contracts concluded between the Seller and a Buyer through the website, whether the Buyer is a Consumer or is acting within their trade, business, or profession ("Business Buyer"). Certain provisions below — in particular the statutory right of withdrawal in Section 6 — apply only to Consumers, as indicated.' },
        { p: 'These VOP form an integral part of every purchase contract concluded through the website. Deviating arrangements agreed individually in writing with a specific Buyer take precedence over these VOP.' },
      ],
    },
    {
      id: 'seller',
      title: '2. Seller Identification',
      blocks: [
        { ul: [
          'Company name: [TODO: fill in registered legal entity name]',
          'Registered seat: [TODO: fill in registered seat / address]',
          'IČO (Company ID): [TODO: fill in IČO]',
          'DIČ (VAT ID), if VAT-registered: [TODO: fill in DIČ]',
          'Court registration: [TODO: fill in Commercial Register entry, e.g. "Municipal Court in Prague, Section C, Insert No. ___", or trade licence register reference if a sole trader]',
          'Contact e-mail: [TODO: fill in support/contact e-mail address]',
          'Contact phone (optional): [TODO: fill in, or remove if not offered]',
        ] },
      ],
    },
    {
      id: 'ordering',
      title: '3. Ordering Process & Contract Formation',
      blocks: [
        { p: 'The website allows a Buyer to purchase a prebuilt configuration listed in the Shop, or to assemble a custom configuration using the 3D Build Configurator by selecting individual components (motherboard, CPU, cooler, RAM, GPU, storage, PSU, and case).' },
        { p: 'Placing an order through the checkout flow constitutes a binding offer by the Buyer to purchase the selected Goods at the price displayed at the time of order. The purchase contract is concluded at the moment the Seller confirms acceptance of the order (e.g. by e-mail order confirmation or by displaying an order confirmation screen). The Seller reserves the right to decline an order — for example if a selected component is no longer available, if a pricing error is evident, or if the Buyer has previously failed to meet payment obligations — and will inform the Buyer without undue delay if it does so.' },
        { p: 'The Buyer is responsible for the accuracy of the delivery and billing details provided at checkout. The Seller is not liable for delay or non-delivery caused by incorrect information supplied by the Buyer.' },
      ],
    },
    {
      id: 'pricing',
      title: '4. Prices and Payment Terms',
      blocks: [
        { p: 'All prices displayed on the website are shown in EUR, with an approximate CZK conversion offered for convenience only at the reference rate stated in the site footer; the price confirmed at checkout in the Buyer\'s selected currency is the binding price. Prices include applicable statutory VAT unless stated otherwise.' },
        { p: 'Component prices, and consequently the total price of a custom configuration, may be updated from time to time to reflect market conditions; the price applicable to a given order is the price displayed at the moment the order is placed, not any price shown before or after.' },
        { p: '[TODO: describe the accepted payment method(s) — e.g. payment card via [payment gateway], bank transfer, cash on delivery — and when payment is due (in advance / on delivery). No payment gateway is currently connected to the checkout flow; this section must be completed before the site processes real payments.]' },
      ],
    },
    {
      id: 'delivery',
      title: '5. Delivery Terms',
      blocks: [
        { p: 'The Seller aims to hand-assemble, benchmark, and ship every build within seven (7) business days of order confirmation, as indicated on the website. This is a target lead time, not a guaranteed delivery date, and may be extended for custom configurations, component shortages, or during periods of high demand; the Buyer will be informed of any material delay.' },
        { p: '[TODO: specify delivery methods/carriers offered, delivery costs or thresholds for free shipping, and the territories the Seller ships to.]' },
        { p: 'Risk of damage to the Goods passes to a Business Buyer upon handover to the carrier, and to a Consumer upon receipt of the Goods, in line with Section 2121 of the Civil Code.' },
      ],
    },
    {
      id: 'withdrawal',
      title: '6. Right of Withdrawal (Consumers Only)',
      blocks: [
        { p: 'If the Buyer is a Consumer and the contract was concluded as a distance contract (i.e. through this website), the Consumer has the right to withdraw from the contract without giving any reason within fourteen (14) calendar days of the day the Goods are received, in accordance with Section 1829 of the Civil Code.' },
        { p: 'To exercise this right, the Consumer must send an unequivocal statement of withdrawal to the Seller\'s contact e-mail (see Section 2) before the 14-day period expires. [TODO: confirm whether a dedicated withdrawal form/template will be provided, and the return address for sending back Goods.]' },
        { p: 'Important exception for custom configurations: under Section 1837(d) of the Civil Code, the right of withdrawal does not apply to goods that have been manufactured according to the Consumer\'s wishes or adapted to the Consumer\'s personal needs. Because builds assembled through the 3D Configurator are put together to the Buyer\'s own component selection, such custom builds are, as a rule, excluded from the 14-day withdrawal right. This exclusion does not apply to unmodified, prebuilt configurations purchased as listed in the Shop.' },
        { p: 'Where the right of withdrawal does apply, the Consumer must return the Goods without undue delay, and no later than 14 days after sending the withdrawal statement, at their own cost unless agreed otherwise. The Seller will refund all payments received, including standard delivery cost, without undue delay and no later than 14 days after being informed of the withdrawal, using the same payment method used by the Consumer unless otherwise agreed; the Seller may withhold the refund until the Goods are received back or proof of their return is provided.' },
        { p: 'The Consumer is liable for any diminished value of the Goods resulting from handling beyond what is necessary to establish the nature, characteristics, and functioning of the Goods.' },
      ],
    },
    {
      id: 'complaints',
      title: '7. Complaints Procedure (Reklamační řád) & Warranty',
      blocks: [
        { p: 'The Seller is liable for defects that the Goods exhibit upon receipt and that manifest within the statutory liability period, which for a Consumer is twenty-four (24) months from receipt of the Goods, pursuant to Sections 2165 et seq. of the Civil Code.' },
        { p: 'In addition to this statutory liability, the Seller offers a commercial warranty of three (3) years on parts and labour for hand-assembled builds, as advertised on the website. [TODO: confirm exact scope/exclusions of the commercial warranty — e.g. whether it covers user-inflicted damage, overclocking, or third-party component failure — and the process/turnaround for warranty repairs.]' },
        { p: 'To make a complaint, the Buyer should contact the Seller at the contact e-mail in Section 2, describing the defect and providing proof of purchase. The Seller will confirm receipt of the complaint and decide on it, including any remedy, within thirty (30) days, unless the Seller and Buyer agree upon a longer period, in accordance with Section 19 of Act No. 634/1992 Coll., on Consumer Protection.' },
        { p: 'Depending on the nature of the defect, the Buyer is entitled to repair, replacement, a reasonable price reduction, or withdrawal from the contract, in accordance with Sections 2169 and 2106–2107 of the Civil Code.' },
      ],
    },
    {
      id: 'liability',
      title: '8. Liability Limitations',
      blocks: [
        { p: 'Nothing in these VOP limits or excludes liability that cannot be limited or excluded under applicable Czech law, including liability for death or personal injury, or liability arising from a breach of statutory consumer protection provisions.' },
        { p: 'Subject to the foregoing, the Seller\'s liability for indirect or consequential loss (such as loss of data, loss of business, or loss of profit) arising from use of the Goods is excluded to the maximum extent permitted by law. Benchmark scores, performance figures, and PassMark references shown on the website are indicative and sourced from third-party benchmarking databases; actual real-world performance may vary by workload and configuration.' },
      ],
    },
    {
      id: 'disputes',
      title: '9. Dispute Resolution',
      blocks: [
        { p: 'If a dispute arising from the purchase contract cannot be resolved directly between the Buyer and the Seller, a Consumer has the right to bring an out-of-court dispute resolution ("ADR") proceeding before the Czech Trade Inspection Authority (Česká obchodní inspekce, "ČOI"), Štěpánská 567/15, 120 00 Praha 2, website: www.coi.cz / adr.coi.cz.' },
        { p: 'A Consumer resident in the EU may also use the European Commission\'s Online Dispute Resolution platform at https://ec.europa.eu/consumers/odr to lodge a complaint, which will be forwarded to ČOI.' },
      ],
    },
    {
      id: 'final',
      title: '10. Final Provisions',
      blocks: [
        { p: 'These VOP, and any purchase contract concluded through the website, are governed by the law of the Czech Republic, in particular Act No. 89/2012 Coll., the Civil Code, and, where the Buyer is a Consumer, Act No. 634/1992 Coll., on Consumer Protection, without prejudice to any mandatory consumer-protection rules of the country in which a Consumer Buyer is habitually resident.' },
        { p: 'If any provision of these VOP is or becomes invalid or unenforceable, this does not affect the validity of the remaining provisions; the invalid provision will be replaced by a valid provision that most closely reflects its intended purpose.' },
        { p: 'The Seller may amend these VOP; the version in force at the time an order is placed governs that order. The current version is always available on this page.' },
      ],
    },
  ],
  sk: [
    {
      id: 'definitions',
      title: '1. Definície a rozsah pôsobnosti',
      blocks: [
        { p: 'Na účely týchto VOP: „Predávajúci" je prevádzkovateľ tejto webovej stránky uvedený v časti 2 nižšie; „Kupujúci" alebo „Zákazník" je akákoľvek fyzická alebo právnická osoba, ktorá zadá objednávku prostredníctvom webovej stránky; „Spotrebiteľ" je Kupujúci, ktorý je fyzickou osobou konajúcou mimo rámca svojej podnikateľskej činnosti, remesla alebo povolania v zmysle § 419 zákona č. 89/2012 Sb., občianskeho zákonníka; „Tovar" sú individuálne konfigurované aj hotové počítačové zostavy, komponenty a príslušenstvo ponúkané na predaj na webovej stránke.' },
        { p: 'Tieto VOP sa vzťahujú na všetky kúpne zmluvy uzatvorené medzi Predávajúcim a Kupujúcim prostredníctvom webovej stránky bez ohľadu na to, či je Kupujúci Spotrebiteľom, alebo koná v rámci svojej podnikateľskej činnosti („Podnikateľský kupujúci"). Niektoré ustanovenia nižšie — najmä zákonné právo na odstúpenie od zmluvy v časti 6 — sa vzťahujú výlučne na Spotrebiteľov, ako je uvedené.' },
        { p: 'Tieto VOP tvoria neoddeliteľnú súčasť každej kúpnej zmluvy uzatvorenej prostredníctvom webovej stránky. Odlišné dojednania písomne dohodnuté individuálne s konkrétnym Kupujúcim majú prednosť pred týmito VOP.' },
      ],
    },
    {
      id: 'seller',
      title: '2. Identifikácia predávajúceho',
      blocks: [
        { ul: [
          'Obchodné meno: [TODO: doplniť registrovaný názov spoločnosti]',
          'Sídlo: [TODO: doplniť sídlo / adresu]',
          'IČO: [TODO: doplniť IČO]',
          'DIČ, ak je platcom DPH: [TODO: doplniť DIČ]',
          'Zápis v registri: [TODO: doplniť zápis v obchodnom registri, napr. „Mestský súd v Prahe, oddiel C, vložka č. ___", alebo číslo živnostenského oprávnenia]',
          'Kontaktný e-mail: [TODO: doplniť kontaktný e-mail]',
          'Kontaktný telefón (nepovinné): [TODO: doplniť, alebo odstrániť, ak sa neposkytuje]',
        ] },
      ],
    },
    {
      id: 'ordering',
      title: '3. Objednávka a uzatvorenie zmluvy',
      blocks: [
        { p: 'Webová stránka umožňuje Kupujúcemu zakúpiť hotovú konfiguráciu uvedenú v sekcii Obchod, alebo si prostredníctvom 3D konfigurátora zostaviť vlastnú konfiguráciu výberom jednotlivých komponentov (základná doska, CPU, chladič, RAM, GPU, úložisko, zdroj a skriňa).' },
        { p: 'Odoslaním objednávky prostredníctvom pokladne Kupujúci robí záväznú ponuku na kúpu vybraného Tovaru za cenu zobrazenú v čase objednávky. Kúpna zmluva je uzatvorená okamihom, keď Predávajúci potvrdí prijatie objednávky (napríklad e-mailovým potvrdením objednávky alebo zobrazením potvrdzujúcej obrazovky). Predávajúci si vyhradzuje právo objednávku odmietnuť — napríklad ak vybraný komponent už nie je dostupný, ak je zjavná chyba v cene, alebo ak si Kupujúci v minulosti nesplnil platobné povinnosti — a v takom prípade o tom Kupujúceho bez zbytočného odkladu informuje.' },
        { p: 'Kupujúci zodpovedá za správnosť dodacích a fakturačných údajov uvedených pri objednávke. Predávajúci nezodpovedá za omeškanie alebo nedoručenie spôsobené nesprávnymi údajmi poskytnutými Kupujúcim.' },
      ],
    },
    {
      id: 'pricing',
      title: '4. Ceny a platobné podmienky',
      blocks: [
        { p: 'Všetky ceny zobrazené na webovej stránke sú uvedené v EUR, s orientačným prepočtom na CZK v pätičke stránky, ktorý slúži len na informáciu; záväznou cenou je cena potvrdená v pokladni vo zvolenej mene Kupujúceho. Ceny zahŕňajú príslušnú zákonnú DPH, ak nie je uvedené inak.' },
        { p: 'Ceny komponentov, a teda aj celková cena vlastnej konfigurácie, sa môžu priebežne meniť podľa trhových podmienok; pre danú objednávku platí cena zobrazená v okamihu jej odoslania.' },
        { p: '[TODO: doplniť akceptovaný spôsob(y) platby — napr. platobná karta cez [platobná brána], bankový prevod, dobierka — a kedy je platba splatná (vopred / pri doručení). K pokladni v súčasnosti nie je pripojená žiadna platobná brána; túto časť treba doplniť pred spracovaním reálnych platieb.]' },
      ],
    },
    {
      id: 'delivery',
      title: '5. Dodacie podmienky',
      blocks: [
        { p: 'Predávajúci sa snaží každú zostavu ručne zložiť, otestovať a expedovať do siedmich (7) pracovných dní od potvrdenia objednávky, ako je uvedené na webovej stránke. Ide o orientačnú, nie garantovanú dobu dodania a pri vlastných konfiguráciách, nedostatku komponentov alebo vysokom dopyte sa môže predĺžiť; o podstatnom omeškaní bude Kupujúci informovaný.' },
        { p: '[TODO: doplniť spôsoby a dopravcov doručenia, náklady na dopravu alebo hranicu pre dopravu zdarma, a územia, kam sa dodáva.]' },
        { p: 'Nebezpečenstvo škody na Tovare prechádza na Podnikateľského kupujúceho odovzdaním dopravcovi a na Spotrebiteľa prevzatím Tovaru, v súlade s § 2121 občianskeho zákonníka.' },
      ],
    },
    {
      id: 'withdrawal',
      title: '6. Právo na odstúpenie od zmluvy (len pre spotrebiteľov)',
      blocks: [
        { p: 'Ak je Kupujúci Spotrebiteľom a zmluva bola uzatvorená ako zmluva na diaľku (t. j. prostredníctvom tejto webovej stránky), má Spotrebiteľ právo odstúpiť od zmluvy bez udania dôvodu do štrnástich (14) kalendárnych dní odo dňa prevzatia Tovaru, v súlade s § 1829 občianskeho zákonníka.' },
        { p: 'Na uplatnenie tohto práva musí Spotrebiteľ zaslať jednoznačné vyhlásenie o odstúpení na kontaktný e-mail Predávajúceho (pozri časť 2) pred uplynutím 14-dňovej lehoty. [TODO: potvrdiť, či bude poskytnutý vzorový formulár na odstúpenie, a adresu na vrátenie Tovaru.]' },
        { p: 'Dôležitá výnimka pre vlastné konfigurácie: podľa § 1837 písm. d) občianskeho zákonníka sa právo na odstúpenie nevzťahuje na tovar vyrobený podľa priania Spotrebiteľa alebo prispôsobený jeho osobným potrebám. Keďže zostavy poskladané cez 3D konfigurátor vznikajú podľa vlastného výberu komponentov Kupujúceho, takéto vlastné zostavy sú spravidla z 14-dňového práva na odstúpenie vylúčené. Táto výnimka sa nevzťahuje na nezmenené, hotové konfigurácie zakúpené zo sekcie Obchod.' },
        { p: 'Ak sa právo na odstúpenie uplatňuje, Spotrebiteľ musí Tovar vrátiť bez zbytočného odkladu, najneskôr do 14 dní od odoslania vyhlásenia o odstúpení, na vlastné náklady, ak nie je dohodnuté inak. Predávajúci vráti všetky prijaté platby vrátane štandardných nákladov na doručenie bez zbytočného odkladu, najneskôr do 14 dní od oznámenia o odstúpení, rovnakým spôsobom platby, aký použil Spotrebiteľ, ak sa nedohodne inak; Predávajúci môže vrátenie platby zadržať do prevzatia Tovaru späť alebo preukázania jeho odoslania.' },
        { p: 'Spotrebiteľ zodpovedá za zníženie hodnoty Tovaru, ktoré vzniklo v dôsledku zaobchádzania s ním nad rámec toho, čo je potrebné na zistenie povahy, vlastností a funkčnosti Tovaru.' },
      ],
    },
    {
      id: 'complaints',
      title: '7. Reklamačný poriadok a záruka',
      blocks: [
        { p: 'Predávajúci zodpovedá za vady, ktoré má Tovar pri prevzatí a ktoré sa prejavia v zákonnej lehote, ktorá je pre Spotrebiteľa dvadsaťštyri (24) mesiacov od prevzatia Tovaru, podľa § 2165 a nasl. občianskeho zákonníka.' },
        { p: 'Nad rámec tejto zákonnej zodpovednosti poskytuje Predávajúci na ručne skladané zostavy obchodnú záruku tri (3) roky na diely a prácu, ako je uvedené na webovej stránke. [TODO: potvrdiť presný rozsah/výluky obchodnej záruky — napr. či sa vzťahuje na poškodenie spôsobené používateľom, pretaktovanie alebo poruchu komponentu tretej strany — a proces/dobu vybavenia reklamácie v rámci záruky.]' },
        { p: 'Reklamáciu uplatňuje Kupujúci na kontaktnom e-maile z časti 2, s popisom vady a dokladom o kúpe. Predávajúci potvrdí prijatie reklamácie a rozhodne o nej vrátane prípadného nároku do tridsiatich (30) dní, ak sa s Kupujúcim nedohodne na dlhšej lehote, v súlade s § 19 zákona č. 634/1992 Sb., o ochrane spotrebiteľa.' },
        { p: 'Podľa povahy vady má Kupujúci nárok na opravu, výmenu, primeranú zľavu z ceny alebo odstúpenie od zmluvy, v súlade s § 2169 a § 2106 – 2107 občianskeho zákonníka.' },
      ],
    },
    {
      id: 'liability',
      title: '8. Obmedzenie zodpovednosti',
      blocks: [
        { p: 'Nič v týchto VOP neobmedzuje ani nevylučuje zodpovednosť, ktorú podľa platného českého práva nemožno obmedziť ani vylúčiť, vrátane zodpovednosti za smrť alebo ujmu na zdraví, alebo zodpovednosti vyplývajúcej z porušenia zákonných ustanovení na ochranu spotrebiteľa.' },
        { p: 'S výhradou uvedeného sa zodpovednosť Predávajúceho za nepriamu alebo následnú škodu (napríklad stratu dát, stratu obchodnej príležitosti alebo ušlý zisk) vyplývajúcu z používania Tovaru vylučuje v maximálnom rozsahu povolenom zákonom. Skóre benchmarkov, výkonnostné údaje a odkazy na PassMark uvedené na webovej stránke sú orientačné a pochádzajú z databáz tretích strán; skutočný výkon v praxi sa môže líšiť podľa záťaže a konfigurácie.' },
      ],
    },
    {
      id: 'disputes',
      title: '9. Riešenie sporov',
      blocks: [
        { p: 'Ak sa spor vyplývajúci z kúpnej zmluvy nepodarí vyriešiť priamo medzi Kupujúcim a Predávajúcim, má Spotrebiteľ právo obrátiť sa na mimosúdne riešenie sporov („ADR") na Českú obchodnú inšpekciu (Česká obchodní inspekce, „ČOI"), Štěpánská 567/15, 120 00 Praha 2, web: www.coi.cz / adr.coi.cz.' },
        { p: 'Spotrebiteľ s bydliskom v EÚ môže na podanie sťažnosti využiť aj platformu Európskej komisie na riešenie sporov online na https://ec.europa.eu/consumers/odr, ktorá bude postúpená ČOI.' },
      ],
    },
    {
      id: 'final',
      title: '10. Záverečné ustanovenia',
      blocks: [
        { p: 'Tieto VOP, ako aj každá kúpna zmluva uzatvorená prostredníctvom webovej stránky, sa riadia právnym poriadkom Českej republiky, najmä zákonom č. 89/2012 Sb., občianskym zákonníkom, a ak je Kupujúci Spotrebiteľom, zákonom č. 634/1992 Sb., o ochrane spotrebiteľa, bez toho, aby boli dotknuté kogentné spotrebiteľské predpisy krajiny obvyklého pobytu Spotrebiteľa.' },
        { p: 'Ak sa niektoré ustanovenie týchto VOP stane neplatným alebo nevymáhateľným, nemá to vplyv na platnosť ostatných ustanovení; neplatné ustanovenie bude nahradené platným ustanovením, ktoré najlepšie zodpovedá jeho pôvodnému účelu.' },
        { p: 'Predávajúci môže tieto VOP meniť; pre danú objednávku platí znenie účinné v čase jej odoslania. Aktuálne znenie je vždy dostupné na tejto stránke.' },
      ],
    },
  ],
  cz: [
    {
      id: 'definitions',
      title: '1. Definice a rozsah působnosti',
      blocks: [
        { p: 'Pro účely těchto VOP: „Prodávající" je provozovatel těchto webových stránek uvedený v článku 2 níže; „Kupující" nebo „Zákazník" je jakákoli fyzická nebo právnická osoba, která zadá objednávku prostřednictvím webových stránek; „Spotřebitel" je Kupující, který je fyzickou osobou jednající mimo rámec své podnikatelské činnosti, řemesla nebo povolání ve smyslu § 419 zákona č. 89/2012 Sb., občanského zákoníku; „Zboží" jsou individuálně konfigurované i předsestavené počítačové sestavy, komponenty a příslušenství nabízené k prodeji na webových stránkách.' },
        { p: 'Tyto VOP se vztahují na všechny kupní smlouvy uzavřené mezi Prodávajícím a Kupujícím prostřednictvím webových stránek bez ohledu na to, zda je Kupující Spotřebitelem, nebo jedná v rámci své podnikatelské činnosti („Podnikatelský kupující"). Některá ustanovení níže — zejména zákonné právo odstoupit od smlouvy v článku 6 — se vztahují výhradně na Spotřebitele, jak je uvedeno.' },
        { p: 'Tyto VOP tvoří nedílnou součást každé kupní smlouvy uzavřené prostřednictvím webových stránek. Odlišná ujednání sjednaná písemně individuálně s konkrétním Kupujícím mají přednost před těmito VOP.' },
      ],
    },
    {
      id: 'seller',
      title: '2. Identifikace prodávajícího',
      blocks: [
        { ul: [
          'Obchodní firma: [TODO: doplnit registrovaný název společnosti]',
          'Sídlo: [TODO: doplnit sídlo / adresu]',
          'IČO: [TODO: doplnit IČO]',
          'DIČ, je-li plátcem DPH: [TODO: doplnit DIČ]',
          'Zápis v rejstříku: [TODO: doplnit zápis v obchodním rejstříku, např. „Městský soud v Praze, oddíl C, vložka č. ___", nebo číslo živnostenského oprávnění]',
          'Kontaktní e-mail: [TODO: doplnit kontaktní e-mail]',
          'Kontaktní telefon (nepovinné): [TODO: doplnit, nebo odstranit, pokud se neposkytuje]',
        ] },
      ],
    },
    {
      id: 'ordering',
      title: '3. Objednávka a uzavření smlouvy',
      blocks: [
        { p: 'Webové stránky umožňují Kupujícímu zakoupit předsestavenou konfiguraci uvedenou v sekci Obchod, nebo si prostřednictvím 3D konfigurátoru sestavit vlastní konfiguraci výběrem jednotlivých komponent (základní deska, procesor, chladič, RAM, grafická karta, úložiště, zdroj a skříň).' },
        { p: 'Odesláním objednávky prostřednictvím pokladny činí Kupující závaznou nabídku na koupi vybraného Zboží za cenu zobrazenou v okamžiku objednávky. Kupní smlouva je uzavřena okamžikem, kdy Prodávající potvrdí přijetí objednávky (například e-mailovým potvrzením objednávky nebo zobrazením potvrzující obrazovky). Prodávající si vyhrazuje právo objednávku odmítnout — například pokud vybraná komponenta již není dostupná, je-li zjevná chyba v ceně, nebo pokud Kupující v minulosti nesplnil platební povinnosti — a v takovém případě o tom Kupujícího bez zbytečného odkladu informuje.' },
        { p: 'Kupující odpovídá za správnost dodacích a fakturačních údajů uvedených při objednávce. Prodávající neodpovídá za prodlení nebo nedoručení způsobené nesprávnými údaji poskytnutými Kupujícím.' },
      ],
    },
    {
      id: 'pricing',
      title: '4. Ceny a platební podmínky',
      blocks: [
        { p: 'Všechny ceny zobrazené na webových stránkách jsou uvedeny v EUR, s orientačním přepočtem na CZK v patičce stránky, který slouží pouze pro informaci; závaznou cenou je cena potvrzená v pokladně ve zvolené měně Kupujícího. Ceny zahrnují příslušnou zákonnou DPH, není-li uvedeno jinak.' },
        { p: 'Ceny komponent, a tedy i celková cena vlastní konfigurace, se mohou průběžně měnit podle tržních podmínek; pro danou objednávku platí cena zobrazená v okamžiku jejího odeslání, nikoli cena zobrazená dříve nebo později.' },
        { p: '[TODO: doplnit akceptovaný způsob(y) platby — např. platební karta prostřednictvím [platební brána], bankovní převod, dobírka — a kdy je platba splatná (předem / při doručení). K pokladně v současnosti není připojena žádná platební brána; tuto část je třeba doplnit před zpracováním skutečných plateb.]' },
      ],
    },
    {
      id: 'delivery',
      title: '5. Dodací podmínky',
      blocks: [
        { p: 'Prodávající usiluje o ruční sestavení, otestování a expedici každé sestavy do sedmi (7) pracovních dnů od potvrzení objednávky, jak je uvedeno na webových stránkách. Jde o orientační, nikoli garantovanou dobu dodání, která se může u vlastních konfigurací, při nedostatku komponent nebo v období vysoké poptávky prodloužit; o podstatném prodlení bude Kupující informován.' },
        { p: '[TODO: doplnit způsoby a dopravce doručení, náklady na dopravu nebo hranici pro dopravu zdarma a území, kam se dodává.]' },
        { p: 'Nebezpečí škody na Zboží přechází na Podnikatelského kupujícího předáním dopravci a na Spotřebitele převzetím Zboží, v souladu s § 2121 občanského zákoníku.' },
      ],
    },
    {
      id: 'withdrawal',
      title: '6. Právo odstoupit od smlouvy (pouze pro spotřebitele)',
      blocks: [
        { p: 'Je-li Kupující Spotřebitelem a smlouva byla uzavřena jako smlouva uzavřená distančním způsobem (tj. prostřednictvím těchto webových stránek), má Spotřebitel právo odstoupit od smlouvy bez udání důvodu do čtrnácti (14) kalendářních dnů ode dne převzetí Zboží, v souladu s § 1829 občanského zákoníku.' },
        { p: 'K uplatnění tohoto práva musí Spotřebitel zaslat jednoznačné prohlášení o odstoupení na kontaktní e-mail Prodávajícího (viz článek 2) před uplynutím 14denní lhůty. [TODO: potvrdit, zda bude poskytnut vzorový formulář pro odstoupení, a adresu pro vrácení Zboží.]' },
        { p: 'Důležitá výjimka pro vlastní konfigurace: podle § 1837 písm. d) občanského zákoníku se právo odstoupit od smlouvy nevztahuje na zboží vyrobené podle přání Spotřebitele nebo přizpůsobené jeho osobním potřebám. Jelikož sestavy poskládané prostřednictvím 3D konfigurátoru vznikají podle vlastního výběru komponent Kupujícího, jsou takové vlastní sestavy zpravidla z 14denního práva na odstoupení vyloučeny. Tato výjimka se nevztahuje na nezměněné, předsestavené konfigurace zakoupené ze sekce Obchod.' },
        { p: 'Uplatňuje-li se právo odstoupit od smlouvy, musí Spotřebitel Zboží vrátit bez zbytečného odkladu, nejpozději do 14 dnů od odeslání prohlášení o odstoupení, na vlastní náklady, není-li dohodnuto jinak. Prodávající vrátí všechny přijaté platby včetně standardních nákladů na doručení bez zbytečného odkladu, nejpozději do 14 dnů od obdržení oznámení o odstoupení, stejným způsobem platby, jaký použil Spotřebitel, nedohodne-li se jinak; Prodávající může vrácení platby zadržet do přijetí Zboží zpět nebo prokázání jeho odeslání zpět.' },
        { p: 'Spotřebitel odpovídá za snížení hodnoty Zboží, které vzniklo v důsledku nakládání s ním nad rámec toho, co je nutné ke zjištění povahy, vlastností a funkčnosti Zboží.' },
      ],
    },
    {
      id: 'complaints',
      title: '7. Reklamační řád a záruka',
      blocks: [
        { p: 'Prodávající odpovídá za vady, které má Zboží při převzetí a které se projeví v zákonné lhůtě, jež pro Spotřebitele činí dvacet čtyři (24) měsíců od převzetí Zboží, podle § 2165 a násl. občanského zákoníku.' },
        { p: 'Nad rámec této zákonné odpovědnosti poskytuje Prodávající na ručně skládané sestavy obchodní záruku tři (3) roky na díly a práci, jak je uvedeno na webových stránkách. [TODO: potvrdit přesný rozsah/výluky obchodní záruky — např. zda se vztahuje na poškození způsobené uživatelem, přetaktování nebo poruchu komponenty třetí strany — a proces/dobu vyřízení reklamace v rámci záruky.]' },
        { p: 'Reklamaci uplatňuje Kupující na kontaktním e-mailu z článku 2, s popisem vady a dokladem o koupi. Prodávající potvrdí přijetí reklamace a rozhodne o ní, včetně případného nároku, do třiceti (30) dnů, nedohodne-li se s Kupujícím na delší lhůtě, v souladu s § 19 zákona č. 634/1992 Sb., o ochraně spotřebitele.' },
        { p: 'Podle povahy vady má Kupující nárok na opravu, výměnu, přiměřenou slevu z ceny nebo odstoupení od smlouvy, v souladu s § 2169 a § 2106–2107 občanského zákoníku.' },
      ],
    },
    {
      id: 'liability',
      title: '8. Omezení odpovědnosti',
      blocks: [
        { p: 'Nic v těchto VOP neomezuje ani nevylučuje odpovědnost, kterou podle platného českého práva nelze omezit ani vyloučit, včetně odpovědnosti za usmrcení nebo újmu na zdraví, nebo odpovědnosti vyplývající z porušení zákonných ustanovení na ochranu spotřebitele.' },
        { p: 'S výhradou výše uvedeného se odpovědnost Prodávajícího za nepřímou nebo následnou škodu (například ztrátu dat, ztrátu obchodní příležitosti nebo ušlý zisk) vyplývající z používání Zboží vylučuje v maximálním rozsahu povoleném zákonem. Skóre benchmarků, výkonnostní údaje a odkazy na PassMark uvedené na webových stránkách jsou orientační a pocházejí z databází třetích stran; skutečný výkon v praxi se může lišit podle zátěže a konfigurace.' },
      ],
    },
    {
      id: 'disputes',
      title: '9. Řešení sporů',
      blocks: [
        { p: 'Nepodaří-li se spor vyplývající z kupní smlouvy vyřešit přímo mezi Kupujícím a Prodávajícím, má Spotřebitel právo obrátit se na mimosoudní řešení spotřebitelských sporů („ADR") u České obchodní inspekce („ČOI"), Štěpánská 567/15, 120 00 Praha 2, web: www.coi.cz / adr.coi.cz.' },
        { p: 'Spotřebitel s bydlištěm v EU může k podání stížnosti využít rovněž platformu Evropské komise pro řešení sporů online na adrese https://ec.europa.eu/consumers/odr, která bude postoupena ČOI.' },
      ],
    },
    {
      id: 'final',
      title: '10. Závěrečná ustanovení',
      blocks: [
        { p: 'Tyto VOP, jakož i každá kupní smlouva uzavřená prostřednictvím webových stránek, se řídí právním řádem České republiky, zejména zákonem č. 89/2012 Sb., občanským zákoníkem, a je-li Kupující Spotřebitelem, zákonem č. 634/1992 Sb., o ochraně spotřebitele, aniž jsou dotčena kogentní spotřebitelská pravidla země obvyklého bydliště Spotřebitele.' },
        { p: 'Stane-li se některé ustanovení těchto VOP neplatným nebo nevymahatelným, nemá to vliv na platnost ostatních ustanovení; neplatné ustanovení bude nahrazeno platným ustanovením, které nejlépe odpovídá jeho původnímu účelu.' },
        { p: 'Prodávající může tyto VOP měnit; pro danou objednávku platí znění účinné v okamžiku jejího odeslání. Aktuální znění je vždy dostupné na této stránce.' },
      ],
    },
  ],
};

function BlockRenderer({ block }: { block: Block }) {
  if ('p' in block) {
    return <p style={{ ...sans, fontSize: 15, lineHeight: 1.8, color: MUTED, margin: '0 0 20px', fontWeight: 300 }}>{block.p}</p>;
  }
  return (
    <ul style={{ margin: '0 0 20px', paddingLeft: 20 }}>
      {block.ul.map((item, i) => (
        <li key={i} style={{ ...sans, fontSize: 15, lineHeight: 1.9, color: MUTED, fontWeight: 300, marginBottom: 4 }}>
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function TermsPage() {
  const { lang } = useSite();
  const t = CHROME[lang];
  const sections = SECTIONS[lang];
  const isMobile = useIsMobile();

  return (
    <div style={{ position: 'relative', zIndex: 2, background: PAGE_BG, minHeight: '100vh' }}>
      <SiteNav
        cta={
          <TransitionLink
            href="/build"
            style={{ ...sans, fontSize: 13, fontWeight: 500, color: PANEL_BG, background: MAROON, textDecoration: 'none', padding: '9px 22px', borderRadius: 2 }}
          >
            {t.nav_startbuilding}
          </TransitionLink>
        }
      />

      {/* Header */}
      <section style={{ padding: isMobile ? '70px 24px 40px' : '140px 60px 60px', borderBottom: '0.5px solid rgba(28,28,26,0.12)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ ...sans, fontSize: 11, fontWeight: 500, color: MUTED, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: isMobile ? 20 : 32 }}>
            {t.eyebrow}
          </div>
          <h1 style={{ ...serif, fontSize: isMobile ? 38 : 64, fontWeight: 600, letterSpacing: isMobile ? '-1px' : '-2px', color: INK, margin: '0 0 8px', lineHeight: 1 }}>
            {t.title}
          </h1>
          <div style={{ ...sans, fontSize: 15, fontStyle: 'italic', color: MAROON, marginBottom: 20 }}>{t.subtitle}</div>
          <div style={{ ...sans, fontSize: 12, color: MUTED, marginBottom: 24 }}>{t.updated}</div>
          <p style={{ ...sans, fontSize: 15, lineHeight: 1.8, color: MUTED, margin: 0, fontWeight: 300, maxWidth: 700 }}>{t.intro}</p>
        </div>
      </section>

      {/* Body */}
      <section style={{ padding: isMobile ? '40px 24px 60px' : '60px 60px 100px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '200px 1fr', gap: isMobile ? 32 : 56, alignItems: 'start' }}>
          {/* Table of contents */}
          {!isMobile && (
            <nav style={{ position: 'sticky', top: 84 }}>
              <div style={{ ...sans, fontSize: 10, fontWeight: 600, color: MUTED, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
                {t.toc_label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sections.map((s) => (
                  <a key={s.id} href={`#${s.id}`} style={{ ...sans, fontSize: 12.5, color: MUTED, textDecoration: 'none', lineHeight: 1.5 }}>
                    {s.title}
                  </a>
                ))}
              </div>
            </nav>
          )}

          <div>
            {sections.map((s) => (
              <div key={s.id} id={s.id} style={{ marginBottom: 40, scrollMarginTop: 84 }}>
                <h2 style={{ ...serif, fontSize: isMobile ? 22 : 26, fontWeight: 600, color: INK, letterSpacing: '-0.4px', margin: '0 0 16px' }}>
                  {s.title}
                </h2>
                {s.blocks.map((b, i) => (
                  <BlockRenderer key={i} block={b} />
                ))}
              </div>
            ))}

            <div style={{ borderTop: '0.5px solid rgba(28,28,26,0.12)', paddingTop: 24, marginTop: 24 }}>
              <p style={{ ...sans, fontSize: 13, color: MUTED, fontWeight: 300, margin: 0 }}>
                {t.privacy_note}{' '}
                <TransitionLink href="/privacy" style={{ color: MAROON, textDecoration: 'underline' }}>
                  {t.privacy_link}
                </TransitionLink>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
