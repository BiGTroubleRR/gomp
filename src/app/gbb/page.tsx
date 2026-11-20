'use client';

// "Help me" (route stays /gbb so old links, the admin inbox and the API keep working): a short step-by-step
// request wizard. Every question is answered by tapping a button; the last step asks how to reach the person.
// The answers go through the existing /api/gbb endpoint without a schema change: the topic is stored in
// `use_case`, the budget in `budget_eur`, and everything else as a readable block at the top of `notes`.
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import Link from 'next/link';
import { useSite } from '@/contexts/SiteContext';
import { useAuth } from '@/contexts/AuthContext';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import { useIsMobile } from '@/lib/use-media-query';
import { submitGbbRequest } from '@/lib/gbb-submit';
import {
  ACCENT, ACCENT_FILL, ACCENT_GRADIENT, BORDER, BORDER_STRONG, FAINT, INK, MUTED, ON_ACCENT, PAGE_BG, PANEL_BG,
  SURFACE_ALT, hexToRgba,
} from '@/lib/design-tokens';

type Topic = 'pick' | 'upgrade' | 'used' | 'check' | 'order' | 'other';
type Use = 'gaming' | 'work' | 'creative' | 'server' | 'mixed';
type BudgetId = 'b500' | 'b800' | 'b1200' | 'b2000' | 'b2000plus' | 'unsure';
type Channel = 'email' | 'phone';
type StepId = 'topic' | 'use' | 'budget' | 'notes' | 'contact';

const TOPICS: { id: Topic }[] = [{ id: 'pick' }, { id: 'upgrade' }, { id: 'used' }, { id: 'check' }, { id: 'order' }, { id: 'other' }];
const USES: { id: Use }[] = [{ id: 'gaming' }, { id: 'work' }, { id: 'creative' }, { id: 'mixed' }];
// `max` is what is stored as the budget (the top of the band); the band's own wording goes into the notes.
const BUDGETS: { id: BudgetId; max: number | null }[] = [
  { id: 'b500', max: 500 },
  { id: 'b800', max: 800 },
  { id: 'b1200', max: 1200 },
  { id: 'b2000', max: 2000 },
  { id: 'b2000plus', max: 2000 },
  { id: 'unsure', max: null },
];

// Which questions a topic needs. Parts questions (use, budget) only make sense when we are specifying a PC.
function stepsFor(topic: Topic | null): StepId[] {
  if (topic === 'pick' || topic === 'upgrade' || topic === 'used') return ['topic', 'use', 'budget', 'notes', 'contact'];
  return ['topic', 'notes', 'contact'];
}

type Dict = {
  topic: Record<Topic, { label: string; sub: string }>;
  use: Record<Use, string>;
  budget: Record<BudgetId, string>;
  notes_placeholder: Record<Topic, string>;
  [k: string]: unknown;
};

const T = {
  en: {
    nav_label: 'Assistant',
    eyebrow: 'Assistant',
    title: 'Not sure where to start? Let’s work it out together.',
    intro:
      'Tap through a few quick questions and tell us how to reach you. A real person from GOMP answers, usually within 1–2 business days, with no obligation.',
    aside_title: 'What happens next',
    aside: [
      { t: 'You tell us what you need', b: 'Two minutes, mostly taps.' },
      { t: 'We take a real look', b: 'A person checks current parts and prices. No automated quote.' },
      { t: 'We get back to you', b: 'By e-mail or phone, whichever you prefer.' },
    ],
    aside_badge: 'Free · No obligation',
    step_of: (n: number, total: number) => `Step ${n} of ${total}`,
    q_topic: 'What do you need help with?',
    q_use: 'What will you use it for?',
    q_budget: 'What budget do you have in mind?',
    budget_custom: 'Or type an exact amount (EUR)',
    q_notes_optional: 'Anything specific we should know?',
    q_notes_required: 'Tell us a bit more',
    optional: 'Optional',
    q_contact: 'How can we reach you?',
    channel_label: 'Preferred way to reach you',
    channel_email: 'E-mail',
    channel_phone: 'Phone call',
    first_name: 'First name', last_name: 'Last name', email: 'E-mail', phone: 'Phone', phone_needed: '(needed for a call)',
    privacy_pre: 'We only use your details to answer this request. ',
    privacy_link: 'Privacy policy',
    back: 'Back',
    next: 'Continue',
    skip: 'Skip',
    submit: 'Send request',
    submitting: 'Sending…',
    topic: {
      pick: { label: 'Pick a PC for me', sub: 'Tell us what you need and we recommend a build.' },
      upgrade: { label: 'Upgrade my current PC', sub: 'Make the machine you have faster.' },
      used: { label: 'Budget build from used parts', sub: 'Carefully checked secondhand parts, priced on current listings.' },
      check: { label: 'Check my parts list', sub: 'A compatibility and sanity check.' },
      order: { label: 'A question about an order', sub: 'Status, delivery, warranty.' },
      other: { label: 'Something else', sub: 'Anything PC-related.' },
    },
    use: { gaming: 'Gaming', work: 'Work & everyday use', creative: 'Content creation / editing', server: 'Home server / NAS', mixed: 'A bit of everything' },
    budget: { b500: 'Up to €500', b800: '€500 – €800', b1200: '€800 – €1,200', b2000: '€1,200 – €2,000', b2000plus: 'Over €2,000', unsure: 'Not sure yet' },
    notes_placeholder: {
      pick: 'Preferred brand, a part you already have, quiet operation, games you play…',
      upgrade: 'What PC do you have now (CPU, GPU, RAM) and what bothers you?',
      used: 'Preferred brand, a part you already have, quiet operation, games you play…',
      check: 'Paste your parts list or a link and we’ll check it.',
      order: 'Your order number and your question.',
      other: 'Tell us what’s on your mind.',
    },
    success_title: 'Thanks, we’ve got it.',
    success_email: (e: string) => `We’ll write to you at ${e}, usually within 1–2 business days.`,
    success_phone: (p: string) => `We’ll call you on ${p}, usually within 1–2 business days.`,
    back_home: 'Back to home',
    again: 'Send another request',
    error_generic: 'Something went wrong. Please try again.',
  },
  sk: {
    nav_label: 'Asistent',
    eyebrow: 'Asistent',
    title: 'Neviete, kde začať? Poradíme vám.',
    intro:
      'Prekliknite sa pár rýchlymi otázkami a napíšte nám, ako vás môžeme zastihnúť. Ozve sa vám živý človek z GOMP, zvyčajne do 1–2 pracovných dní, bez záväzku.',
    aside_title: 'Čo bude nasledovať',
    aside: [
      { t: 'Poviete nám, čo potrebujete', b: 'Dve minúty, väčšinou len klikanie.' },
      { t: 'Pozrieme sa na to', b: 'Skutočný človek skontroluje aktuálne súčiastky a ceny. Žiadna automatická ponuka.' },
      { t: 'Ozveme sa vám', b: 'E-mailom alebo telefonicky, ako vám viac vyhovuje.' },
    ],
    aside_badge: 'Zdarma · Bez záväzku',
    step_of: (n: number, total: number) => `Krok ${n} z ${total}`,
    q_topic: 'S čím vám môžeme pomôcť?',
    q_use: 'Na čo to bude?',
    q_budget: 'Aký rozpočet máte na mysli?',
    budget_custom: 'Alebo zadajte presnú sumu (EUR)',
    q_notes_optional: 'Je niečo, čo by sme mali vedieť?',
    q_notes_required: 'Povedzte nám trochu viac',
    optional: 'Nepovinné',
    q_contact: 'Ako vás môžeme zastihnúť?',
    channel_label: 'Preferovaný spôsob kontaktu',
    channel_email: 'E-mail',
    channel_phone: 'Telefonát',
    first_name: 'Meno', last_name: 'Priezvisko', email: 'E-mail', phone: 'Telefón', phone_needed: '(potrebný pre telefonát)',
    privacy_pre: 'Vaše údaje použijeme len na vybavenie tejto žiadosti. ',
    privacy_link: 'Ochrana osobných údajov',
    back: 'Späť',
    next: 'Pokračovať',
    skip: 'Preskočiť',
    submit: 'Odoslať žiadosť',
    submitting: 'Odosielam…',
    topic: {
      pick: { label: 'Vyberte mi PC', sub: 'Povedzte nám, čo potrebujete, a odporučíme zostavu.' },
      upgrade: { label: 'Vylepšiť moje PC', sub: 'Zrýchlite počítač, ktorý už máte.' },
      used: { label: 'Zostava z bazarových súčiastok', sub: 'Dôkladne overené súčiastky z druhej ruky, ceny podľa aktuálnej ponuky.' },
      check: { label: 'Skontrolovať zoznam súčiastok', sub: 'Kontrola kompatibility a zmysluplnosti.' },
      order: { label: 'Otázka k objednávke', sub: 'Stav, doručenie, záruka.' },
      other: { label: 'Niečo iné', sub: 'Čokoľvek okolo PC.' },
    },
    use: { gaming: 'Hranie', work: 'Práca a bežné použitie', creative: 'Tvorba obsahu / strih', server: 'Domáci server / NAS', mixed: 'Od všetkého trochu' },
    budget: { b500: 'Do 500 €', b800: '500 – 800 €', b1200: '800 – 1 200 €', b2000: '1 200 – 2 000 €', b2000plus: 'Nad 2 000 €', unsure: 'Zatiaľ neviem' },
    notes_placeholder: {
      pick: 'Preferovaná značka, súčiastka, ktorú už máte, tichá prevádzka, hry, ktoré hráte…',
      upgrade: 'Aké PC máte teraz (CPU, GPU, RAM) a čo vás trápi?',
      used: 'Preferovaná značka, súčiastka, ktorú už máte, tichá prevádzka, hry, ktoré hráte…',
      check: 'Vložte zoznam súčiastok alebo odkaz a skontrolujeme ho.',
      order: 'Číslo objednávky a vaša otázka.',
      other: 'Napíšte nám, čo máte na srdci.',
    },
    success_title: 'Ďakujeme, máme to.',
    success_email: (e: string) => `Napíšeme vám na ${e}, zvyčajne do 1–2 pracovných dní.`,
    success_phone: (p: string) => `Zavoláme vám na ${p}, zvyčajne do 1–2 pracovných dní.`,
    back_home: 'Späť na hlavnú stránku',
    again: 'Odoslať ďalšiu žiadosť',
    error_generic: 'Niečo sa pokazilo. Skúste to znova.',
  },
  cz: {
    nav_label: 'Asistent',
    eyebrow: 'Asistent',
    title: 'Nevíte, kde začít? Poradíme vám.',
    intro:
      'Proklikejte se několika rychlými otázkami a napište nám, jak vás můžeme zastihnout. Ozve se vám živý člověk z GOMP, obvykle do 1–2 pracovních dnů, bez závazku.',
    aside_title: 'Co bude následovat',
    aside: [
      { t: 'Řeknete nám, co potřebujete', b: 'Dvě minuty, většinou jen klikání.' },
      { t: 'Podíváme se na to', b: 'Skutečný člověk zkontroluje aktuální součástky a ceny. Žádná automatická nabídka.' },
      { t: 'Ozveme se vám', b: 'E-mailem nebo telefonicky, jak vám více vyhovuje.' },
    ],
    aside_badge: 'Zdarma · Bez závazku',
    step_of: (n: number, total: number) => `Krok ${n} z ${total}`,
    q_topic: 'S čím vám můžeme pomoct?',
    q_use: 'K čemu to bude?',
    q_budget: 'Jaký rozpočet máte na mysli?',
    budget_custom: 'Nebo zadejte přesnou částku (EUR)',
    q_notes_optional: 'Je něco, co bychom měli vědět?',
    q_notes_required: 'Řekněte nám trochu víc',
    optional: 'Nepovinné',
    q_contact: 'Jak vás můžeme zastihnout?',
    channel_label: 'Preferovaný způsob kontaktu',
    channel_email: 'E-mail',
    channel_phone: 'Telefonát',
    first_name: 'Jméno', last_name: 'Příjmení', email: 'E-mail', phone: 'Telefon', phone_needed: '(potřebný pro telefonát)',
    privacy_pre: 'Vaše údaje použijeme jen k vyřízení této žádosti. ',
    privacy_link: 'Ochrana osobních údajů',
    back: 'Zpět',
    next: 'Pokračovat',
    skip: 'Přeskočit',
    submit: 'Odeslat žádost',
    submitting: 'Odesílám…',
    topic: {
      pick: { label: 'Vyberte mi PC', sub: 'Řekněte nám, co potřebujete, a doporučíme sestavu.' },
      upgrade: { label: 'Vylepšit moje PC', sub: 'Zrychlete počítač, který už máte.' },
      used: { label: 'Sestava z bazarových součástek', sub: 'Pečlivě prověřené součástky z druhé ruky, ceny podle aktuální nabídky.' },
      check: { label: 'Zkontrolovat seznam součástek', sub: 'Kontrola kompatibility a smysluplnosti.' },
      order: { label: 'Dotaz k objednávce', sub: 'Stav, doručení, záruka.' },
      other: { label: 'Něco jiného', sub: 'Cokoli kolem PC.' },
    },
    use: { gaming: 'Hraní', work: 'Práce a běžné použití', creative: 'Tvorba obsahu / střih', server: 'Domácí server / NAS', mixed: 'Od všeho trochu' },
    budget: { b500: 'Do 500 €', b800: '500 – 800 €', b1200: '800 – 1 200 €', b2000: '1 200 – 2 000 €', b2000plus: 'Nad 2 000 €', unsure: 'Zatím nevím' },
    notes_placeholder: {
      pick: 'Preferovaná značka, součástka, kterou už máte, tichý provoz, hry, které hrajete…',
      upgrade: 'Jaké PC máte nyní (CPU, GPU, RAM) a co vás trápí?',
      used: 'Preferovaná značka, součástka, kterou už máte, tichý provoz, hry, které hrajete…',
      check: 'Vložte seznam součástek nebo odkaz a zkontrolujeme ho.',
      order: 'Číslo objednávky a váš dotaz.',
      other: 'Napište nám, co máte na srdci.',
    },
    success_title: 'Děkujeme, máme to.',
    success_email: (e: string) => `Napíšeme vám na ${e}, obvykle do 1–2 pracovních dnů.`,
    success_phone: (p: string) => `Zavoláme vám na ${p}, obvykle do 1–2 pracovních dnů.`,
    back_home: 'Zpět na hlavní stránku',
    again: 'Odeslat další žádost',
    error_generic: 'Něco se pokazilo. Zkuste to prosím znovu.',
  },
} satisfies Record<string, Dict>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INPUT_STYLE: CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '12px 14px', border: `1px solid ${BORDER_STRONG}`, borderRadius: 8,
  fontSize: 15, fontFamily: 'var(--font-sans)', background: SURFACE_ALT, color: INK,
};
const LABEL_STYLE: CSSProperties = {
  fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, color: MUTED, 
  marginBottom: 6,
};

const CSS = `
.hm-step { animation: hmIn 0.28s ease both; }
@keyframes hmIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.hm-choice { transition: border-color .15s, background .15s, transform .15s; }
.hm-choice:hover { border-color: ${hexToRgba(ACCENT, 0.7)}; background: ${hexToRgba(ACCENT, 0.07)}; transform: translateY(-1px); }
.hm-choice:focus-visible, .hm-btn:focus-visible, .hm-input:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 2px; }
.hm-choice[aria-pressed="true"] { border-color: ${ACCENT}; background: ${hexToRgba(ACCENT, 0.12)}; }
.hm-input:focus { border-color: ${ACCENT}; outline: none; box-shadow: 0 0 0 3px ${hexToRgba(ACCENT, 0.18)}; }
.hm-btn { transition: filter .15s, transform .15s; }
.hm-btn:hover:not(:disabled) { filter: brightness(1.08); }
.hm-ghost:hover:not(:disabled) { color: ${INK}; }
@media (prefers-reduced-motion: reduce) { .hm-step { animation: none; } .hm-choice, .hm-btn { transition: none; } .hm-choice:hover { transform: none; } }
`;

function Choice({ selected, onClick, label, sub }: { selected: boolean; onClick: () => void; label: string; sub?: string }) {
  return (
    <button
      type="button"
      className="hm-choice"
      aria-pressed={selected}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left', padding: '14px 16px', borderRadius: 10,
        border: `1.5px solid ${BORDER_STRONG}`, background: PAGE_BG, color: INK, cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <span style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{label}</span>
        {sub && <span style={{ display: 'block', fontSize: 12.5, color: MUTED, fontWeight: 300, lineHeight: 1.5, marginTop: 3 }}>{sub}</span>}
      </span>
    </button>
  );
}

export default function HelpMePage() {
  const { lang } = useSite();
  const { user, profile } = useAuth();
  const isMobile = useIsMobile();
  const t = T[lang] ?? T.en;

  const [topic, setTopic] = useState<Topic | null>(null);
  const [use, setUse] = useState<Use | null>(null);
  const [budgetId, setBudgetId] = useState<BudgetId | null>(null);
  const [customBudget, setCustomBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [channel, setChannel] = useState<Channel>('email');
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [stepIdx, setStepIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = stepsFor(topic);
  const step = steps[Math.min(stepIdx, steps.length - 1)];
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [moved, setMoved] = useState(false);
  // Keyboard / screen-reader users land on the new question when the step changes (not on first paint).
  useEffect(() => {
    if (!moved) return;
    headingRef.current?.focus({ preventScroll: true });
  }, [stepIdx, submitted, moved]);

  function go(delta: number) {
    setMoved(true);
    setError(null);
    setStepIdx((i) => Math.max(0, Math.min(steps.length - 1, i + delta)));
  }
  function chooseTopic(next: Topic) {
    setTopic(next);
    setMoved(true);
    setStepIdx(1); // every topic's second step comes after 'topic'
  }

  const customBudgetNum = customBudget.trim() !== '' ? Number(customBudget) : null;
  const customBudgetValid = customBudgetNum != null && !isNaN(customBudgetNum) && customBudgetNum > 0;
  const notesRequired = topic === 'check' || topic === 'order' || topic === 'other';
  const phoneNeeded = channel === 'phone';
  const contactValid =
    firstName.trim() !== '' && lastName.trim() !== '' && EMAIL_RE.test(email.trim()) && (!phoneNeeded || phone.trim() !== '');

  // The readable summary (English: it is read by GOMP staff in the admin inbox) put in front of the free text.
  function buildNotes(): string {
    const en = T.en;
    const lines: string[] = [];
    if (topic) lines.push(`Topic: ${en.topic[topic].label}`);
    if (use) lines.push(`Use: ${en.use[use]}`);
    if (customBudgetValid) lines.push(`Budget: about €${customBudgetNum}`);
    else if (budgetId) lines.push(`Budget: ${en.budget[budgetId]}`);
    lines.push(`Preferred contact: ${channel === 'phone' ? 'phone call' : 'e-mail'}`);
    const free = notes.trim();
    return free ? `${lines.join('\n')}\n---\n${free}` : lines.join('\n');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || !topic || !contactValid) return;
    setSubmitting(true);
    setError(null);
    const bandMax = BUDGETS.find((b) => b.id === budgetId)?.max ?? null;
    const result = await submitGbbRequest({
      userId: user?.id ?? null,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      budgetEur: customBudgetValid ? customBudgetNum : bandMax,
      useCase: topic,
      notes: buildNotes(),
      lang,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error || t.error_generic);
      return;
    }
    setMoved(true);
    setSubmitted(true);
  }

  function reset() {
    setTopic(null); setUse(null); setBudgetId(null); setCustomBudget(''); setNotes(''); setChannel('email');
    setStepIdx(0); setSubmitted(false); setError(null);
  }

  const primaryBtn: CSSProperties = {
    padding: '13px 26px', background: ACCENT_GRADIENT, color: ON_ACCENT, border: 'none', borderRadius: 8,
    fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, letterSpacing: 0.3, cursor: 'pointer',
  };
  const ghostBtn: CSSProperties = {
    padding: '13px 4px', background: 'transparent', color: MUTED, border: 'none',
    fontFamily: 'var(--font-sans)', fontSize: 14, cursor: 'pointer',
  };
  const heading: CSSProperties = {
    fontFamily: 'var(--font-sans)', fontSize: isMobile ? 22 : 26, fontWeight: 600, color: INK, letterSpacing: -0.3,
    margin: '0 0 18px', outline: 'none',
  };

  const choiceGrid = (cols: number): CSSProperties => ({
    display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `repeat(${cols}, 1fr)`, gap: 10,
  });

  const nav = (opts: { next?: { label: string; disabled?: boolean; onClick: () => void } }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 22 }}>
      {stepIdx > 0 ? (
        <button type="button" className="hm-btn hm-ghost" style={ghostBtn} onClick={() => go(-1)}>{t.back}</button>
      ) : <span />}
      {opts.next && (
        <button
          type="button"
          className="hm-btn"
          disabled={opts.next.disabled}
          onClick={opts.next.onClick}
          style={{ ...primaryBtn, opacity: opts.next.disabled ? 0.45 : 1, cursor: opts.next.disabled ? 'not-allowed' : 'pointer' }}
        >
          {opts.next.label}
        </button>
      )}
    </div>
  );

  // Before a topic is chosen assume the longest path, so the counter does not jump from 3 to 5 steps.
  const shownSteps = topic ? steps : stepsFor('pick');
  const total = shownSteps.length;

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG }}>
      <style>{CSS}</style>
      <SiteNav />

      {/* ---- Hero ---- */}
      <div
        style={{
          background: `radial-gradient(ellipse 70% 120% at 15% 0%, ${hexToRgba(ACCENT, 0.16)} 0%, transparent 60%)`,
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: isMobile ? '34px 20px 30px' : '64px 32px 52px' }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700, letterSpacing: 2.5, color: ACCENT, marginBottom: 14 }}>
            {t.eyebrow}
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-sans)', fontSize: isMobile ? 30 : 48, fontWeight: 600, color: INK, letterSpacing: -0.8,
              lineHeight: 1.12, margin: '0 0 16px', maxWidth: 720,
            }}
          >
            {t.title}
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: isMobile ? 15 : 17, color: MUTED, fontWeight: 300, lineHeight: 1.65, maxWidth: 640, margin: 0 }}>
            {t.intro}
          </p>
        </div>
      </div>

      {/* ---- Wizard + what happens next ---- */}
      <div
        style={{
          maxWidth: 1080, margin: '0 auto', padding: isMobile ? '24px 20px 60px' : '44px 32px 90px',
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 320px', gap: isMobile ? 28 : 40, alignItems: 'start',
        }}
      >
        <div style={{ background: PANEL_BG, border: `1px solid ${BORDER}`, borderRadius: 14, padding: isMobile ? 20 : 36, minHeight: 360 }}>
          {submitted ? (
            <div className="hm-step" style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: hexToRgba(ACCENT, 0.14), border: `1.5px solid ${ACCENT}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 26, color: ACCENT }}>
                ✓
              </div>
              <h2 ref={headingRef} tabIndex={-1} style={{ ...heading, margin: '0 0 8px' }}>{t.success_title}</h2>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: MUTED, fontWeight: 300, lineHeight: 1.6, maxWidth: 420, margin: '0 auto 26px' }}>
                {channel === 'phone' ? t.success_phone(phone.trim()) : t.success_email(email.trim())}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap' }}>
                <Link href="/" style={{ ...ghostBtn, textDecoration: 'none' }}>{t.back_home}</Link>
                <button type="button" className="hm-btn hm-ghost" style={{ ...ghostBtn, color: ACCENT }} onClick={reset}>{t.again}</button>
              </div>
            </div>
          ) : (
            <>
              {/* progress: one segment per step */}
              <div style={{ marginBottom: 26 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, color: FAINT, marginBottom: 8 }}>
                  {t.step_of(stepIdx + 1, total)}
                </div>
                <div style={{ display: 'flex', gap: 6 }} role="presentation">
                  {shownSteps.map((s, i) => (
                    <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= stepIdx ? ACCENT : 'rgba(235,230,218,0.12)', transition: 'background .25s' }} />
                  ))}
                </div>
              </div>

              <div key={step} className="hm-step" aria-live="polite">
                {step === 'topic' && (
                  <>
                    <h2 ref={headingRef} tabIndex={-1} style={heading}>{t.q_topic}</h2>
                    <div style={choiceGrid(2)}>
                      {TOPICS.map((o) => (
                        <Choice key={o.id} selected={topic === o.id} onClick={() => chooseTopic(o.id)} label={t.topic[o.id].label} sub={t.topic[o.id].sub} />
                      ))}
                    </div>
                    {nav({})}
                  </>
                )}

                {step === 'use' && (
                  <>
                    <h2 ref={headingRef} tabIndex={-1} style={heading}>{t.q_use}</h2>
                    <div style={choiceGrid(2)}>
                      {USES.map((o) => (
                        <Choice key={o.id} selected={use === o.id} onClick={() => { setUse(o.id); go(1); }} label={t.use[o.id]} />
                      ))}
                    </div>
                    {nav({ next: { label: t.skip, onClick: () => go(1) } })}
                  </>
                )}

                {step === 'budget' && (
                  <>
                    <h2 ref={headingRef} tabIndex={-1} style={heading}>{t.q_budget}</h2>
                    <div style={choiceGrid(3)}>
                      {BUDGETS.map((o) => (
                        <Choice key={o.id} selected={budgetId === o.id && !customBudgetValid} onClick={() => { setBudgetId(o.id); setCustomBudget(''); go(1); }} label={t.budget[o.id]} />
                      ))}
                    </div>
                    <div style={{ marginTop: 16, maxWidth: 260 }}>
                      <div style={LABEL_STYLE}>{t.budget_custom}</div>
                      <input
                        className="hm-input"
                        type="number"
                        min={0}
                        inputMode="numeric"
                        placeholder="750"
                        value={customBudget}
                        onChange={(e) => setCustomBudget(e.target.value)}
                        style={INPUT_STYLE}
                      />
                    </div>
                    {nav({ next: { label: t.next, disabled: !customBudgetValid && !budgetId, onClick: () => go(1) } })}
                  </>
                )}

                {step === 'notes' && topic && (
                  <>
                    <h2 ref={headingRef} tabIndex={-1} style={{ ...heading, marginBottom: 6 }}>
                      {notesRequired ? t.q_notes_required : t.q_notes_optional}
                    </h2>
                    {!notesRequired && (
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: FAINT, marginBottom: 14 }}>{t.optional}</div>
                    )}
                    <textarea
                      className="hm-input"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t.notes_placeholder[topic]}
                      rows={6}
                      style={{ ...INPUT_STYLE, resize: 'vertical', marginTop: notesRequired ? 12 : 0 }}
                    />
                    {nav({ next: { label: t.next, disabled: notesRequired && notes.trim() === '', onClick: () => go(1) } })}
                  </>
                )}

                {step === 'contact' && (
                  <form onSubmit={handleSubmit}>
                    <h2 ref={headingRef} tabIndex={-1} style={heading}>{t.q_contact}</h2>
                    <div style={LABEL_STYLE}>{t.channel_label}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
                      <Choice selected={channel === 'email'} onClick={() => setChannel('email')} label={t.channel_email} />
                      <Choice selected={channel === 'phone'} onClick={() => setChannel('phone')} label={t.channel_phone} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
                      <label>
                        <div style={LABEL_STYLE}>{t.first_name}</div>
                        <input className="hm-input" required autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={INPUT_STYLE} />
                      </label>
                      <label>
                        <div style={LABEL_STYLE}>{t.last_name}</div>
                        <input className="hm-input" required autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} style={INPUT_STYLE} />
                      </label>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 16 }}>
                      <label>
                        <div style={LABEL_STYLE}>{t.email}</div>
                        <input className="hm-input" required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={INPUT_STYLE} />
                      </label>
                      <label>
                        <div style={LABEL_STYLE}>{t.phone} {phoneNeeded && <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: ACCENT }}>{t.phone_needed}</span>}</div>
                        <input className="hm-input" required={phoneNeeded} type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={INPUT_STYLE} />
                      </label>
                    </div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: FAINT, lineHeight: 1.5 }}>
                      {t.privacy_pre}
                      <Link href="/privacy" style={{ color: MUTED }}>{t.privacy_link}</Link>
                    </div>
                    {error && (
                      <div role="alert" style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#E5645F', marginTop: 14 }}>{error}</div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 22 }}>
                      <button type="button" className="hm-btn hm-ghost" style={ghostBtn} onClick={() => go(-1)}>{t.back}</button>
                      <button
                        type="submit"
                        className="hm-btn"
                        disabled={submitting || !contactValid}
                        style={{ ...primaryBtn, background: submitting ? ACCENT_FILL : ACCENT_GRADIENT, opacity: !contactValid ? 0.45 : 1, cursor: submitting ? 'default' : !contactValid ? 'not-allowed' : 'pointer' }}
                      >
                        {submitting ? t.submitting : t.submit}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </div>

        {/* ---- What happens next ---- */}
        <aside style={{ paddingTop: isMobile ? 0 : 6 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 18 }}>
            {t.aside_title}
          </div>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 22 }}>
            {t.aside.map((a, i) => (
              <li key={a.t} style={{ display: 'flex', gap: 14 }}>
                <span
                  aria-hidden
                  style={{
                    flex: 'none', width: 30, height: 30, borderRadius: '50%', border: `1.5px solid ${hexToRgba(ACCENT, 0.6)}`, color: ACCENT,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 700,
                  }}
                >
                  {i + 1}
                </span>
                <span>
                  <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: INK, marginBottom: 3 }}>{a.t}</span>
                  <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontSize: 13.5, color: MUTED, fontWeight: 300, lineHeight: 1.55 }}>{a.b}</span>
                </span>
              </li>
            ))}
          </ol>
          <div
            style={{
              display: 'inline-block', marginTop: 26, padding: '7px 14px', borderRadius: 20, border: `1px solid ${hexToRgba(ACCENT, 0.4)}`,
              background: hexToRgba(ACCENT, 0.08), color: ACCENT, fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
            }}
          >
            {t.aside_badge}
          </div>
        </aside>
      </div>

      <SiteFooter />
    </div>
  );
}
