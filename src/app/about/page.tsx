'use client';

import { CSSProperties } from 'react';
import { useSite } from '@/contexts/SiteContext';
import TransitionLink from '@/components/TransitionLink';
import Reveal from '@/components/Reveal';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import { useIsMobile } from '@/lib/use-media-query';

const translations = {
  en: {
    nav_home: 'Home',
    nav_shop: 'Shop',
    nav_build: 'Build',
    nav_about: 'About',
    nav_account: 'Account',
    nav_startbuilding: 'Start Building →',
    about_gomp: 'About GOMP',
    hero_line1: 'Built by',
    hero_line2: 'gamers. For',
    hero_line3: 'gamers.',
    the_origin: 'The Origin',
    origin_p1:
      "Every pre-built we had ever bought came with corners cut we couldn't see until it mattered — thermal paste slapped on, stock coolers running at limits, PSUs rated for worse days.",
    origin_p2:
      'So in 2019, three friends in Prague stopped buying and started building. Today GOMP has shipped over 12,000 builds. Every single one stress-tested at load for 24 hours before it ships.',
    founded: 'Founded',
    builds_shipped: 'Builds shipped',
    hq_workshop: 'HQ & workshop',
    pull_quote: '"We don’t build PCs to a price. We build them to a standard."',
    quote_author: 'Martin K. — Co-founder & Lead Builder',
    origin_p3:
      "That standard means a printed benchmark sheet with every build. It means 24-hour stress testing. It means using the same PSU we'd put in our own machines, not a budget unit because the margin looks better.",
    what_we_stand: 'What we stand for',
    our_values: 'Our values',
    who_builds: 'Who builds your PC',
    the_team: 'The team',
    ready_title: 'Ready to build yours?',
    ready_desc:
      'Configure your dream machine, part by part. Every GOMP build is hand-assembled, tested, and ships in seven days.',
    browse_builds: 'Browse builds',
    watermark_line1: 'Build',
    watermark_line2: 'your',
    watermark_line3: 'Legend.',
  },
  sk: {
    nav_home: 'Domov',
    nav_shop: 'Obchod',
    nav_build: 'Zostaviť',
    nav_about: 'O nás',
    nav_account: 'Účet',
    nav_startbuilding: 'Začať stavať →',
    about_gomp: 'O spoločnosti GOMP',
    hero_line1: 'Stavajú ho',
    hero_line2: 'hráči. Pre',
    hero_line3: 'hráčov.',
    the_origin: 'Náš pôvod',
    origin_p1:
      'Každý hotový počítač, ktorý sme si kedy kúpili, mal skryté kompromisy, ktoré sa prejavili až vo chvíli, keď na tom najviac záležalo... nedbalo nanesená teplovodivá pasta, sériové chladiče na hranici limitov, zdroje dimenzované na horšie dni.',
    origin_p2:
      'Preto sme v roku 2019, traja priatelia z Prahy, prestali nakupovať a začali stavať. Dnes má GOMP na konte viac ako 12 000 zostáv. Každú z nich pred expedíciou 24 hodín záťažovo testujeme.',
    founded: 'Založené',
    builds_shipped: 'Expedovaných zostáv',
    hq_workshop: 'Sídlo a dielňa',
    pull_quote: '„Počítače nestaviame na cenu. Staviame ich pre štandard.“',
    quote_author: 'Martin K. — spoluzakladateľ a hlavný technik',
    origin_p3:
      'Tento štandard znamená tlačený protokol o benchmarkoch pri každej zostave. Znamená rigorózne záťažové testovanie. Znamená použitie takého zdroja, aký by sme dali do vlastného počítača, nie lacnejšieho kus len preto, že sa tým zlepší marža.',
    what_we_stand: 'Za čím si stojíme',
    our_values: 'Naše hodnoty',
    who_builds: 'Kto stavia váš počítač',
    the_team: 'Tím',
    ready_title: 'Pripravení postaviť si vlastný?',
    ready_desc:
      'Zostavte si vysnívaný počítač po jednotlivých dieloch. Každý GOMP stroj je ručne zostavený, otestovaný a expedovaný do siedmich dní.',
    browse_builds: 'Prehliadať zostavy',
    watermark_line1: 'Postav si',
    watermark_line2: 'svoju',
    watermark_line3: 'Legendu.',
  },
} as const;

const values = {
  en: [
    {
      num: '01',
      title: 'Performance First',
      desc: 'Every component selection, every thermal decision, every cable route is made with one goal: maximum sustained performance. We never compromise on cooling or power.',
    },
    {
      num: '02',
      title: 'No Hidden Compromises',
      desc: 'Cheap PSUs. Barely-there coolers. Proprietary connectors. We have seen every trick in the book — and we don’t use any of them. Every spec is exactly what we publish.',
    },
    {
      num: '03',
      title: 'Owned Responsibility',
      desc: 'When something goes wrong — and occasionally it does — we fix it. No runarounds, no pointing at component manufacturers. GOMP owns the outcome, always.',
    },
  ],
  sk: [
    {
      num: '01',
      title: 'Výkon na prvom mieste',
      desc: 'Každý výber komponentu, každé tepelné riešenie, každý kábel je vedený s jedným cieľom: maximálny trvalý výkon. Chladenie ani napájanie nikdy nekompromitujeme.',
    },
    {
      num: '02',
      title: 'Žiadne skryté kompromisy',
      desc: 'Lacné zdroje. Sotva postačujúce chladiče. Proprietárne konektory. Poznáme každý trik v knihe — a nepoužívame ani jeden z nich. Každá špecifikácia je presne taká, akú uvádzame.',
    },
    {
      num: '03',
      title: 'Prevzatá zodpovednosť',
      desc: 'Keď sa niečo pokazí — a občas sa to stane — opravíme to. Bez zbytočných prieťahov, bez ukazovania na výrobcov komponentov. GOMP si za výsledok stojí vždy.',
    },
  ],
} as const;

const team = [
  { initial: 'M', name: 'Martin K.', role_en: 'Co-founder · Lead Builder', role_sk: 'Spoluzakladateľ · Hlavný technik', opacity: 1 },
  { initial: 'J', name: 'Jana V.', role_en: 'Co-founder · Operations', role_sk: 'Spoluzakladateľka · Prevádzka', opacity: 0.7 },
  { initial: 'T', name: 'Tomáš N.', role_en: 'Senior Technician', role_sk: 'Senior technik', opacity: 0.5 },
  { initial: 'P', name: 'Pavel S.', role_en: 'QA & Benchmarking', role_sk: 'QA a benchmarking', opacity: 0.4 },
] as const;

const MAROON = '#6E1423';
const INK = '#1C1C1A';
const MUTED = '#7A7469';
const PAGE_BG = '#F5F0E6';
const PANEL_BG = '#FDFAF4';

const serif: CSSProperties = { fontFamily: 'var(--font-serif)' };
const sans: CSSProperties = { fontFamily: 'var(--font-sans)' };

export default function AboutPage() {
  const { lang, currency, setLang, setCurrency } = useSite();
  const t = translations[lang];
  const activeColor = MAROON;
  const inactiveColor = MUTED;
  const isMobile = useIsMobile();

  return (
    <div style={{ position: 'relative', zIndex: 2, background: PAGE_BG, minHeight: '100vh' }}>
      {/* Nav */}
      <SiteNav
        cta={
          <TransitionLink
            href="/build"
            style={{
              ...sans,
              fontSize: 13,
              fontWeight: 500,
              color: PANEL_BG,
              background: MAROON,
              textDecoration: 'none',
              padding: '9px 22px',
              borderRadius: 2,
            }}
          >
            {t.nav_startbuilding}
          </TransitionLink>
        }
      />

      {/* Hero */}
      <section
        style={{
          padding: isMobile ? '70px 24px 50px' : '140px 60px 100px',
          borderBottom: '0.5px solid rgba(28,28,26,0.12)',
          animation: 'fadeUp 0.8s cubic-bezier(.16,1,.3,1) forwards',
        }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div
            style={{
              ...sans,
              fontSize: 11,
              fontWeight: 500,
              color: MUTED,
              letterSpacing: 2.5,
              textTransform: 'uppercase',
              marginBottom: isMobile ? 24 : 40,
            }}
          >
            {t.about_gomp}
          </div>
          <h1
            style={{
              ...serif,
              fontSize: isMobile ? 42 : 88,
              fontWeight: 600,
              lineHeight: 0.92,
              letterSpacing: isMobile ? '-1px' : '-2.5px',
              color: INK,
              margin: 0,
              textWrap: 'balance',
              maxWidth: 900,
            }}
          >
            {t.hero_line1}
            <br />
            {t.hero_line2} <span style={{ fontStyle: 'italic', color: MAROON }}>{t.hero_line3}</span>
          </h1>
        </div>
      </section>

      {/* Origin */}
      <section style={{ padding: isMobile ? '50px 24px' : '100px 60px', borderBottom: '0.5px solid rgba(28,28,26,0.12)' }}>
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? 48 : 100,
            alignItems: 'start',
          }}
        >
          <div>
            <div
              style={{
                ...sans,
                fontSize: 11,
                fontWeight: 500,
                color: MUTED,
                letterSpacing: 2.5,
                textTransform: 'uppercase',
                marginBottom: 24,
              }}
            >
              {t.the_origin}
            </div>
            <p style={{ ...sans, fontSize: 17, lineHeight: 1.8, color: INK, margin: '0 0 24px', fontWeight: 300 }}>
              {t.origin_p1}
            </p>
            <p style={{ ...sans, fontSize: 17, lineHeight: 1.8, color: MUTED, margin: '0 0 48px', fontWeight: 300 }}>
              {t.origin_p2}
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 0,
                border: '0.5px solid rgba(28,28,26,0.12)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              {[
                { value: '2019', label: t.founded },
                { value: '12K+', label: t.builds_shipped },
                { value: 'Praha', label: t.hq_workshop },
              ].map((stat, i) => (
                <Reveal
                  key={stat.label}
                  revealKey={`origin-${i}`}
                  delay={i === 1 ? 90 : i === 2 ? 180 : 0}
                  style={{
                    padding: isMobile ? '16px 8px' : '24px 20px',
                    borderRight: i !== 2 ? '0.5px solid rgba(28,28,26,0.1)' : undefined,
                  }}
                >
                  <div style={{ ...serif, fontSize: isMobile ? 24 : 36, fontWeight: 600, color: INK, letterSpacing: '-1px', lineHeight: 1 }}>
                    {stat.value}
                  </div>
                  <div style={{ ...sans, fontSize: isMobile ? 11 : 12, color: MUTED, marginTop: 4, fontWeight: 300 }}>{stat.label}</div>
                </Reveal>
              ))}
            </div>
          </div>
          <div style={{ paddingTop: isMobile ? 0 : 8 }}>
            <div style={{ borderLeft: `2px solid ${MAROON}`, paddingLeft: isMobile ? 20 : 36, marginBottom: isMobile ? 32 : 48 }}>
              <div style={{ ...serif, fontSize: isMobile ? 22 : 32, fontWeight: 600, fontStyle: 'italic', color: INK, lineHeight: 1.3, marginBottom: 24 }}>
                {t.pull_quote}
              </div>
              <div style={{ ...sans, fontSize: 13, color: MUTED, fontWeight: 300 }}>{t.quote_author}</div>
            </div>
            <p style={{ ...sans, fontSize: 15, lineHeight: 1.8, color: MUTED, margin: 0, fontWeight: 300 }}>{t.origin_p3}</p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section style={{ borderBottom: '0.5px solid rgba(28,28,26,0.12)', background: PANEL_BG }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ padding: isMobile ? '40px 24px 28px' : '80px 60px 56px' }}>
            <div
              style={{
                ...sans,
                fontSize: 11,
                fontWeight: 500,
                color: MUTED,
                letterSpacing: 2.5,
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              {t.what_we_stand}
            </div>
            <h2 style={{ ...serif, fontSize: isMobile ? 32 : 52, fontWeight: 600, letterSpacing: '-1.2px', color: INK, margin: 0, lineHeight: 1 }}>
              {t.our_values}
            </h2>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              borderTop: '0.5px solid rgba(28,28,26,0.12)',
            }}
          >
            {values[lang].map((val, i) => (
              <Reveal
                key={val.num}
                revealKey={`value-${i}`}
                delay={i * 100}
                style={{
                  padding: isMobile ? '32px 24px' : '52px 48px',
                  borderRight: !isMobile && i !== values[lang].length - 1 ? '0.5px solid rgba(28,28,26,0.1)' : undefined,
                  borderBottom: isMobile && i !== values[lang].length - 1 ? '0.5px solid rgba(28,28,26,0.1)' : undefined,
                }}
              >
                <div
                  style={{
                    ...serif,
                    fontSize: isMobile ? 44 : 60,
                    fontWeight: 400,
                    color: 'rgba(28,28,26,0.08)',
                    letterSpacing: '-2px',
                    lineHeight: 1,
                    marginBottom: 24,
                  }}
                >
                  {val.num}
                </div>
                <div style={{ ...sans, fontSize: 17, fontWeight: 600, color: INK, marginBottom: 14 }}>{val.title}</div>
                <p style={{ ...sans, fontSize: 14, color: MUTED, lineHeight: 1.8, margin: 0, fontWeight: 300 }}>{val.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section style={{ padding: isMobile ? '50px 24px' : '100px 60px', borderBottom: '0.5px solid rgba(28,28,26,0.12)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ marginBottom: isMobile ? 32 : 60 }}>
            <div
              style={{
                ...sans,
                fontSize: 11,
                fontWeight: 500,
                color: MUTED,
                letterSpacing: 2.5,
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              {t.who_builds}
            </div>
            <h2 style={{ ...serif, fontSize: isMobile ? 32 : 52, fontWeight: 600, letterSpacing: '-1.2px', color: INK, margin: 0, lineHeight: 1 }}>
              {t.the_team}
            </h2>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: 0,
              border: '0.5px solid rgba(28,28,26,0.12)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            {team.map((m, i) => (
              <Reveal
                key={m.initial}
                revealKey={`team-${i}`}
                delay={i * 90}
                style={{
                  padding: isMobile ? '24px 16px' : '36px 28px',
                  borderRight: isMobile
                    ? (i % 2 === 0 ? '0.5px solid rgba(28,28,26,0.1)' : undefined)
                    : (i !== team.length - 1 ? '0.5px solid rgba(28,28,26,0.1)' : undefined),
                  borderBottom: isMobile && i < team.length - 2 ? '0.5px solid rgba(28,28,26,0.1)' : undefined,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: MAROON,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    ...serif,
                    fontSize: 20,
                    fontWeight: 600,
                    color: PAGE_BG,
                    marginBottom: 16,
                    opacity: m.opacity,
                  }}
                >
                  {m.initial}
                </div>
                <div style={{ ...sans, fontSize: 15, fontWeight: 600, color: INK, marginBottom: 4 }}>{m.name}</div>
                <div style={{ ...sans, fontSize: 12, color: MUTED, fontWeight: 300 }}>
                  {lang === 'sk' ? m.role_sk : m.role_en}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: isMobile ? '60px 24px' : '120px 60px' }}>
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? 40 : 80,
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ ...serif, fontSize: isMobile ? 36 : 64, fontWeight: 600, letterSpacing: '-2px', color: INK, margin: '0 0 20px', lineHeight: 0.95 }}>
              {t.ready_title}
            </h2>
            <p style={{ ...sans, fontSize: 16, color: MUTED, margin: '0 0 40px', lineHeight: 1.75, fontWeight: 300 }}>
              {t.ready_desc}
            </p>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 14 }}>
              <TransitionLink
                href="/build"
                style={{
                  ...sans,
                  fontSize: 14,
                  fontWeight: 500,
                  color: PANEL_BG,
                  background: MAROON,
                  padding: '14px 28px',
                  borderRadius: 2,
                  textDecoration: 'none',
                }}
              >
                {t.nav_startbuilding}
              </TransitionLink>
              <TransitionLink
                href="/shop"
                style={{
                  ...sans,
                  fontSize: 14,
                  color: INK,
                  border: '0.5px solid rgba(28,28,26,0.3)',
                  padding: '14px 28px',
                  borderRadius: 2,
                  textDecoration: 'none',
                }}
              >
                {t.browse_builds}
              </TransitionLink>
            </div>
          </div>
          <div
            style={{
              ...serif,
              display: isMobile ? 'none' : 'block',
              fontSize: 80,
              fontWeight: 400,
              fontStyle: 'italic',
              color: 'rgba(28,28,26,0.06)',
              letterSpacing: '-3px',
              lineHeight: 0.85,
              textAlign: 'right',
              pointerEvents: 'none',
            }}
          >
            {t.watermark_line1}
            <br />
            {t.watermark_line2}
            <br />
            {t.watermark_line3}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
