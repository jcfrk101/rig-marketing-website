import type { Metadata } from 'next'
import AudienceHero from '@/components/AudienceHero'
import FeatureCards from '@/components/FeatureCards'
import Steps from '@/components/Steps'
import CallCallout from '@/components/CallCallout'
import AppCTA from '@/components/AppCTA'
import { ownerOperators as c } from '@/data/pages'

export const metadata: Metadata = {
  title: 'Rig for Owner-Operators — We get you back on the road',
  description:
    'Rig connects short and long haul truck drivers with a nationwide network of reputable mechanics, wherever and whenever you need.',
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
