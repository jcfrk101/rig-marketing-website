import Hero from '@/components/Hero'
import NetworkCoverage from '@/components/NetworkCoverage'
import ServiceStats from '@/components/ServiceStats'
import ExecutionFlow from '@/components/ExecutionFlow'
import Differentiators from '@/components/Differentiators'
import FeatureStatus from '@/components/FeatureStatus'
import CTASection from '@/components/CTASection'

export default function Home() {
  return (
    <>
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
