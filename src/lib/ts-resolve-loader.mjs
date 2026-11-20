// Test-only resolver: lets Node's built-in runner import extensionless './x' specifiers from .ts files, and the '@/…' alias (= src/…).
export async function resolve(spec, ctx, next) {
  if (spec.startsWith('@/')) {
    const url = new URL('../' + spec.slice(2), import.meta.url).href;
    return resolve(url, ctx, next);
  }
  try {
    return await next(spec, ctx);
  } catch (e) {
    if ((spec.startsWith('.') || spec.startsWith('file:')) && !/\.[a-z]+$/.test(spec)) return next(spec + '.ts', ctx);
    throw e;
  }
}
