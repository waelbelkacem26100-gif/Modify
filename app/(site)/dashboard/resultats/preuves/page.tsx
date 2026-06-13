import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import ProofsContent from '@/components/proofs/ProofsContent'

// 📸 Preuves — sous-section de 📊 Résultats (pas un 5e item de navigation).
export default async function PreuvesPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  return <ProofsContent />
}
