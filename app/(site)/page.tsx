import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import HowItWorks from '@/components/landing/HowItWorks'
import Automation from '@/components/landing/Automation'
import Results from '@/components/landing/Results'
import Pricing from '@/components/landing/Pricing'
import Faq from '@/components/landing/Faq'
import FinalCTA from '@/components/landing/FinalCTA'
import Footer from '@/components/landing/Footer'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Automation />
      <Results />
      <Pricing />
      <Faq />
      <FinalCTA />
      <Footer />
    </main>
  )
}
