'use client';

import { useState, type CSSProperties, type FormEvent } from 'react';
import { useSite } from '@/contexts/SiteContext';
import { useAuth } from '@/contexts/AuthContext';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import { useIsMobile } from '@/lib/use-media-query';
import { submitGbbRequest } from '@/lib/gbb-submit';
import { GBB_GREEN, GBB_GREEN_DARK, GBB_GREEN_TINT } from '@/lib/gbb-theme';

// Only the bordeaux accent is swapped for GBB_GREEN — gold, ink, and the cream/parchment
// backgrounds are identical to the rest of the site, so this reads as the same store rather
// than a different brand bolted on.
const GOLD = '#C4A35A';
const INK = '#1C1C1A';
const MUTED = '#7A7469';
const PAGE_BG = '#F5F0E6';
const PANEL_BG = '#FDFAF4';

type UseCase = 'gaming' | 'office' | 'creative' | 'server' | 'other';
const USE_CASES: UseCase[] = ['gaming', 'office', 'creative', 'server', 'other'];

const T = {
  en: {
    nav_home: 'Home', nav_shop: 'Shop', nav_build: 'Build', nav_about: 'About', nav_account: 'Account',
    eyebrow: 'GOMP BUDGET BUILDS',
    title: 'A great PC doesn’t have to be new.',
    intro:
      'Tell us your budget and what you need the machine for. We’ll price out a build from carefully checked secondhand parts and send you a proposal — no obligation, no automated pricing, just a real look at what’s actually available right now.',
    point1_title: 'Real, current pricing',
    point1_body: 'Every proposal is priced from what’s actually listed right now — not a stale average.',
    point2_title: 'Checked before it ships',
    point2_body: 'Every secondhand part is tested before it goes into your build, same as our new-parts builds.',
    point3_title: 'Clear on what’s used',
    point3_body: 'You’ll know exactly what’s secondhand, its condition, and the warranty that comes with it.',
    form_title: 'Request a proposal',
    first_name: 'First name', last_name: 'Last name', email: 'Email', phone: 'Phone',
    budget: 'Budget (EUR)', budget_placeholder: 'e.g. 500',
    use_case: 'What’s it for?',
    use_case_gaming: 'Gaming', use_case_office: 'Office & everyday use', use_case_creative: 'Content creation / editing',
    use_case_server: 'Home server / NAS', use_case_other: 'Something else',
    notes: 'Anything specific?', notes_placeholder: 'Preferred brand, must reuse a part you already have, quiet operation, etc.',
    submit: 'Send request →', submitting: 'Sending…',
    success_title: 'Request sent.',
    success_body: 'We’ll email you a price proposal once we’ve checked current listings. Usually within 1–2 business days.',
    back_home: '← Back to home',
    error_generic: 'Something went wrong. Please try again.',
  },
  sk: {
    nav_home: 'Domov', nav_shop: 'Obchod', nav_build: 'Zostaviť', nav_about: 'O nás', nav_account: 'Účet',
    eyebrow: 'GOMP BUDGET BUILDS',
    title: 'Skvelé PC nemusí byť nové.',
    intro:
      'Povedzte nám svôj rozpočet a na čo počítač potrebujete. Naceníme zostavu z dôkladne overených bazarových komponentov a pošleme vám návrh — bez záväzku, bez automatického oceňovania, len reálny prehľad o tom, čo je práve dostupné.',
    point1_title: 'Reálne, aktuálne ceny',
    point1_body: 'Každý návrh je nacenený podľa toho, čo je práve v ponuke — nie podľa starého priemeru.',
    point2_title: 'Overené pred odoslaním',
    point2_body: 'Každá bazarová súčiastka je otestovaná pred tým, ako sa dostane do vašej zostavy.',
    point3_title: 'Jasno v tom, čo je použité',
    point3_body: 'Presne budete vedieť, čo je bazarové, v akom stave a s akými zárukami.',
    form_title: 'Vyžiadajte si návrh',
    first_name: 'Meno', last_name: 'Priezvisko', email: 'E-mail', phone: 'Telefón',
    budget: 'Rozpočet (EUR)', budget_placeholder: 'napr. 500',
    use_case: 'Na čo to bude?',
    use_case_gaming: 'Hranie', use_case_office: 'Kancelária a bezné použitie', use_case_creative: 'Tvorba obsahu / strih',
    use_case_server: 'Domáci server / NAS', use_case_other: 'Niečo iné',
    notes: 'Niečo konkrétne?', notes_placeholder: 'Preferovaná značka, chcete použiť vlastnú súčiastku, tichá prevádzka...',
    submit: 'Odoslať žiadosť →', submitting: 'Odosielam…',
    success_title: 'Žiadosť odoslaná.',
    success_body: 'Pošleme vám e-mailom cenový návrh, hneď ako overíme aktuálnu ponuku. Zvyčajne do 1–2 pracovných dní.',
    back_home: '← Späť na hlavnú stránku',
    error_generic: 'Niečo sa pokazilo. Skúste to znova.',
  },
  cz: {
    nav_home: 'Domů', nav_shop: 'Obchod', nav_build: 'Sestavit', nav_about: 'O nás', nav_account: 'Účet',
    eyebrow: 'GOMP BUDGET BUILDS',
    title: 'Skvělé PC nemusí být nové.',
    intro:
      'Řekněte nám svůj rozpočet a k čemu počítač potřebujete. Naceníme sestavu z pečlivě prověřených bazarových komponent a pošleme vám návrh — bez závazku, bez automatického oceňování, jen reálný přehled o tom, co je zrovna dostupné.',
    point1_title: 'Reálné, aktuální ceny',
    point1_body: 'Každý návrh je naceněn podle toho, co je právě v nabídce — ne podle starého průměru.',
    point2_title: 'Prověřeno před odesláním',
    point2_body: 'Každá bazarová součástka je otestována dřív, než se dostane do vaší sestavy, stejně jako u sestav z nových dílů.',
    point3_title: 'Jasno v tom, co je použité',
    point3_body: 'Budete přesně vědět, co je bazarové, v jakém je stavu a jakou má záruku.',
    form_title: 'Vyžádat si návrh',
    first_name: 'Jméno', last_name: 'Příjmení', email: 'E-mail', phone: 'Telefon',
    budget: 'Rozpočet (EUR)', budget_placeholder: 'např. 500',
    use_case: 'K čemu to bude?',
    use_case_gaming: 'Hraní', use_case_office: 'Kancelář a běžné použití', use_case_creative: 'Tvorba obsahu / střih',
    use_case_server: 'Domácí server / NAS', use_case_other: 'Něco jiného',
    notes: 'Něco konkrétního?', notes_placeholder: 'Preferovaná značka, chcete využít vlastní součástku, tichý provoz…',
    submit: 'Odeslat žádost →', submitting: 'Odesílám…',
    success_title: 'Žádost odeslána.',
    success_body: 'Jakmile ověříme aktuální nabídku, pošleme vám e-mailem cenový návrh. Obvykle do 1–2 pracovních dnů.',
    back_home: '← Zpět na hlavní stránku',
    error_generic: 'Něco se pokazilo. Zkuste to prosím znovu.',
  },
} as const;

const INPUT_STYLE: CSSProperties = {
  width: '100%', padding: '11px 12px', border: '0.5px solid rgba(28,28,26,0.2)', borderRadius: 3,
  fontSize: 14, fontFamily: 'var(--font-sans)', background: PAGE_BG, color: INK, outline: 'none',
};
const LABEL_STYLE: CSSProperties = {
  fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: 0.8,
  textTransform: 'uppercase', marginBottom: 6,
};

export default function GbbPage() {
  const { lang } = useSite();
  const { user, profile } = useAuth();
  const isMobile = useIsMobile();
  const t = T[lang] ?? T.en;

  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [budget, setBudget] = useState('');
  const [useCase, setUseCase] = useState<UseCase>('gaming');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await submitGbbRequest({
      userId: user?.id ?? null,
      firstName,
      lastName,
      email,
      phone,
      budgetEur: budget.trim() !== '' ? Number(budget) : null,
      useCase,
      notes,
      lang,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error || t.error_generic);
      return;
    }
    setSubmitted(true);
  }

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG }}>
      <style>{`@keyframes gompPulseDot { 0%,100% { opacity:0.18; transform:scale(0.8); } 50% { opacity:0.6; transform:scale(1.2); } }`}</style>
      <SiteNav />

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: isMobile ? '56px 20px 60px' : '84px 32px 90px', position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          {/* ambient floaties, mirrors the landing-page hero — same motif, green instead of bordeaux */}
          {!isMobile && (
            <>
              <div style={{ position: 'absolute', top: -46, left: -56, width: 210, height: 210, pointerEvents: 'none', zIndex: 0 }}>
                <div style={{ position: 'absolute', inset: 0, border: `0.5px solid ${GBB_GREEN_TINT(0.22)}`, borderRadius: '50%', animation: 'gompRotateSlow 110s linear infinite' }} />
                <div style={{ position: 'absolute', inset: 30, border: `0.5px solid ${GBB_GREEN_TINT(0.13)}`, borderRadius: '50%', animation: 'gompRotateSlowRev 85s linear infinite' }} />
              </div>
              <div style={{ position: 'absolute', top: 6, left: 'calc(100% - 40px)', width: 7, height: 7, borderRadius: '50%', background: GBB_GREEN, pointerEvents: 'none', zIndex: 1, animation: 'gompPulseDot 5s ease-in-out infinite' }} />
              <div style={{ position: 'absolute', top: 172, left: -26, width: 6, height: 6, borderRadius: '50%', background: GOLD, filter: 'blur(0.5px)', pointerEvents: 'none', zIndex: 1, animation: 'gompPulseDot 4.5s ease-in-out infinite 0.8s' }} />
            </>
          )}
          <div
            style={{
              fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 600, fontStyle: 'italic',
              letterSpacing: 1.5, color: GBB_GREEN, marginBottom: 12, position: 'relative', zIndex: 2,
            }}
          >
            {t.eyebrow}
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-sans)', fontSize: isMobile ? 30 : 44, fontWeight: 600, color: INK,
              letterSpacing: -0.5, lineHeight: 1.15, margin: '0 0 18px', maxWidth: 640, position: 'relative', zIndex: 2,
            }}
          >
            {t.title}
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: MUTED, fontWeight: 300, lineHeight: 1.7, maxWidth: 620, marginBottom: 44, position: 'relative', zIndex: 2 }}>
            {t.intro}
          </p>
        </div>

        <div style={{ position: 'relative', marginBottom: 56 }}>
          {!isMobile && (
            <div style={{ position: 'absolute', top: -30, right: -20, width: 150, height: 150, pointerEvents: 'none', zIndex: 0 }}>
              <div style={{ position: 'absolute', inset: 0, border: '0.5px solid rgba(196,163,90,0.28)', borderRadius: '50%', animation: 'gompRotateSlowRev 95s linear infinite' }} />
              <div style={{ position: 'absolute', inset: 26, border: '0.5px solid rgba(196,163,90,0.16)', borderRadius: '50%', animation: 'gompRotateSlow 65s linear infinite' }} />
            </div>
          )}
          <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 20 }}>
            {[
              { title: t.point1_title, body: t.point1_body },
              { title: t.point2_title, body: t.point2_body },
              { title: t.point3_title, body: t.point3_body },
            ].map((p) => (
              <div key={p.title} style={{ background: PANEL_BG, border: '0.5px solid rgba(28,28,26,0.1)', borderRadius: 3, padding: 20, borderLeft: `3px solid ${GBB_GREEN}` }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: INK, marginBottom: 6 }}>{p.title}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: MUTED, fontWeight: 300, lineHeight: 1.6 }}>{p.body}</div>
              </div>
            ))}
          </div>
        </div>

        {!isMobile && (
          <div style={{ position: 'absolute', top: 340, left: -20, width: 130, height: 130, pointerEvents: 'none', zIndex: 0 }}>
            <div style={{ position: 'absolute', inset: 0, border: `0.5px solid ${GBB_GREEN_TINT(0.2)}`, borderRadius: '50%', animation: 'gompRotateSlow 92s linear infinite' }} />
          </div>
        )}
        <div style={{ position: 'absolute', top: 300, left: '38%', width: 5, height: 5, borderRadius: '50%', background: GOLD, pointerEvents: 'none', zIndex: 0, animation: 'gompPulseDot 5.4s ease-in-out infinite 0.6s', display: isMobile ? 'none' : 'block' }} />

        <div style={{ background: PANEL_BG, border: '0.5px solid rgba(28,28,26,0.12)', borderRadius: 4, padding: isMobile ? 22 : 36, maxWidth: 640, position: 'relative', zIndex: 2 }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: GBB_GREEN_TINT(0.12), border: `1.5px solid ${GBB_GREEN}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 22, color: GBB_GREEN }}>
                ✓
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 19, fontWeight: 600, color: INK, marginBottom: 8 }}>{t.success_title}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: MUTED, fontWeight: 300, lineHeight: 1.6, maxWidth: 420, margin: '0 auto' }}>{t.success_body}</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600, color: INK, marginBottom: 20 }}>{t.form_title}</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <div style={LABEL_STYLE}>{t.first_name}</div>
                  <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} style={INPUT_STYLE} />
                </div>
                <div>
                  <div style={LABEL_STYLE}>{t.last_name}</div>
                  <input required value={lastName} onChange={(e) => setLastName(e.target.value)} style={INPUT_STYLE} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <div style={LABEL_STYLE}>{t.email}</div>
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={INPUT_STYLE} />
                </div>
                <div>
                  <div style={LABEL_STYLE}>{t.phone}</div>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} style={INPUT_STYLE} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '160px 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <div style={LABEL_STYLE}>{t.budget}</div>
                  <input type="number" min={0} placeholder={t.budget_placeholder} value={budget} onChange={(e) => setBudget(e.target.value)} style={INPUT_STYLE} />
                </div>
                <div>
                  <div style={LABEL_STYLE}>{t.use_case}</div>
                  <select value={useCase} onChange={(e) => setUseCase(e.target.value as UseCase)} style={INPUT_STYLE}>
                    {USE_CASES.map((uc) => (
                      <option key={uc} value={uc}>{t[`use_case_${uc}` as const]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={LABEL_STYLE}>{t.notes}</div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.notes_placeholder}
                  rows={4}
                  style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'var(--font-sans)' }}
                />
              </div>
              {error && (
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#CC3333', marginBottom: 14 }}>{error}</div>
              )}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%', padding: '13px 0', background: submitting ? GBB_GREEN_DARK : GBB_GREEN, color: '#FDFAF4',
                  border: 'none', borderRadius: 3, fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600,
                  cursor: submitting ? 'default' : 'pointer', letterSpacing: 0.3,
                }}
              >
                {submitting ? t.submitting : t.submit}
              </button>
            </form>
          )}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
