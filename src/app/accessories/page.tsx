import ComingSoon from '@/components/ComingSoon';

export default function AccessoriesPage() {
  return (
    <ComingSoon
      eyebrow={{ en: 'Accessories', sk: 'Príslušenstvo', cz: 'Příslušenství' }}
      title={{ en: 'Accessories are on the way.', sk: 'Príslušenstvo je na ceste.', cz: 'Příslušenství je na cestě.' }}
      blurb={{
        en: "We're putting together a selection of peripherals and extras that match our builds. Meanwhile, pick a ready-made build or tell us what you're looking for.",
        sk: 'Pripravujeme výber periférií a doplnkov, ktoré sedia k našim zostavám. Medzitým si môžete vybrať hotovú zostavu alebo nám napísať, čo hľadáte.',
        cz: 'Připravujeme výběr periferií a doplňků, které sedí k našim sestavám. Mezitím si můžete vybrat hotovou sestavu nebo nám napsat, co hledáte.',
      }}
    />
  );
}
