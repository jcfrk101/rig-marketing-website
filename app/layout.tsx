import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

// Google Analytics 4 — same property as the directory site (rig-ads-website).
const GA_ID = 'G-01P3D7LMSG'

export const metadata: Metadata = {
  metadataBase: new URL('https://bigrig.app'),
  title: {
    // Homepage title carries the money keywords; child pages brand via the template.
    default: 'RIG | 24/7 Commercial Truck Breakdown, Mobile Diesel Repair, & Fleet Services',
    template: '%s | RIG',
  },
  description:
    'When a truck goes down, RIG dispatches a vetted mobile diesel mechanic 24/7, manages payment, runs the repair to completion, and documents every breakdown and maintenance event.',
  // Search Console URL-prefix property verification (renders the
  // google-site-verification meta tag in <head>).
  verification: {
    google: 'by_ASP5WyU0DTWoqBukb8324hVrbeSVtU4cUUbSOT3Y',
  },
  manifest: '/favicons/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/favicons/apple-touch-icon.png',
    other: [{ rel: 'mask-icon', url: '/favicons/safari-pinned-tab.svg' }],
  },
  openGraph: {
    siteName: 'RIG',
    title: 'RIG — 24/7 Commercial Truck Breakdown & Mobile Diesel Repair',
    description:
      'Dispatching to payment to fulfillment to documentation. RIG executes the whole breakdown response so your fleet keeps moving.',
    type: 'website',
    url: '/',
    images: ['/network-map-usa-v5.png'],
  },
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {/* Organization schema — feeds the brand knowledge panel and sitelinks. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'RIG',
              url: 'https://bigrig.app',
              logo: 'https://bigrig.app/favicons/apple-touch-icon.png',
              description:
                '24/7 commercial truck breakdown dispatch, mobile diesel repair, and fleet maintenance across the U.S.',
              contactPoint: {
                '@type': 'ContactPoint',
                telephone: '+1-855-744-2223',
                contactType: 'customer service',
                availableLanguage: ['English', 'Spanish'],
              },
            }),
          }}
        />
        {children}
        {/* Google tag (gtag.js) */}
        <Script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
      </body>
    </html>
  )
}
