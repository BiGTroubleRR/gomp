// Admin-only upload of a component product shot into the public `component-images` Storage
// bucket. Resizes/re-encodes to WebP server-side (see resizeForStorage below) before persisting —
// admin-picked files were previously stored completely untouched, at whatever resolution the
// admin's camera/screenshot produced (up to MAX_BYTES), which was the single biggest contributor
// to slow page loads across the site. If the admin wants a transparent background, they pre-cut
// it themselves before uploading; alpha channels survive the WebP re-encode unchanged.
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { getAdminIdentity } from '@/lib/admin-auth';
import { createAdminClient, MissingServiceRoleKeyError } from '@/lib/supabase/admin-server';

const BUCKET = 'component-images';
const MAX_BYTES = 5 * 1024 * 1024;
// Must match the component-images bucket's own allowed_mime_types (see
// scripts/widen-image-bucket-mime-types.mjs) — checked here too so a mismatch surfaces as this
// route's own clear error message instead of Supabase Storage's less specific rejection.
const ACCEPTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];

// Plenty for any product-shot use on this site — picker thumbnails, the sidebar summary, and the
// largest on-screen use (the /build hover-zoom overlay) are all well under this on the long edge.
const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 82;

// SVG is already tiny vector data with no "resolution" to shrink — pass it through untouched, same
// as before. GIF is passed through too (sharp would flatten an animated GIF to one frame, which
// would silently break an admin's animated upload); everything else gets resized-to-fit and
// re-encoded to WebP, which is where the real size win comes from.
async function resizeForStorage(bytes: ArrayBuffer, mimeType: string): Promise<{ bytes: Buffer; mimeType: string; ext: string }> {
  if (mimeType === 'image/svg+xml' || mimeType === 'image/gif') {
    return { bytes: Buffer.from(bytes), mimeType, ext: mimeType.split('/')[1].split('+')[0] };
  }
  const resized = await sharp(Buffer.from(bytes))
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
  return { bytes: resized, mimeType: 'image/webp', ext: 'webp' };
}

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

  const rawBytes = await file.arrayBuffer();
  let processed;
  try {
    processed = await resizeForStorage(rawBytes, file.type);
  } catch (e) {
    return NextResponse.json({ error: `Could not process image: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }

  const path = `${slugify(nameHint) || 'upload'}-${Date.now()}.${processed.ext}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, processed.bytes, {
    contentType: processed.mimeType,
    upsert: false,
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
