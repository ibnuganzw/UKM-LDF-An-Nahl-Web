import { supabase } from './supabaseClient';

const MAX_BYTES = 5 * 1024 * 1024;
const BUCKET = 'org-photos';

function pathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

/** Best-effort deletion of an org photo by its public URL — used when a divisi
 *  row is removed, so its uploaded photo doesn't linger as an orphan. Ignores
 *  non-bucket URLs and storage errors so it never fails the delete itself. */
export async function deleteOrgPhotoByUrl(url: string | null | undefined): Promise<void> {
  if (!url) return;
  const path = pathFromPublicUrl(url);
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}

export async function uploadOrgPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File harus berupa gambar.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Ukuran gambar maksimal 5MB.');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from('org-photos').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('org-photos').getPublicUrl(path);
  return data.publicUrl;
}
