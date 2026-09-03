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

type Block = { p: string } | { ul: string[] };
type Section = { id: string; title: string; blocks: Block[] };

const CHROME = {
  en: {
    nav_startbuilding: 'Start Building →',
    eyebrow: 'Legal',
    title: 'Privacy Policy',
    subtitle: 'Zásady ochrany osobních údajů',
    updated: 'Last updated: [TODO: fill in effective date]',
    intro:
      'This Privacy Policy explains what personal data GOMP collects through this website, why, who it is shared with, and what rights you have under the General Data Protection Regulation (EU) 2016/679 ("GDPR") and applicable Czech law (Act No. 110/2019 Coll., on Personal Data Processing).',
    toc_label: 'Contents',
    terms_note: 'For the terms governing purchases, see our',
    terms_link: 'Terms & Conditions',
  },
  sk: {
    nav_startbuilding: 'Začať stavať →',
    eyebrow: 'Právne',
    title: 'Ochrana osobných údajov',
    subtitle: 'Zásady ochrany osobných údajov',
    updated: 'Posledná aktualizácia: [TODO: doplniť dátum účinnosti]',
    intro:
      'Tieto Zásady ochrany osobných údajov vysvetľujú, aké osobné údaje spoločnosť GOMP získava prostredníctvom tejto webovej stránky, prečo, komu sú poskytované a aké práva máte podľa Všeobecného nariadenia o ochrane osobných údajov (EÚ) 2016/679 („GDPR") a príslušných predpisov Českej republiky (zákon č. 110/2019 Sb., o spracování osobních údajů).',
    toc_label: 'Obsah',
    terms_note: 'Podmienky upravujúce nákup nájdete v dokumente',
    terms_link: 'Obchodné podmienky',
  },
  cz: {
    nav_startbuilding: 'Začít stavět →',
    eyebrow: 'Právní',
    title: 'Ochrana osobních údajů',
    subtitle: 'Zásady ochrany osobních údajů',
    updated: 'Poslední aktualizace: [TODO: doplnit datum účinnosti]',
    intro:
      'Tyto Zásady ochrany osobních údajů vysvětlují, jaké osobní údaje společnost GOMP shromažďuje prostřednictvím těchto webových stránek, proč, komu jsou předávány a jaká práva máte podle Obecného nařízení o ochraně osobních údajů (EU) 2016/679 („GDPR") a příslušných předpisů České republiky (zákon č. 110/2019 Sb., o zpracování osobních údajů).',
    toc_label: 'Obsah',
    terms_note: 'Podmínky upravující nákup naleznete v dokumentu',
    terms_link: 'Obchodní podmínky',
  },
} as const;

const SECTIONS: Record<'en' | 'sk' | 'cz', Section[]> = {
  en: [
    {
      id: 'controller',
      title: '1. Who We Are (Data Controller)',
      blocks: [
        { p: 'The data controller responsible for personal data processed through this website is:' },
        { ul: [
          'Company name: [TODO: fill in registered legal entity name]',
          'Registered seat: [TODO: fill in registered seat / address]',
          'IČO: [TODO: fill in IČO]',
          'Contact e-mail for data protection queries: [TODO: fill in a dedicated privacy/DPO contact e-mail]',
        ] },
        { p: '[TODO: if a Data Protection Officer is appointed, name and contact details go here; if not applicable, this line can be removed.]' },
      ],
    },
    {
      id: 'data',
      title: '2. What Data We Collect and Why',
      blocks: [
        { p: 'Account & authentication data. When you create an account, we (via our authentication providers, Supabase Auth and/or Clerk — see Section 4) process your name, e-mail address, and a securely hashed password, plus optionally a phone number you add in your account profile. This is processed to create and operate your account and to let you sign in — legal basis: performance of a contract with you (GDPR Art. 6(1)(b)).' },
        { p: 'Order & delivery data. When you place an order, we process the components/configuration selected, the order total, order status, and any delivery address you save. This is processed to fulfil your order and to comply with our accounting and tax record-keeping obligations — legal basis: performance of a contract (Art. 6(1)(b)) and legal obligation (Art. 6(1)(c)).' },
        { p: 'Secondhand build request data (Gomp Budget Builds). If you submit a "Gomp Budget Builds" request, we process your first and last name, e-mail address, phone number, budget, and any notes you provide, in order to research current secondhand-market listings and send you a price proposal. This is processed to take steps you requested toward a possible contract — legal basis: pre-contractual steps at your request (Art. 6(1)(b)).' },
        { p: 'Browser preference data. Your language, currency, and device-view preferences, and an in-progress build/checkout draft, are stored locally in your browser (not on our servers) so the site remembers your choices between visits. This is strictly necessary for the site to function and does not require consent.' },
        { p: 'Performance/technical data. We use Vercel Speed Insights to measure page-load performance (Core Web Vitals) in aggregate, so we can keep the site fast. In its standard configuration this does not set tracking cookies or identify you individually — legal basis: our legitimate interest in operating a reliable website (Art. 6(1)(f)). [TODO: confirm current Speed Insights configuration and whether any identifiers are collected before relying on this basis.]' },
      ],
    },
    {
      id: 'ai',
      title: '3. Automated Processing & AI Tools',
      blocks: [
        { p: 'We do not use artificial intelligence or any other automated system to make decisions about you or your order that would produce legal effects or otherwise significantly affect you without a person reviewing them first — every price proposal, order, and support reply is checked by a human being before it reaches you (GDPR Art. 22).' },
        { p: 'Product photography on this site may have its background removed using an on-device machine-learning tool that runs locally in the administrator\'s own browser when a product photo is uploaded. It only processes product photos we upload ourselves and never processes any of your personal data.' },
        { p: 'If we ever use a general-purpose AI assistant to help draft a reply to your enquiry, we only share what is necessary for that specific reply, and we do not use your data to train an AI provider\'s models where an option to opt out of such training is available. [TODO: if a specific AI tool/vendor is used for this in practice, name it here and confirm its data-training and data-location terms before relying on this paragraph.]' },
      ],
    },
    {
      id: 'processors',
      title: '4. Third Parties We Share Data With',
      blocks: [
        { p: 'We use the following processors to operate the website and store your data. We do not sell personal data to anyone.' },
        { ul: [
          'Supabase — database hosting and (where used) authentication. Stores account, profile, address, order, and Gomp Budget Builds request data. [TODO: confirm current hosting region — at the time of writing the project is provisioned in an EU AWS region.]',
          'Clerk — authentication provider (sign-in/sign-up). Processes your name, e-mail, and session/authentication data. Clerk, Inc. is based in the United States. [TODO: confirm and cite the transfer safeguard in place — e.g. EU-U.S. Data Privacy Framework or Standard Contractual Clauses — and whether an EU data residency option is enabled.]',
          'Vercel — website hosting, and the Speed Insights performance-monitoring feature described above. Vercel Inc. is based in the United States. [TODO: confirm and cite the transfer safeguard in place, as above.]',
          '[TODO: add any e-mail delivery provider used to send order confirmations, if/when one is connected.]',
          '[TODO: add any payment provider used to process payments, if/when one is connected — note that no payment gateway is connected to checkout at the time of writing.]',
        ] },
      ],
    },
    {
      id: 'retention',
      title: '5. How Long We Keep Your Data',
      blocks: [
        { p: '[TODO: fill in the retention period for account data — e.g. for as long as your account is active, plus a defined period after closure.]' },
        { p: 'Order and invoicing records are, as a general rule under Czech accounting and tax law, required to be kept for ten (10) years from the end of the accounting period to which they relate. [TODO: confirm the exact retention period actually applied and document it here.]' },
        { p: '[TODO: fill in the retention period for any other data category not covered above.]' },
      ],
    },
    {
      id: 'transfers',
      title: '6. International Transfers',
      blocks: [
        { p: 'Some of our processors (Clerk and Vercel, listed in Section 4) are based in the United States, which means personal data may be transferred outside the European Economic Area. Where this occurs, we rely on the transfer mechanism(s) offered by that processor — such as the EU-U.S. Data Privacy Framework or the European Commission\'s Standard Contractual Clauses. [TODO: confirm and document the specific mechanism relied upon for each processor before relying on this section.]' },
      ],
    },
    {
      id: 'cookies',
      title: '7. Cookies & Local Storage',
      blocks: [
        { p: 'This website does not currently use tracking, analytics, or marketing cookies. The site does store a small number of items in your browser\'s local storage — not cookies in the strict sense, but a similar client-side mechanism — to remember your language, currency, device-view preference, and an in-progress build/order draft. These are all strictly necessary for the site to function as intended and do not require your consent under the ePrivacy rules.' },
        { p: 'Vercel Speed Insights, described in Section 2, operates in its default configuration without setting cookies.' },
        { p: 'Gap to close: this site does not currently display a cookie/consent banner. That is consistent with only using strictly-necessary local storage today, but if any analytics, advertising, or other non-essential cookie is added in the future, a consent banner offering a genuine opt-in choice (categorised as necessary / analytics / marketing) must be implemented before that cookie is set, and this section must be updated accordingly.' },
      ],
    },
    {
      id: 'rights',
      title: '8. Your Rights',
      blocks: [
        { p: 'Under the GDPR, you have the right to:' },
        { ul: [
          'Access the personal data we hold about you;',
          'Rectification of inaccurate or incomplete data;',
          'Erasure of your data ("right to be forgotten"), subject to any legal obligation we have to keep it;',
          'Restriction of processing in certain circumstances;',
          'Data portability, i.e. to receive your data in a structured, commonly used format;',
          'Object to processing based on our legitimate interest;',
          'Withdraw consent at any time, where processing is based on consent, without affecting processing carried out before withdrawal.',
        ] },
        { p: 'To exercise any of these rights, contact us at the e-mail address in Section 1. You also have the right to lodge a complaint with the Czech Office for Personal Data Protection (Úřad pro ochranu osobních údajů, "ÚOOÚ"), Pplk. Sochora 27, 170 00 Praha 7, website: www.uoou.cz, if you consider that our processing of your data infringes the GDPR.' },
      ],
    },
    {
      id: 'changes',
      title: '9. Changes to This Policy',
      blocks: [
        { p: 'We may update this Privacy Policy from time to time, in particular to reflect changes to the processors we use or to applicable law. The current version is always available on this page.' },
      ],
    },
  ],
  sk: [
    {
      id: 'controller',
      title: '1. Kto sme (prevádzkovateľ)',
      blocks: [
        { p: 'Prevádzkovateľom zodpovedným za osobné údaje spracúvané prostredníctvom tejto webovej stránky je:' },
        { ul: [
          'Obchodné meno: [TODO: doplniť registrovaný názov spoločnosti]',
          'Sídlo: [TODO: doplniť sídlo / adresu]',
          'IČO: [TODO: doplniť IČO]',
          'Kontaktný e-mail pre otázky ochrany údajov: [TODO: doplniť vyhradený kontaktný e-mail]',
        ] },
        { p: '[TODO: ak je vymenovaná zodpovedná osoba (DPO), jej meno a kontakt patria sem; ak sa neuplatňuje, tento riadok možno odstrániť.]' },
      ],
    },
    {
      id: 'data',
      title: '2. Aké údaje spracúvame a prečo',
      blocks: [
        { p: 'Údaje o účte a prihlásení. Pri vytvorení účtu spracúvame (prostredníctvom našich poskytovateľov autentifikácie, Supabase Auth a/alebo Clerk — pozri časť 4) vaše meno, e-mailovú adresu a bezpečne zahašované heslo, prípadne telefónne číslo, ktoré doplníte vo svojom profile. Robíme tak na vytvorenie a prevádzku vášho účtu a umožnenie prihlásenia — právny základ: plnenie zmluvy s vami (čl. 6 ods. 1 písm. b) GDPR).' },
        { p: 'Údaje o objednávke a doručení. Pri vytvorení objednávky spracúvame vybrané komponenty/konfiguráciu, celkovú cenu objednávky, stav objednávky a prípadnú uloženú doručovaciu adresu. Robíme tak na vybavenie vašej objednávky a splnenie účtovných a daňových povinností — právny základ: plnenie zmluvy (čl. 6 ods. 1 písm. b)) a zákonná povinnosť (čl. 6 ods. 1 písm. c)).' },
        { p: 'Údaje o žiadosti o bazárovú zostavu (Gomp Budget Builds). Ak odošlete žiadosť „Gomp Budget Builds", spracúvame vaše meno, priezvisko, e-mailovú adresu, telefónne číslo, rozpočet a akékoľvek poznámky, ktoré uvediete, aby sme mohli prehľadať aktuálne ponuky na bazárovom trhu a zaslať vám cenový návrh. Robíme tak na základe krokov, ktoré ste si vyžiadali smerom k prípadnej zmluve — právny základ: kroky pred uzavretím zmluvy na vašu žiadosť (čl. 6 ods. 1 písm. b)).' },
        { p: 'Údaje o preferenciách v prehliadači. Vaše nastavenia jazyka, meny a zobrazenia zariadenia, ako aj rozpracovaná zostava/objednávka, sa ukladajú lokálne vo vašom prehliadači (nie na našich serveroch), aby si stránka pamätala vaše voľby medzi návštevami. Je to nevyhnutné pre fungovanie stránky a nevyžaduje súhlas.' },
        { p: 'Výkonnostné/technické údaje. Používame Vercel Speed Insights na súhrnné meranie rýchlosti načítania stránky (Core Web Vitals), aby sme udržali stránku rýchlu. V štandardnom nastavení sa tým nenastavujú sledovacie cookies ani sa vás individuálne neidentifikuje — právny základ: náš oprávnený záujem na prevádzke spoľahlivej webovej stránky (čl. 6 ods. 1 písm. f)). [TODO: pred spoliehaním sa na tento právny základ potvrdiť aktuálne nastavenie Speed Insights a či sa zbierajú nejaké identifikátory.]' },
      ],
    },
    {
      id: 'ai',
      title: '3. Automatizované rozhodovanie a nástroje AI',
      blocks: [
        { p: 'Umelú inteligenciu ani iný automatizovaný systém nepoužívame na prijímanie rozhodnutí o vás alebo vašej objednávke, ktoré by mali právne účinky alebo by sa vás inak významne dotýkali, bez toho, aby ich najprv skontroloval človek — každý cenový návrh, objednávku aj odpoveď na vašu otázku pred odoslaním skontroluje človek (čl. 22 GDPR).' },
        { p: 'Fotografiám produktov na tejto stránke môže byť odstránené pozadie pomocou nástroja strojového učenia, ktorý beží priamo v prehliadači administrátora v okamihu nahrania fotografie. Tento nástroj spracúva iba fotografie produktov, ktoré nahrávame my, a nikdy nespracúva žiadne vaše osobné údaje.' },
        { p: 'Ak na pomoc s odpoveďou na vašu otázku niekedy použijeme všeobecného AI asistenta, zdieľame s ním iba to, čo je potrebné na danú konkrétnu odpoveď, a vaše údaje nepoužívame na trénovanie modelov poskytovateľa AI, ak je k dispozícii možnosť takéto použitie odmietnuť. [TODO: ak sa v praxi na tento účel používa konkrétny nástroj/poskytovateľ AI, uviesť ho tu a pred spoliehaním sa na tento odsek potvrdiť jeho podmienky týkajúce sa trénovania a umiestnenia údajov.]' },
      ],
    },
    {
      id: 'processors',
      title: '4. Tretie strany, s ktorými zdieľame údaje',
      blocks: [
        { p: 'Na prevádzku webovej stránky a uloženie vašich údajov využívame nasledujúcich spracovateľov. Osobné údaje nikomu nepredávame.' },
        { ul: [
          'Supabase — hosting databázy a (ak sa používa) autentifikácia. Ukladá údaje o účte, profile, adresách, objednávkach a žiadostiach Gomp Budget Builds. [TODO: potvrdiť aktuálny región hostingu — v čase písania je projekt umiestnený v regióne AWS v EÚ.]',
          'Clerk — poskytovateľ autentifikácie (prihlásenie/registrácia). Spracúva vaše meno, e-mail a údaje o relácii/autentifikácii. Spoločnosť Clerk, Inc. má sídlo v USA. [TODO: potvrdiť a uviesť konkrétny mechanizmus zabezpečenia prenosu — napr. rámec EU-U.S. Data Privacy Framework alebo štandardné zmluvné doložky — a či je aktivovaná možnosť uloženia údajov v EÚ.]',
          'Vercel — hosting webovej stránky a funkcia Speed Insights popísaná vyššie. Spoločnosť Vercel Inc. má sídlo v USA. [TODO: potvrdiť a uviesť mechanizmus zabezpečenia prenosu, ako vyššie.]',
          '[TODO: doplniť poskytovateľa e-mailových služieb použitého na zasielanie potvrdení objednávok, ak/keď bude zapojený.]',
          '[TODO: doplniť platobného poskytovateľa použitého na spracovanie platieb, ak/keď bude zapojený — v čase písania nie je k pokladni pripojená žiadna platobná brána.]',
        ] },
      ],
    },
    {
      id: 'retention',
      title: '5. Ako dlho uchovávame vaše údaje',
      blocks: [
        { p: '[TODO: doplniť dobu uchovávania údajov o účte — napr. počas trvania aktívneho účtu a definovanú dobu po jeho zrušení.]' },
        { p: 'Doklady o objednávkach a fakturácii je potrebné podľa všeobecného pravidla českého účtovného a daňového práva uchovávať desať (10) rokov od konca účtovného obdobia, ktorého sa týkajú. [TODO: potvrdiť skutočne uplatňovanú dobu uchovávania a zdokumentovať ju tu.]' },
        { p: '[TODO: doplniť dobu uchovávania pre akúkoľvek inú kategóriu údajov neuvedenú vyššie.]' },
      ],
    },
    {
      id: 'transfers',
      title: '6. Medzinárodné prenosy',
      blocks: [
        { p: 'Niektorí naši spracovatelia (Clerk a Vercel, uvedení v časti 4) majú sídlo v USA, čo znamená, že osobné údaje môžu byť prenášané mimo Európskeho hospodárskeho priestoru. V takom prípade sa spoliehame na mechanizmus prenosu, ktorý daný spracovateľ ponúka — napríklad rámec EU-U.S. Data Privacy Framework alebo štandardné zmluvné doložky Európskej komisie. [TODO: pred spoliehaním sa na túto časť potvrdiť a zdokumentovať konkrétny mechanizmus pre každého spracovateľa.]' },
      ],
    },
    {
      id: 'cookies',
      title: '7. Cookies a lokálne úložisko',
      blocks: [
        { p: 'Táto webová stránka v súčasnosti nepoužíva sledovacie, analytické ani marketingové cookies. Stránka ukladá malý počet položiek do lokálneho úložiska vášho prehliadača — nie je to cookie v prísnom zmysle, ale podobný mechanizmus na strane klienta — aby si zapamätala váš jazyk, menu, preferenciu zobrazenia zariadenia a rozpracovanú zostavu/objednávku. Všetky sú nevyhnutné pre zamýšľané fungovanie stránky a nevyžadujú váš súhlas podľa pravidiel ePrivacy.' },
        { p: 'Vercel Speed Insights, popísaný v časti 2, funguje v predvolenom nastavení bez nastavovania cookies.' },
        { p: 'Medzera, ktorú treba doriešiť: táto stránka v súčasnosti nezobrazuje cookie/consent banner. To je v súlade s tým, že dnes používa len nevyhnutné lokálne úložisko, ale ak sa v budúcnosti pridá akákoľvek analytická, reklamná alebo iná nie nevyhnutná cookie, pred jej nastavením musí byť implementovaný consent banner s reálnou možnosťou súhlasu (kategorizovaný na nevyhnutné / analytické / marketingové) a táto časť musí byť zodpovedajúco aktualizovaná.' },
      ],
    },
    {
      id: 'rights',
      title: '8. Vaše práva',
      blocks: [
        { p: 'Podľa GDPR máte právo na:' },
        { ul: [
          'Prístup k osobným údajom, ktoré o vás uchovávame;',
          'Opravu nepresných alebo neúplných údajov;',
          'Vymazanie vašich údajov („právo na zabudnutie"), s výnimkou prípadov, keď nám zákon ukladá povinnosť ich uchovávať;',
          'Obmedzenie spracúvania za určitých okolností;',
          'Prenosnosť údajov, t. j. získanie vašich údajov v štruktúrovanom, bežne používanom formáte;',
          'Namietať proti spracúvaniu založenému na našom oprávnenom záujme;',
          'Kedykoľvek odvolať súhlas, ak je spracúvanie založené na súhlase, bez toho, aby to malo vplyv na spracúvanie vykonané pred jeho odvolaním.',
        ] },
        { p: 'Ktorékoľvek z týchto práv môžete uplatniť na e-mailovej adrese uvedenej v časti 1. Ak sa domnievate, že naše spracúvanie vašich údajov porušuje GDPR, máte tiež právo podať sťažnosť na Úrad pre ochranu osobných údajov („ÚOOÚ"), Pplk. Sochora 27, 170 00 Praha 7, web: www.uoou.cz.' },
      ],
    },
    {
      id: 'changes',
      title: '9. Zmeny týchto zásad',
      blocks: [
        { p: 'Tieto Zásady ochrany osobných údajov môžeme priebežne aktualizovať, najmä v súvislosti so zmenami spracovateľov, ktorých využívame, alebo platnej legislatívy. Aktuálne znenie je vždy dostupné na tejto stránke.' },
      ],
    },
  ],
  cz: [
    {
      id: 'controller',
      title: '1. Kdo jsme (správce údajů)',
      blocks: [
        { p: 'Správcem odpovědným za osobní údaje zpracovávané prostřednictvím těchto webových stránek je:' },
        { ul: [
          'Obchodní firma: [TODO: doplnit registrovaný název společnosti]',
          'Sídlo: [TODO: doplnit sídlo / adresu]',
          'IČO: [TODO: doplnit IČO]',
          'Kontaktní e-mail pro dotazy týkající se ochrany údajů: [TODO: doplnit vyhrazený kontaktní e-mail]',
        ] },
        { p: '[TODO: je-li jmenován pověřenec pro ochranu osobních údajů (DPO), jeho jméno a kontakt patří sem; není-li relevantní, tento řádek lze odstranit.]' },
      ],
    },
    {
      id: 'data',
      title: '2. Jaké údaje zpracováváme a proč',
      blocks: [
        { p: 'Údaje o účtu a přihlášení. Při vytvoření účtu zpracováváme (prostřednictvím našich poskytovatelů autentizace, Supabase Auth a/nebo Clerk — viz článek 4) vaše jméno, e-mailovou adresu a bezpečně zahashované heslo, případně telefonní číslo, které doplníte ve svém profilu. Činíme tak za účelem vytvoření a provozu vašeho účtu a umožnění přihlášení — právní základ: plnění smlouvy s vámi (čl. 6 odst. 1 písm. b) GDPR).' },
        { p: 'Údaje o objednávce a doručení. Při vytvoření objednávky zpracováváme vybrané komponenty/konfiguraci, celkovou cenu objednávky, stav objednávky a případnou uloženou doručovací adresu. Činíme tak za účelem vyřízení vaší objednávky a splnění účetních a daňových povinností — právní základ: plnění smlouvy (čl. 6 odst. 1 písm. b)) a právní povinnost (čl. 6 odst. 1 písm. c)).' },
        { p: 'Údaje o poptávce bazarové sestavy (Gomp Budget Builds). Pokud odešlete poptávku „Gomp Budget Builds", zpracováváme vaše jméno, příjmení, e-mailovou adresu, telefonní číslo, rozpočet a případné poznámky, které uvedete, abychom mohli prozkoumat aktuální nabídky na bazarovém trhu a zaslat vám cenový návrh. Činíme tak na základě kroků, o které jste požádali směrem k případné smlouvě — právní základ: kroky před uzavřením smlouvy na vaši žádost (čl. 6 odst. 1 písm. b)).' },
        { p: 'Údaje o preferencích v prohlížeči. Vaše nastavení jazyka, měny a zobrazení zařízení, jakož i rozpracovaná sestava/objednávka, se ukládají lokálně ve vašem prohlížeči (nikoli na našich serverech), aby si stránka pamatovala vaše volby mezi jednotlivými návštěvami. To je nezbytně nutné pro fungování stránky a nevyžaduje souhlas.' },
        { p: 'Výkonnostní/technické údaje. Používáme Vercel Speed Insights k souhrnnému měření rychlosti načítání stránky (Core Web Vitals), abychom stránku udrželi rychlou. Ve standardním nastavení se tím nenastavují sledovací cookies ani nejste individuálně identifikováni — právní základ: náš oprávněný zájem na provozu spolehlivých webových stránek (čl. 6 odst. 1 písm. f)). [TODO: před spoléháním se na tento právní základ potvrdit aktuální nastavení Speed Insights a zda se sbírají nějaké identifikátory.]' },
      ],
    },
    {
      id: 'ai',
      title: '3. Automatizované zpracování a nástroje AI',
      blocks: [
        { p: 'Umělou inteligenci ani jiný automatizovaný systém nepoužíváme k přijímání rozhodnutí o vás nebo vaší objednávce, která by měla právní účinky nebo by se vás jinak významně dotýkala, aniž by je nejprve zkontroloval člověk — každý cenový návrh, objednávku i odpověď na váš dotaz před odesláním zkontroluje člověk (čl. 22 GDPR).' },
        { p: 'Fotografiím produktů na těchto stránkách může být odstraněno pozadí pomocí nástroje strojového učení, který běží přímo v prohlížeči administrátora v okamžiku nahrání fotografie. Tento nástroj zpracovává pouze fotografie produktů, které nahráváme my, a nikdy nezpracovává žádné vaše osobní údaje.' },
        { p: 'Pokud někdy k vypracování odpovědi na váš dotaz použijeme obecného AI asistenta, sdílíme s ním pouze to, co je nezbytné pro danou konkrétní odpověď, a vaše údaje nepoužíváme k trénování modelů poskytovatele AI, je-li k dispozici možnost takové použití odmítnout. [TODO: pokud se v praxi pro tento účel používá konkrétní nástroj/poskytovatel AI, uvést jej zde a před spoléháním se na tento odstavec potvrdit jeho podmínky týkající se trénování a umístění údajů.]' },
      ],
    },
    {
      id: 'processors',
      title: '4. Třetí strany, se kterými sdílíme údaje',
      blocks: [
        { p: 'K provozu webových stránek a uložení vašich údajů využíváme následující zpracovatele. Osobní údaje nikomu neprodáváme.' },
        { ul: [
          'Supabase — hosting databáze a (je-li využívána) autentizace. Ukládá údaje o účtu, profilu, adresách, objednávkách a poptávkách Gomp Budget Builds. [TODO: potvrdit aktuální region hostingu — v době psaní je projekt umístěn v regionu AWS v EU.]',
          'Clerk — poskytovatel autentizace (přihlášení/registrace). Zpracovává vaše jméno, e-mail a údaje o relaci/autentizaci. Společnost Clerk, Inc. má sídlo ve Spojených státech. [TODO: potvrdit a uvést konkrétní mechanismus zajišťující ochranu při předání údajů — např. rámec EU-U.S. Data Privacy Framework nebo standardní smluvní doložky — a zda je aktivována možnost uložení údajů v EU.]',
          'Vercel — hosting webových stránek a funkce Speed Insights popsaná výše. Společnost Vercel Inc. má sídlo ve Spojených státech. [TODO: potvrdit a uvést mechanismus zajišťující ochranu při předání údajů, jako výše.]',
          '[TODO: doplnit poskytovatele e-mailových služeb použitého k zasílání potvrzení objednávek, pokud/až bude zapojen.]',
          '[TODO: doplnit platebního poskytovatele použitého ke zpracování plateb, pokud/až bude zapojen — v době psaní není k pokladně připojena žádná platební brána.]',
        ] },
      ],
    },
    {
      id: 'retention',
      title: '5. Jak dlouho vaše údaje uchováváme',
      blocks: [
        { p: '[TODO: doplnit dobu uchovávání údajů o účtu — např. po dobu trvání aktivního účtu a stanovenou dobu po jeho zrušení.]' },
        { p: 'Doklady o objednávkách a fakturaci je podle obecného pravidla českého účetního a daňového práva třeba uchovávat deset (10) let od konce účetního období, kterého se týkají. [TODO: potvrdit skutečně uplatňovanou dobu uchovávání a zdokumentovat ji zde.]' },
        { p: '[TODO: doplnit dobu uchovávání pro jakoukoli jinou kategorii údajů neuvedenou výše.]' },
      ],
    },
    {
      id: 'transfers',
      title: '6. Mezinárodní předávání údajů',
      blocks: [
        { p: 'Někteří naši zpracovatelé (Clerk a Vercel, uvedení v článku 4) mají sídlo ve Spojených státech, což znamená, že osobní údaje mohou být předávány mimo Evropský hospodářský prostor. V takovém případě se spoléháme na mechanismus předání, který daný zpracovatel nabízí — například rámec EU-U.S. Data Privacy Framework nebo standardní smluvní doložky Evropské komise. [TODO: před spoléháním se na tento článek potvrdit a zdokumentovat konkrétní mechanismus pro každého zpracovatele.]' },
      ],
    },
    {
      id: 'cookies',
      title: '7. Cookies a lokální úložiště',
      blocks: [
        { p: 'Tyto webové stránky v současnosti nepoužívají sledovací, analytické ani marketingové cookies. Stránka ukládá malý počet položek do lokálního úložiště vašeho prohlížeče — nejedná se o cookie v přísném slova smyslu, ale o obdobný mechanismus na straně klienta — aby si zapamatovala váš jazyk, měnu, preferenci zobrazení zařízení a rozpracovanou sestavu/objednávku. Všechny tyto položky jsou nezbytně nutné pro zamýšlené fungování stránky a nevyžadují váš souhlas podle pravidel ePrivacy.' },
        { p: 'Vercel Speed Insights, popsaný v článku 2, funguje ve výchozím nastavení bez nastavování cookies.' },
        { p: 'Mezera, kterou je třeba doplnit: tyto stránky v současnosti nezobrazují cookie/consent lištu. To je v souladu s tím, že dnes využívají pouze nezbytně nutné lokální úložiště, avšak pokud bude v budoucnu přidána jakákoli analytická, reklamní nebo jiná nikoli nezbytná cookie, musí být před jejím nastavením implementována souhlasová lišta s reálnou možností volby (kategorizovanou na nezbytné / analytické / marketingové) a tento článek musí být odpovídajícím způsobem aktualizován.' },
      ],
    },
    {
      id: 'rights',
      title: '8. Vaše práva',
      blocks: [
        { p: 'Podle GDPR máte právo na:' },
        { ul: [
          'Přístup k osobním údajům, které o vás uchováváme;',
          'Opravu nepřesných nebo neúplných údajů;',
          'Výmaz vašich údajů („právo být zapomenut"), s výhradou jakékoli právní povinnosti, kterou máme je uchovávat;',
          'Omezení zpracování za určitých okolností;',
          'Přenositelnost údajů, tj. získání vašich údajů ve strukturovaném, běžně používaném formátu;',
          'Vznést námitku proti zpracování založenému na našem oprávněném zájmu;',
          'Kdykoli odvolat souhlas, je-li zpracování založeno na souhlasu, aniž by tím bylo dotčeno zpracování prováděné před jeho odvoláním.',
        ] },
        { p: 'Kterékoli z těchto práv můžete uplatnit na e-mailové adrese uvedené v článku 1. Máte také právo podat stížnost u Úřadu pro ochranu osobních údajů („ÚOOÚ"), Pplk. Sochora 27, 170 00 Praha 7, web: www.uoou.cz, domníváte-li se, že naše zpracování vašich údajů porušuje GDPR.' },
      ],
    },
    {
      id: 'changes',
      title: '9. Změny těchto zásad',
      blocks: [
        { p: 'Tyto Zásady ochrany osobních údajů můžeme čas od času aktualizovat, zejména v souvislosti se změnami zpracovatelů, které využíváme, nebo platné legislativy. Aktuální znění je vždy dostupné na této stránce.' },
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

export default function PrivacyPage() {
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
                {t.terms_note}{' '}
                <TransitionLink href="/terms" style={{ color: MAROON, textDecoration: 'underline' }}>
                  {t.terms_link}
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
