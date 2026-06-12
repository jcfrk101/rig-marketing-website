import Hero from '@/components/Hero'
import ServiceStats from '@/components/ServiceStats'
import ExecutionFlow from '@/components/ExecutionFlow'
import Differentiators from '@/components/Differentiators'
import FeatureStatus from '@/components/FeatureStatus'
import CTASection from '@/components/CTASection'

export default function Home() {
  return (
    <>
      <Hero />
      <ServiceStats />
      <ExecutionFlow />
      <Differentiators />
      <FeatureStatus />
      <CTASection />
    </>
  )
}
