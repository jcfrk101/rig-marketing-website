import type { Metadata } from 'next'
import HelpView from '@/components/chat/HelpView'

export const metadata: Metadata = {
  title: 'Get help now — 24/7 diesel truck & RV roadside dispatch',
  description:
    'Broke down? Tell us what happened and where you are — we dispatch vetted diesel mechanics nationwide, with offers by text in minutes.',
  robots: { index: false }, // unlisted while in development
}

export default function HelpPage() {
  return <HelpView />
}
