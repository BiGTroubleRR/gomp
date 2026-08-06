// Tells the /admin page whether the current Clerk user is an admin, so it can
// render the panel or an access-denied notice.
//
// This endpoint gates the *UI only*. It is not the security boundary — the data
// endpoints (e.g. /api/admin/intents) each re-check admin status server-side, so
// hiding a button here never has to be relied on.
import { NextResponse } from 'next/server';
import { getAdminIdentity } from '@/lib/admin-auth';

export async function GET() {
  const admin = await getAdminIdentity();
  return NextResponse.json(
    admin ? { isAdmin: true, email: admin.email } : { isAdmin: false },
    // Per-user answer, and cheap to recompute — never let a CDN or the browser
    // cache one user's admin status and serve it to somebody else.
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
