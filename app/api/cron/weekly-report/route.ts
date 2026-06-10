import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { buildWeeklyReport } from '@/lib/weekly-report'
import { sendWeeklyReport, sendApprovalEmail } from '@/lib/email'
import { snapshotStoreScore } from '@/lib/store-score'
import { isTokenExpired, getValidAccessToken } from '@/lib/shopify-token'
import { logAction } from '@/lib/audit-log'
import { readStoreMode } from '@/lib/store-mode'
import { applyPendingFixesForStore, getPendingFixes } from '@/lib/apply-pending'
import { signApprovalToken } from '@/lib/approval-token'
import type { Store } from '@/types'

export const maxDuration = 300

async function emailForUser(userId: string): Promise<string | null> {
  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
    return primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null
  } catch (e) {
    console.error('[weekly-report] clerk lookup failed for', userId, String(e))
    return null
  }
}

// Weekly: email each merchant a €-focused summary of what Modify did.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = await createServiceRoleClient()
  const { data: stores, error } = await supabase.from('stores').select('*')
  if (error || !stores?.length) {
    return NextResponse.json({ stores: 0, error: error?.message })
  }

  let sent = 0
  let skipped = 0
  for (const store of stores as Store[]) {
    // Skip stores with a dead token that can't be refreshed.
    if (isTokenExpired(store)) { skipped++; continue }
    await getValidAccessToken(store, supabase) // refresh server-side if expiring

    // Weekly score snapshot so the evolution chart always has a fresh point,
    // even for merchants who don't run manual scans.
    try { await snapshotStoreScore(store, supabase) } catch (e) { console.error('snapshot failed', String(e)) }

    const email = await emailForUser(store.user_id)
    if (!email) { skipped++; continue }
    try {
      const mode = readStoreMode(store)
      const shopName = store.shop_name ?? store.shop_domain
      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`

      if (mode === 'approval') {
        // Approval mode: email the pending list with a 1-click approve link.
        const pending = await getPendingFixes(store, supabase)
        if (pending.length > 0) {
          const token = signApprovalToken(store.id)
          const approveUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/fixes/approve?token=${encodeURIComponent(token ?? '')}`
          const totalEuros = pending.reduce((s, f) => s + f.impact_euros, 0)
          const ok = await sendApprovalEmail(email, {
            shopName,
            fixes: pending.map((f) => ({ title: f.title, impact_euros: f.impact_euros })),
            totalEuros, approveUrl, dashboardUrl,
          })
          if (ok) { sent++; await logAction(supabase, store.id, 'approval_email_sent', { email, pending: pending.length }, 'success') }
          else skipped++
          continue
        }
        // Nothing to approve → fall through to the regular weekly recap.
      } else {
        // Auto mode: apply everything before sending the recap.
        const r = await applyPendingFixesForStore(store, supabase)
        if (r.applied || r.failed) {
          await logAction(supabase, store.id, 'auto_fixes_applied', { applied: r.applied, failed: r.failed }, r.failed ? 'warning' : 'success')
        }
      }

      const report = await buildWeeklyReport(store, supabase)
      const ok = await sendWeeklyReport(email, report)
      if (ok) {
        sent++
        await logAction(supabase, store.id, 'weekly_report_sent', { email, recovered: report.recoveredEuros }, 'success')
      } else {
        skipped++
      }
    } catch (e) {
      skipped++
      console.error('[weekly-report] failed for', store.shop_domain, String(e))
    }
  }

  return NextResponse.json({ stores: stores.length, sent, skipped })
}
