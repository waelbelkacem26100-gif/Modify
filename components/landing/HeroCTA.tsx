'use client'

import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { ArrowRight } from 'lucide-react'

export default function HeroCTA() {
  const { isSignedIn } = useUser()
  const ctaHref = isSignedIn ? '/dashboard/connect' : '/sign-up'

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
      <Link
        href={ctaHref}
        className="group inline-flex items-center gap-2.5 px-8 py-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all duration-200 text-[15px] shadow-lg hover:shadow-primary/25 hover:shadow-2xl hover:-translate-y-0.5"
      >
        Connecter ma boutique Shopify
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </Link>
      <p className="text-text-muted text-sm">
        14 jours gratuits · Sans carte bancaire
      </p>
    </div>
  )
}
