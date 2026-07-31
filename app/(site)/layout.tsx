import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

// Marketing chrome (nav + footer) wraps every page in this group.
// Standalone experiences like /help live outside it.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main>{children}</main>
      <Footer />
    </>
  )
}
