import { redirect } from 'next/navigation'

// Navigation v2 : /dashboard/fixes → ⚡ Corrections.
export default function FixesPage() {
  redirect('/dashboard/corrections')
}
