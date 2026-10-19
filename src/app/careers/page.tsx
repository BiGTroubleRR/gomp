import ComingSoon from '@/components/ComingSoon';

export default function CareersPage() {
  return (
    <ComingSoon
      eyebrow={{ en: 'Careers', sk: 'Kariéra', cz: 'Kariéra' }}
      title={{ en: "No open roles yet — but say hello.", sk: 'Zatiaľ nehľadáme, ale ozvite sa.', cz: 'Zatím nehledáme, ale ozvěte se.' }}
      blurb={{
        en: "We don't have open positions right now. If you love building PCs, write to us — we'd like to meet you.",
        sk: 'Momentálne nemáme otvorené pozície. Ak vás baví stavať počítače, napíšte nám — radi sa spoznáme.',
        cz: 'Momentálně nemáme otevřené pozice. Pokud vás baví stavět počítače, napište nám — rádi se poznáme.',
      }}
    />
  );
}
