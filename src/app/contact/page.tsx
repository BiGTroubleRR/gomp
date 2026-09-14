'use client';

import { useState, type CSSProperties, type FormEvent } from 'react';
import { useSite } from '@/contexts/SiteContext';
import { useAuth } from '@/contexts/AuthContext';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import { useIsMobile } from '@/lib/use-media-query';
import { submitContactMessage } from '@/lib/contact-submit';

const MAROON = '#6E1423';
const INK = '#1C1C1A';
const MUTED = '#7A7469';
const PAGE_BG = '#F5F0E6';
const PANEL_BG = '#FDFAF4';

const T = {
  en: {
    eyebrow: 'CONTACT',
    title: 'Get in touch.',
    intro:
      'Question about a build, an order, or anything else — send us a message and we’ll get back to you as soon as we can.',
    form_title: 'Send a message',
    first_name: 'First name', last_name: 'Last name', email: 'Email', phone: 'Phone (optional)',
    message: 'Message', message_placeholder: 'How can we help?',
    submit: 'Send message →', submitting: 'Sending…',
    success_title: 'Message sent.',
    success_body: 'Thanks for reaching out — we’ll get back to you by email as soon as we can.',
    error_generic: 'Something went wrong. Please try again.',
  },
  sk: {
    eyebrow: 'KONTAKT',
    title: 'Ozvite sa nám.',
    intro: 'Otázka k zostave, objednávke alebo čokoľvek iné — napíšte nám a ozveme sa čo najskôr.',
    form_title: 'Odoslať správu',
    first_name: 'Meno', last_name: 'Priezvisko', email: 'E-mail', phone: 'Telefón (nepovinné)',
    message: 'Správa', message_placeholder: 'Ako vám môžeme pomôcť?',
    submit: 'Odoslať správu →', submitting: 'Odosielam…',
    success_title: 'Správa odoslaná.',
    success_body: 'Ďakujeme za správu — ozveme sa vám e-mailom čo najskôr.',
    error_generic: 'Niečo sa pokazilo. Skúste to znova.',
  },
  cz: {
    eyebrow: 'KONTAKT',
    title: 'Ozvěte se nám.',
    intro: 'Dotaz k sestavě, objednávce nebo cokoliv jiného — napište nám a ozveme se co nejdříve.',
    form_title: 'Odeslat zprávu',
    first_name: 'Jméno', last_name: 'Příjmení', email: 'E-mail', phone: 'Telefon (nepovinné)',
    message: 'Zpráva', message_placeholder: 'Jak vám můžeme pomoct?',
    submit: 'Odeslat zprávu →', submitting: 'Odesílám…',
    success_title: 'Zpráva odeslána.',
    success_body: 'Děkujeme za zprávu — ozveme se vám e-mailem co nejdříve.',
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

export default function ContactPage() {
  const { lang } = useSite();
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const t = T[lang] ?? T.en;

  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await submitContactMessage({ firstName, lastName, email, phone, message });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error || t.error_generic);
      return;
    }
    setSubmitted(true);
  }

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG }}>
      <SiteNav />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: isMobile ? '56px 20px 60px' : '84px 32px 90px' }}>
        <div
          style={{
            fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 600,
            letterSpacing: 1.5, color: MAROON, marginBottom: 12,
          }}
        >
          {t.eyebrow}
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-sans)', fontSize: isMobile ? 30 : 44, fontWeight: 600, color: INK,
            letterSpacing: -0.5, lineHeight: 1.15, margin: '0 0 18px',
          }}
        >
          {t.title}
        </h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, color: MUTED, fontWeight: 300, lineHeight: 1.7, marginBottom: 44 }}>
          {t.intro}
        </p>

        <div style={{ background: PANEL_BG, border: '0.5px solid rgba(28,28,26,0.12)', borderRadius: 4, padding: isMobile ? 22 : 36 }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(110,20,35,0.08)', border: `1.5px solid ${MAROON}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 22, color: MAROON }}>
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
              <div style={{ marginBottom: 20 }}>
                <div style={LABEL_STYLE}>{t.message}</div>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t.message_placeholder}
                  rows={5}
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
                  width: '100%', padding: '13px 0', background: submitting ? '#4A0E1A' : MAROON, color: '#FDFAF4',
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
