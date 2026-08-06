// SERVER ONLY. The single place that decides "is this caller an admin?".
//
// Two ways to grant admin, checked in order. Either is enough:
//
//   1. Clerk user metadata — in the Clerk dashboard, open the user and save
//      { "role": "admin" } into either "Private metadata" (preferred: never
//      leaves the server) or "Public metadata". Takes effect immediately with
//      no redeploy. The "role" key is case-sensitive; the value is not.
//
//   2. An email allowlist — set ADMIN_EMAILS to a comma-separated list, e.g.
//      ADMIN_EMAILS=you@example.com,colleague@example.com
//      Zero Clerk configuration, but changing it needs a redeploy.
//
// Deliberately fails closed: if Clerk isn't configured, nobody is signed in, or
// neither rule matches, this returns null and callers must refuse the request.
// Note that "any signed-in Clerk user" is NOT admin — /admin would otherwise be
// open to anyone who signed up on the storefront.
import { currentUser } from '@clerk/nextjs/server';

export type AdminIdentity = { userId: string; email: string };

function allowlistedEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  let user;
  try {
    user = await currentUser();
  } catch {
    // Clerk keys missing/invalid — treat as not-an-admin rather than crashing.
    return null;
  }
  if (!user) return null;

  const email = user.primaryEmailAddress?.emailAddress?.toLowerCase() ?? '';

  // Accept the role from either metadata field. `privateMetadata` is the tidier
  // place (server-only, never sent to the browser); `publicMetadata` is the more
  // common convention. Either is safe here because this check runs server-side —
  // the client can't grant itself admin by editing anything it can see.
  const readRole = (meta: unknown) => (meta as { role?: unknown } | null | undefined)?.role;
  const isAdminByMetadata = [readRole(user.privateMetadata), readRole(user.publicMetadata)].some(
    (r) => typeof r === 'string' && r.trim().toLowerCase() === 'admin',
  );
  const isAdminByEmail = email.length > 0 && allowlistedEmails().includes(email);

  if (!isAdminByMetadata && !isAdminByEmail) return null;
  return { userId: user.id, email };
}

export async function isAdmin(): Promise<boolean> {
  return (await getAdminIdentity()) !== null;
}
