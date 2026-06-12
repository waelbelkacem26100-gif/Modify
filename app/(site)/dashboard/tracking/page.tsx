import { redirect } from 'next/navigation'

// Superseded by /dashboard/resultats. The original implementation is kept
// intact in ./_legacy.tsx for future reuse.
export default function TrackingPage() {
  redirect('/dashboard/resultats')
}
