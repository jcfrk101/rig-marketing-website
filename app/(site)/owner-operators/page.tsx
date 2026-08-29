import type { Metadata } from 'next'
import AudienceHero from '@/components/AudienceHero'
import FeatureCards from '@/components/FeatureCards'
import Steps from '@/components/Steps'
import CallCallout from '@/components/CallCallout'
import AppCTA from '@/components/AppCTA'
import { ownerOperators as c } from '@/data/pages'

export const metadata: Metadata = {
  title: 'Owner-Operators — 24/7 Breakdown Help That Gets You Back on the Road',
  description:
    'RIG connects short and long haul truck drivers with a nationwide network of reputable mobile diesel mechanics, wherever and whenever you break down.',
  alternates: { canonical: '/owner-operators' },
}

export default function OwnerOperatorsPage() {
  return (
    <>
      <AudienceHero {...c.hero} />
      <FeatureCards eyebrow={c.services.eyebrow} title={c.services.title} items={c.services.items} />
      <Steps {...c.steps} />
      <CallCallout {...c.callout} />
      <AppCTA {...c.finalCta} appLinks={c.appLinks} />
    </>
  )
}
