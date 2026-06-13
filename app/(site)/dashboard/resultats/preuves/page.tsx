import { redirect } from 'next/navigation'

// Navigation v6 : la Galerie Impact est désormais embarquée dans 📊 Impact &
// Résultats. L'ancienne sous-route redirige vers son ancre.
export default function PreuvesPage() {
  redirect('/dashboard/resultats#galerie-impact')
}
