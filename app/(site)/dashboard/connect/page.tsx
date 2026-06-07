import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase-server'
import StoreConnect from '@/components/dashboard/StoreConnect'

export default async function ConnectPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = await createServiceRoleClient()
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .single()

  // Si boutique déjà connectée, aller direct au dashboard
  if (store) redirect('/dashboard')

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-syne font-bold text-2xl text-text-primary mb-1">
          Connecter votre boutique
        </h1>
        <p className="text-text-secondary text-sm">
          Liez votre boutique Shopify pour démarrer l&apos;analyse de conversion.
        </p>
      </div>
      <StoreConnect />
    </div>
  )
}
