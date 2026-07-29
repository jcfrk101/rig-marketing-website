import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

// Google Analytics 4 — same property as the directory site (rig-ads-website).
const GA_ID = 'G-01P3D7LMSG'

export const metadata: Metadata = {
  title: {
    default: 'RIG App',
    template: '%s · RIG App',
  },
  description:
    'When a truck goes down, Rig books the service, manages payment, runs the repair to completion, and documents every breakdown and maintenance event.',
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
    title: 'RIG App',
    description:
      'Dispatching to payment to fulfillment to documentation. Rig executes the whole breakdown response so your fleet keeps moving.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Nav />
        <main>{children}</main>
        <Footer />
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
