import GompHome from '@/components/home/GompHome';

// New homepage. Uses DEFAULT_HOME_BUILDS until you pass your Supabase prebuilts
// (mapped to HomeBuild) via the `builds` prop — see README-homepage.md.
export default function HomePage() {
  return <GompHome />;
}
