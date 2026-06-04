import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { buildWeeklyReport } from '@/lib/weekly-report'
import { sendWeeklyReport } from '@/lib/email'
import { snapshotStoreScore } from '@/lib/store-score'
import { logAction } from '@/lib/audit-log'
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
    // Weekly score snapshot so the evolution chart always has a fresh point,
    // even for merchants who don't run manual scans.
    try { await snapshotStoreScore(store, supabase) } catch (e) { console.error('snapshot failed', String(e)) }

    const email = await emailForUser(store.user_id)
    if (!email) { skipped++; continue }
    try {
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
