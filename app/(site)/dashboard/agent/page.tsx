import { redirect } from 'next/navigation'

// Navigation v2 : /dashboard/agent → 🤝 Accompagnement (agent = interface principale).
export default function AgentPage() {
  redirect('/dashboard/accompagnement')
}
