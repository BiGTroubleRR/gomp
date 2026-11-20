import { notFound } from 'next/navigation';

// Internal tooling (geometry audit of the 3D configurator): available in development, a 404 on the live site.
export default function LabLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') notFound();
  return children;
}
