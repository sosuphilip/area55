import { supabase } from '@/lib/supabase';

const BUCKET = 'athlete-photos';

/** Public URL for an athlete photo, or null when there's no photo. */
export function athletePhotoUrl(photoPath: string | null): string | null {
  if (!photoPath) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(photoPath);
  return data.publicUrl;
}

function randomSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Upload a picked photo to the coach's folder and return its storage path.
 * The path starts with `coachId` because the storage insert policy requires
 * the first folder to be `auth.uid()` (see schema.sql storage policies).
 */
export async function uploadAthletePhoto(
  coachId: string,
  file: Blob | Uint8Array,
  contentType?: string | null,
): Promise<string> {
  const mime = contentType || 'image/jpeg';
  const ext = mime === 'image/png' ? 'png' : 'jpg';
  const path = `${coachId}/${randomSuffix()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: mime });
  if (error) throw error;
  return path;
}

/** Best-effort removal of a stored photo. Resolves silently on failure. */
export async function deleteAthletePhoto(photoPath: string | null): Promise<void> {
  if (!photoPath) return;
  await supabase.storage.from(BUCKET).remove([photoPath]).catch(() => {});
}

export { BUCKET };
