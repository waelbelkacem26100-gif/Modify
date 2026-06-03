// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

export async function logAction(
  supabase: SupabaseClient,
  storeId: string,
  action: string,
  details?: Record<string, unknown>,
  status: 'success' | 'failed' | 'warning' = 'success',
  fixId?: string | null
): Promise<void> {
  try {
    // PostgREST errors do NOT throw — they come back in `error`. Surface them
    // so schema/RLS problems (e.g. missing column → PGRST204 / HTTP 400) are
    // diagnosable instead of being silently swallowed.
    const { error } = await supabase.from('audit_logs').insert({
      store_id: storeId,
      fix_id: fixId ?? null,
      action,
      details: details ?? null,
      status,
    })
    if (error) {
      console.error('[audit-log] insert rejected:', error.code, '-', error.message,
        error.hint ? `(hint: ${error.hint})` : '')
    }
  } catch (e) {
    // Network/unexpected throw — logging must never break the caller's flow
    console.error('[audit-log] insert threw:', e)
  }
}
