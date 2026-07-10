import { supabase } from './supabaseClient';

const MAX_BYTES = 5 * 1024 * 1024;
const BUCKET = 'article-images';

/** Extracts the in-bucket object path from a Supabase public URL, or null if the
 *  URL doesn't belong to this bucket (e.g. an externally hosted image), so we
 *  only ever try to delete objects we actually own. */
function pathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

/** Gathers every article-images URL referenced by a stored article: its cover
 *  plus any inline <img> in the content HTML. Used to clean up storage when an
 *  article is deleted so uploaded images don't linger as orphans. */
export function collectArticleImageUrls(coverUrl: string | null, contentHtml: string): string[] {
  const urls = new Set<string>();
  if (coverUrl) urls.add(coverUrl);
  const doc = new DOMParser().parseFromString(contentHtml, 'text/html');
  doc.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src');
    if (src) urls.add(src);
  });
  return [...urls];
}

/** Best-effort deletion of the given public URLs from the article-images bucket.
 *  Silently ignores non-bucket URLs and storage errors — cleanup must never fail
 *  the user action that triggered it (the row is already gone by this point). */
export async function deleteArticleImagesByUrls(urls: Array<string | null | undefined>): Promise<void> {
  const paths = urls
    .map((url) => (url ? pathFromPublicUrl(url) : null))
    .filter((path): path is string => path !== null);
  if (paths.length === 0) return;
  await supabase.storage.from(BUCKET).remove(paths);
}

export async function uploadArticleImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File harus berupa gambar.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Ukuran gambar maksimal 5MB.');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `content/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from('article-images').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('article-images').getPublicUrl(path);
  return data.publicUrl;
}
