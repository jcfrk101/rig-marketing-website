import type { Metadata } from 'next'
import AudienceHero from '@/components/AudienceHero'
import FeatureCards from '@/components/FeatureCards'
import Steps from '@/components/Steps'
import AppCTA from '@/components/AppCTA'
import { shops as c } from '@/data/pages'

export const metadata: Metadata = {
  title: 'Rig for Shops & Mechanics — More jobs, less marketing',
  description:
    'Rig connects a nationwide network of local mechanics to truck drivers across the nation — access clients without constant marketing.',
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
