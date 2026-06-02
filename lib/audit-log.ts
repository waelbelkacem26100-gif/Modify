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
    await supabase.from('audit_logs').insert({
      store_id: storeId,
      fix_id: fixId ?? null,
      action,
      details: details ?? null,
      status,
    })
  } catch (e) {
    // Logging must never throw — absorb silently
    console.error('[audit-log] Failed to write log:', e)
  }
}
