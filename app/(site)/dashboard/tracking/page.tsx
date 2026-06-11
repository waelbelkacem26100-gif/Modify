import { redirect } from 'next/navigation'

// Superseded by /dashboard/suivi (a richer duplicate). Hidden via redirect; the
// original implementation is kept intact in ./_legacy.tsx for future reuse.
export default function TrackingPage() {
  redirect('/dashboard/suivi')
}
