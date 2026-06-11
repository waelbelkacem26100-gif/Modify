import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { buildMonthlyReport } from '@/lib/monthly-report'
import { sendMonthlyReport } from '@/lib/email'
import { isTokenExpired } from '@/lib/shopify-token'
import { logAction } from '@/lib/audit-log'
import type { Store } from '@/types'

export const maxDuration = 300

async function emailForUser(userId: string): Promise<string | null> {
  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    return user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress
      ?? user.emailAddresses[0]?.emailAddress ?? null
  } catch {
    return null
  }
}

// 1st of each month: a complete monthly recap email per store.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = await createServiceRoleClient()
  const { data: stores } = await supabase.from('stores').select('*')
  if (!stores?.length) return NextResponse.json({ stores: 0 })

  let sent = 0, skipped = 0
  for (const store of stores as Store[]) {
    if (isTokenExpired(store)) { skipped++; continue }
    const email = await emailForUser(store.user_id)
    if (!email) { skipped++; continue }
    try {
      const report = await buildMonthlyReport(store, supabase)
      const ok = await sendMonthlyReport(email, report)
      if (ok) { sent++; await logAction(supabase, store.id, 'monthly_report_sent', { email, recovered: report.monthRecovered }, 'success') }
      else skipped++
    } catch (e) {
      skipped++
      console.error('[monthly-report] failed for', store.shop_domain, String(e))
    }
  }

  return NextResponse.json({ stores: stores.length, sent, skipped })
}
