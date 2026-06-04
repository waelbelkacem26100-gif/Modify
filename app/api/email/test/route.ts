import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { buildWeeklyReport } from '@/lib/weekly-report'
import { sendWeeklyReport } from '@/lib/email'
import type { Store } from '@/types'

export const maxDuration = 60

// POST: send the weekly report preview to the signed-in user's email now.
export async function POST() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()
  const { data: storeRow } = await supabase
    .from('stores').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(1).single()
  if (!storeRow) return NextResponse.json({ error: 'No store connected' }, { status: 404 })

  let email: string | null = null
  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    email = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress
      ?? user.emailAddresses[0]?.emailAddress ?? null
  } catch {
    email = null
  }
  if (!email) return NextResponse.json({ error: 'Adresse email introuvable' }, { status: 400 })

  const report = await buildWeeklyReport(storeRow as Store, supabase)
  const ok = await sendWeeklyReport(email, report)
  if (!ok) {
    return NextResponse.json({ error: 'Envoi impossible — RESEND_API_KEY manquante ou invalide.' }, { status: 502 })
  }
  return NextResponse.json({ success: true, email })
}
