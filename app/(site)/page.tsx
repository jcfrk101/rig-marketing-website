import type { Metadata } from 'next'
import AnnouncementBar from '@/components/AnnouncementBar'
import Hero from '@/components/Hero'
import NetworkCoverage from '@/components/NetworkCoverage'
import ServiceStats from '@/components/ServiceStats'
import ExecutionFlow from '@/components/ExecutionFlow'
import Differentiators from '@/components/Differentiators'
import FeatureStatus from '@/components/FeatureStatus'
import CTASection from '@/components/CTASection'

// Title comes from the root default (the full keyword title, no template suffix).
export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

export default function Home() {
  return (
    <>
      <AnnouncementBar />
      <Hero />
      <NetworkCoverage />
      <ServiceStats />
      <ExecutionFlow />
      <Differentiators />
      <FeatureStatus />
      <CTASection />
    </>
  )
}
