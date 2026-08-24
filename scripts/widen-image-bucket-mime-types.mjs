// One-off: widen the `component-images` Storage bucket's allowed MIME types beyond
// image/png. It was created back when the admin upload route always produced a PNG
// (via @imgly/background-removal); now that background removal is gone and the route
// passes through whatever image type the admin picked (see
// src/app/api/admin/upload-image/route.ts), a non-PNG upload was failing at the
// Storage layer with "mime type image/jpeg is not supported" even though the app code
// accepted it. Run with: node --env-file=.env.local scripts/widen-image-bucket-mime-types.mjs
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');

const supabase = createClient(url, key);

const BUCKET = 'component-images';
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];

const { data: before, error: getError } = await supabase.storage.getBucket(BUCKET);
if (getError) throw getError;
console.log('Before:', { public: before.public, allowedMimeTypes: before.allowed_mime_types, fileSizeLimit: before.file_size_limit });

const { error: updateError } = await supabase.storage.updateBucket(BUCKET, {
  public: true,
  allowedMimeTypes: ALLOWED_MIME_TYPES,
  fileSizeLimit: '5MB',
});
if (updateError) throw updateError;

const { data: after, error: afterError } = await supabase.storage.getBucket(BUCKET);
if (afterError) throw afterError;
console.log('After:', { public: after.public, allowedMimeTypes: after.allowed_mime_types, fileSizeLimit: after.file_size_limit });
