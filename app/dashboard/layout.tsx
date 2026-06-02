import Sidebar from '@/components/dashboard/Sidebar'
import MobileNav from '@/components/dashboard/MobileNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar — hidden on mobile */}
      <Sidebar />
      {/* Main content — add bottom padding on mobile for the fixed bottom nav */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 min-w-0">
        {children}
      </main>
      {/* Mobile bottom navigation */}
      <MobileNav />
    </div>
  )
}
