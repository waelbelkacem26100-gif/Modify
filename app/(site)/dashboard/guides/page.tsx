import { redirect } from 'next/navigation'

// Navigation v2 : /dashboard/guides → 🤝 Accompagnement (onglet Guides).
export default function GuidesPage() {
  redirect('/dashboard/accompagnement')
}
