// Admin-only upload of a component product shot into the public `component-images` Storage
// bucket. This route just persists and publishes whatever image file the admin picked in the
// form (see handleImageUpload in src/app/admin/page.tsx) — no server-side processing, using the
// service-role key the same way /api/admin/components does. If the admin wants a transparent
// background, they pre-cut it themselves before uploading; this route and every place the
// resulting URL is rendered treat the file's alpha channel as opaque data, passing it through
// untouched.
import { NextResponse } from 'next/server';
import { getAdminIdentity } from '@/lib/admin-auth';
import { createAdminClient, MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';

const BUCKET = 'component-images';
const MAX_BYTES = 5 * 1024 * 1024;
// Must match the component-images bucket's own allowed_mime_types (see
// scripts/widen-image-bucket-mime-types.mjs) — checked here too so a mismatch surfaces as this
// route's own clear error message instead of Supabase Storage's less specific rejection.
const ACCEPTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function POST(request: Request) {
  const admin = await getAdminIdentity();
  if (!admin) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const nameHint = String(form?.get('nameHint') ?? 'component');
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'Expected a "file" field.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image too large (max 5MB).' }, { status: 413 });
  }
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Unsupported file type (${file.type || 'unknown'}).` }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    if (e instanceof MissingServiceRoleKeyError) {
      return NextResponse.json({ error: e.message, code: 'missing_service_role_key' }, { status: 503 });
    }
    throw e;
  }

  // file.type is one of ACCEPTED_MIME_TYPES here (checked above), so this always resolves to a
  // real image extension — 'image/svg+xml' -> 'svg', 'image/png' -> 'png', etc.
  const ext = file.type.split('/')[1].split('+')[0];
  const path = `${slugify(nameHint) || 'upload'}-${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
