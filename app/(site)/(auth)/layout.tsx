import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/6 blur-[100px] rounded-full pointer-events-none" />

      <header className="relative z-10 flex items-center justify-center pt-8 pb-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Zap className="w-4.5 h-4.5 text-white fill-white" />
          </div>
          <span className="font-syne font-bold text-xl text-text-primary">Modify</span>
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4">
        {children}
      </main>

      <footer className="relative z-10 text-center py-6 text-text-muted text-xs">
        © {new Date().getFullYear()} Modify · Optimisation de conversion Shopify
      </footer>
    </div>
  )
}
