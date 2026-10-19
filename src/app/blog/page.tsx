import ComingSoon from '@/components/ComingSoon';

export default function BlogPage() {
  return (
    <ComingSoon
      eyebrow={{ en: 'Blog', sk: 'Blog', cz: 'Blog' }}
      title={{ en: 'The GOMP blog is coming.', sk: 'Blog GOMP už čoskoro.', cz: 'Blog GOMP již brzy.' }}
      blurb={{
        en: "Articles on undervolting, benchmarks and building PCs the way we do it in the workshop — we're writing the first ones now.",
        sk: 'Články o undervolte, benchmarkoch a skladaní počítačov tak, ako to robíme v dielni — prvé práve píšeme.',
        cz: 'Články o undervoltu, benchmarcích a skládání počítačů tak, jak to děláme v dílně — první právě píšeme.',
      }}
    />
  );
}
