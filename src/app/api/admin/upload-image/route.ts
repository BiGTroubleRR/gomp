// Admin-only upload of a component product shot into the public `component-images` Storage
// bucket. The browser strips the background client-side (see @imgly/background-removal in the
// admin form) before ever sending bytes here — this route just needs to persist and publish
// whatever PNG it's handed, using the service-role key the same way /api/admin/components does.
import { NextResponse } from 'next/server';
import { getAdminIdentity } from '@/lib/admin-auth';
import { createAdminClient, MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';

const BUCKET = 'component-images';
const MAX_BYTES = 5 * 1024 * 1024;

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

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    if (e instanceof MissingServiceRoleKeyError) {
      return NextResponse.json({ error: e.message, code: 'missing_service_role_key' }, { status: 503 });
    }
    throw e;
  }

  const path = `${slugify(nameHint)}-${Date.now()}.png`;
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: 'image/png',
    upsert: false,
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
