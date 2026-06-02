import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function DELETE() {
  const { userId } = await auth()
  if (!userId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createServiceRoleClient()

  const { error } = await supabase
    .from('stores')
    .delete()
    .eq('user_id', userId)

  if (error) {
    console.error('[disconnect] Failed to delete store:', error)
    return NextResponse.json({ error: 'Failed to disconnect store' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
