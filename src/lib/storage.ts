import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Bucket name mapping from public URLs
const BUCKET_PATTERNS: Record<string, string> = {
  'conductor-docs': 'conductor-docs',
  'propietario-docs': 'propietario-docs',
  'vehiculo-fotos': 'vehiculo-fotos',
  'recibos': 'recibos',
};

/**
 * Extract bucket and path from a stored public URL.
 * URLs look like: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
 */
function parseBucketUrl(url: string): { bucket: string; path: string } | null {
  if (!url || !url.includes('/storage/v1/object/public/')) return null;
  const parts = url.split('/storage/v1/object/public/');
  if (parts.length < 2) return null;
  const rest = parts[1].split('?')[0]; // remove query params
  const slashIdx = rest.indexOf('/');
  if (slashIdx === -1) return null;
  const bucket = rest.substring(0, slashIdx);
  const path = rest.substring(slashIdx + 1);
  return { bucket, path };
}

/**
 * Given a stored public URL (or path), return a signed URL.
 * Falls back to original URL if parsing fails.
 * Cache signed URLs for 50 minutes (they expire in 60).
 */
const signedUrlCache = new Map<string, { url: string; expires: number }>();

export async function getSignedUrl(storedUrl: string): Promise<string> {
  if (!storedUrl) return '';
  
  // Check cache
  const cached = signedUrlCache.get(storedUrl);
  if (cached && cached.expires > Date.now()) return cached.url;

  const parsed = parseBucketUrl(storedUrl);
  if (!parsed) return storedUrl; // not a storage URL, return as-is

  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, 3600); // 1 hour

  if (error || !data?.signedUrl) return storedUrl;

  // Cache for 50 minutes
  signedUrlCache.set(storedUrl, {
    url: data.signedUrl,
    expires: Date.now() + 50 * 60 * 1000,
  });

  return data.signedUrl;
}

/**
 * Upload a file and return a signed URL (for private buckets).
 */
export async function uploadAndSign(
  bucket: string,
  path: string,
  file: File,
  options?: { upsert?: boolean }
): Promise<string | null> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, options);
  if (error) {
    console.error('Upload error:', error);
    return null;
  }
  // Store the public-style URL path for consistency with existing DB data
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
  return publicUrl;
}
