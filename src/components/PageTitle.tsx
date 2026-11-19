// A page's main <h1> for screens whose design shows its title some other way (a stepper, a 3D stage, a form card):
// visually hidden, but there for screen readers and search engines, which expect exactly one h1 per page.
export default function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        margin: -1,
        padding: 0,
        overflow: 'hidden',
        clip: 'rect(0 0 0 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {children}
    </h1>
  );
}
