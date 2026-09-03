'use client';

import { useSite } from '@/contexts/SiteContext';
import TransitionLink from '@/components/TransitionLink';
import SiteNav from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import { useIsMobile } from '@/lib/use-media-query';

const INK = '#1C1C1A';
const MUTED = '#7A7469';
const MAROON = '#6E1423';
const GOLD = '#C4A35A';
const PAGE_BG = '#F5F0E6';
const PANEL_BG = '#FDFAF4';

const T = {
  en: {
    eyebrow: 'GOMP UNDERVOLTING',
    title: 'Quieter. Cooler. Just as fast.',
    intro:
      'Undervolting reduces the voltage sent to a CPU or GPU while keeping its clock speeds intact. Less voltage means less heat, which means your fans don’t have to work as hard — all without giving up a single frame of performance.',
    point1_title: 'Lower Temperatures',
    point1_body: 'Less voltage means less heat generated under load, so your components run cooler even during long gaming sessions.',
    point2_title: 'Quieter Operation',
    point2_body: 'Cooler components need less fan speed to stay safe, so your case fans and cooler can spin down and stay quiet.',
    point3_title: 'Reduced Power Draw',
    point3_body: 'Pulling less power from the wall means a lower electricity bill and less heat pushed into the room your PC sits in.',
    closing:
      'We undervolt every CPU and GPU wherever the specific chip and platform support it, and validate the result during the same 24-hour stress test every GOMP build already goes through — so you get all of this with zero compromise on performance.',
    cta: 'Start Building →',
    back_home: '← Back to home',
  },
  sk: {
    eyebrow: 'GOMP UNDERVOLTING',
    title: 'Tichšie. Chladnejšie. Rovnako rýchle.',
    intro:
      'Undervolting znižuje napätie privádzané do CPU alebo GPU, pričom si komponent zachová svoje pôvodné taktovanie. Menej napätia znamená menej tepla, a teda aj menej práce pre ventilátory — bez straty čo i len jedného snímku výkonu.',
    point1_title: 'Nižšie teploty',
    point1_body: 'Menej napätia znamená menej tepla pod záťažou, takže komponenty zostávajú chladnejšie aj počas dlhého hrania.',
    point2_title: 'Tichšia prevádzka',
    point2_body: 'Chladnejšie komponenty potrebujú nižšie otáčky ventilátorov, takže chladenie aj skriňové ventilátory môžu zostať tiché.',
    point3_title: 'Nižšia spotreba',
    point3_body: 'Nižší odber zo zásuvky znamená nižší účet za elektrinu a menej tepla vyžarovaného do miestnosti.',
    closing:
      'Každý CPU a GPU podvoltujeme všade, kde to konkrétny čip a platforma umožňujú, a výsledok overujeme počas rovnakého 24-hodinového záťažového testu, akým prechádza každá zostava GOMP — takže toto všetko získate bez akéhokoľvek kompromisu vo výkone.',
    cta: 'Začať stavať →',
    back_home: '← Späť na hlavnú stránku',
  },
  cz: {
    eyebrow: 'GOMP UNDERVOLTING',
    title: 'Tišší. Chladnější. Stejně rychlé.',
    intro:
      'Undervolting snižuje napětí přiváděné do CPU nebo GPU, přičemž komponenta si zachová své původní takty. Méně napětí znamená méně tepla, a tedy i méně práce pro ventilátory — bez ztráty jediného snímku výkonu.',
    point1_title: 'Nižší teploty',
    point1_body: 'Méně napětí znamená méně tepla pod zátěží, takže komponenty zůstávají chladnější i při dlouhém hraní.',
    point2_title: 'Tišší provoz',
    point2_body: 'Chladnější komponenty potřebují nižší otáčky ventilátorů, takže chlazení i skříňové ventilátory mohou zůstat tiché.',
    point3_title: 'Nižší spotřeba',
    point3_body: 'Nižší odběr ze zásuvky znamená nižší účet za elektřinu a méně tepla vyzařovaného do místnosti.',
    closing:
      'Každý CPU a GPU podvoltujeme všude, kde to konkrétní čip a platforma umožňují, a výsledek ověřujeme během stejného 24hodinového zátěžového testu, jakým prochází každá sestava GOMP — takže tohle všechno získáte bez jakéhokoli kompromisu ve výkonu.',
    cta: 'Začít stavět →',
    back_home: '← Zpět na hlavní stránku',
  },
} as const;

export default function UndervoltingPage() {
  const { lang } = useSite();
  const isMobile = useIsMobile();
  const t = T[lang] ?? T.en;

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG }}>
      <style>{`@keyframes gompPulseDot { 0%,100% { opacity:0.18; transform:scale(0.8); } 50% { opacity:0.6; transform:scale(1.2); } }`}</style>
      <SiteNav />

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: isMobile ? '32px 20px 60px' : '56px 32px 90px', position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          {!isMobile && (
            <>
              <div style={{ position: 'absolute', top: -46, left: -56, width: 210, height: 210, pointerEvents: 'none', zIndex: 0 }}>
                <div style={{ position: 'absolute', inset: 0, border: '0.5px solid rgba(110,20,35,0.22)', borderRadius: '50%', animation: 'gompRotateSlow 110s linear infinite' }} />
                <div style={{ position: 'absolute', inset: 30, border: '0.5px solid rgba(110,20,35,0.13)', borderRadius: '50%', animation: 'gompRotateSlowRev 85s linear infinite' }} />
              </div>
              <div style={{ position: 'absolute', top: 6, left: 'calc(100% - 40px)', width: 7, height: 7, borderRadius: '50%', background: MAROON, pointerEvents: 'none', zIndex: 1, animation: 'gompPulseDot 5s ease-in-out infinite' }} />
              <div style={{ position: 'absolute', top: 172, left: -26, width: 6, height: 6, borderRadius: '50%', background: GOLD, filter: 'blur(0.5px)', pointerEvents: 'none', zIndex: 1, animation: 'gompPulseDot 4.5s ease-in-out infinite 0.8s' }} />
            </>
          )}
          <div
            style={{
              fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 600, fontStyle: 'italic',
              letterSpacing: 1.5, color: MAROON, marginBottom: 12, position: 'relative', zIndex: 2,
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
              <div key={p.title} style={{ background: PANEL_BG, border: '0.5px solid rgba(28,28,26,0.1)', borderRadius: 3, padding: 20, borderLeft: `3px solid ${MAROON}` }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: INK, marginBottom: 6 }}>{p.title}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: MUTED, fontWeight: 300, lineHeight: 1.6 }}>{p.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: PANEL_BG, border: '0.5px solid rgba(28,28,26,0.12)', borderRadius: 4, padding: isMobile ? 22 : 36, maxWidth: 720, position: 'relative', zIndex: 2 }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: MUTED, fontWeight: 300, lineHeight: 1.75, margin: '0 0 22px' }}>
            {t.closing}
          </p>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <TransitionLink
              href="/build"
              style={{
                fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: PANEL_BG, background: MAROON,
                border: 'none', padding: '13px 26px', borderRadius: 2, letterSpacing: 0.2, textDecoration: 'none', display: 'inline-block',
              }}
            >
              {t.cta}
            </TransitionLink>
            <TransitionLink
              href="/"
              style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: MUTED, textDecoration: 'none' }}
            >
              {t.back_home}
            </TransitionLink>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
