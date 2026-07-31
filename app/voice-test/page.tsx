import type { Metadata } from 'next'
import Script from 'next/script'
import { notFound } from 'next/navigation'

// Local playground for the ElevenLabs voice widget — dev-only: any production
// build (staging included) 404s this route, so it can't leak.
export const metadata: Metadata = {
  title: 'Voice widget test',
  robots: { index: false },
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'agent-id': string
      }
    }
  }
}

export default function VoiceTestPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-rig-navy-deep text-white">
      <h1 className="text-2xl font-bold">ElevenLabs voice widget playground</h1>
      <p className="max-w-md text-center text-sm text-white/60">
        Dev-only page. The widget floats bottom-right — agent{' '}
        <code className="text-rig-green">agent_2301kyr1y286fm3vryvpng4p8sa7</code>. Compare it against{' '}
        <a href="/help" className="text-rig-green underline">
          /help
        </a>
        .
      </p>
      <elevenlabs-convai agent-id="agent_2301kyr1y286fm3vryvpng4p8sa7"></elevenlabs-convai>
      <Script src="https://unpkg.com/@elevenlabs/convai-widget-embed" async type="text/javascript" strategy="afterInteractive" />
    </div>
  )
}
