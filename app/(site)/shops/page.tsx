import type { Metadata } from 'next'
import AudienceHero from '@/components/AudienceHero'
import FeatureCards from '@/components/FeatureCards'
import Steps from '@/components/Steps'
import AppCTA from '@/components/AppCTA'
import { shops as c } from '@/data/pages'

export const metadata: Metadata = {
  title: 'Shops & Mechanics — More Truck Repair Jobs, Less Marketing',
  description:
    'RIG connects a nationwide network of local diesel mechanics to truck drivers across the nation — real breakdown jobs without constant marketing spend.',
  alternates: { canonical: '/shops' },
}

export default function ShopsPage() {
  return (
    <>
      <AudienceHero {...c.hero} />
      <FeatureCards eyebrow={c.features.eyebrow} title={c.features.title} items={c.features.items} />
      <Steps {...c.steps} />
      <AppCTA {...c.finalCta} appLinks={c.appLinks} />
    </>
  )
}
