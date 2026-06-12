import { redirect } from 'next/navigation'

// Navigation v2 : l'audit est fusionné dans 🔍 Analyse (/dashboard).
export default function AuditPage() {
  redirect('/dashboard')
}
