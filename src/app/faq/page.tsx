import ComingSoon from '@/components/ComingSoon';

export default function FaqPage() {
  return (
    <ComingSoon
      eyebrow={{ en: 'FAQ', sk: 'FAQ', cz: 'FAQ' }}
      title={{ en: 'Frequently asked questions — soon.', sk: 'Časté otázky už čoskoro.', cz: 'Časté otázky již brzy.' }}
      blurb={{
        en: "We're collecting the most common questions about builds, warranty and delivery. Until then, write to us — we answer personally.",
        sk: 'Zbierame najčastejšie otázky k zostavám, záruke a doprave. Dovtedy nám napíšte — odpovieme osobne.',
        cz: 'Sbíráme nejčastější otázky k sestavám, záruce a dopravě. Do té doby nám napište — odpovíme osobně.',
      }}
    />
  );
}
