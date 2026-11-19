// Test-only resolver: lets Node's built-in runner import extensionless './x' specifiers from .ts files.
export async function resolve(spec, ctx, next) {
  try {
    return await next(spec, ctx);
  } catch (e) {
    if (spec.startsWith('.') && !/\.[a-z]+$/.test(spec)) return next(spec + '.ts', ctx);
    throw e;
  }
}
