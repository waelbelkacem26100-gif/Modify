import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export const maxDuration = 60

// Daily safety net (Hobby plan allows daily crons only). The image job runs as a
// self-chaining sequence of /api/fixes/generate-images calls; if a chain ever
// stalls (a step crashed before triggering the next), this resumes any fix still
// stuck in 'generating' by kicking the chain again. Steady-state, it's a no-op.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = await createServiceRoleClient()
  const { data: stuck } = await supabase
    .from('fixes').select('id').eq('status', 'generating').limit(20)

  const jobs = (stuck ?? []) as { id: string }[]
  const origin = request.nextUrl.origin

  await Promise.all(jobs.map((f) =>
    fetch(`${origin}/api/fixes/generate-images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-modify-internal': process.env.CRON_SECRET ?? '' },
      body: JSON.stringify({ fix_id: f.id }),
    }).catch(() => {})
  ))

  return NextResponse.json({ resumed: jobs.length })
}
