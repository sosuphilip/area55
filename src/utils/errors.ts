/**
 * Map a thrown Supabase/validation error to a friendly, user-facing message.
 */
export function errorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const record = err as Record<string, unknown>;
    const code = typeof record.code === 'string' ? record.code : '';
    if (code === '23505') {
      return 'That name already exists. Try a different one.';
    }
    if (code === '23503') {
      return 'This item is still in use and can’t be deleted.';
    }
    if (typeof record.message === 'string') return record.message;
  }
  if (typeof err === 'string') return err;
  return 'Something went wrong. Please try again.';
}
