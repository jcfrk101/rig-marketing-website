import Script from 'next/script'

// ElevenLabs conversational-AI widget — renders its own floating chat button.
// The <elevenlabs-convai> custom element is upgraded by the embed script.
const AGENT_ID = 'agent_2301kyr1y286fm3vryvpng4p8sa7'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'agent-id': string
      }
    }
  }
}

export default function ChatWidget() {
  return (
    <>
      <elevenlabs-convai agent-id={AGENT_ID}></elevenlabs-convai>
      <Script src="https://unpkg.com/@elevenlabs/convai-widget-embed" async type="text/javascript" strategy="afterInteractive" />
    </>
  )
}
