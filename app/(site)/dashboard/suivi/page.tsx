import { redirect } from 'next/navigation'

// Navigation v2 : /dashboard/suivi → 📊 Résultats.
export default function SuiviPage() {
  redirect('/dashboard/resultats')
}
