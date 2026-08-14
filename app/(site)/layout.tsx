import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import ChatLauncher from '@/components/chat/ChatLauncher'

// Marketing chrome (nav + footer) wraps every page in this group.
// Standalone experiences like /help live outside it.
// The chat launcher rides the layout so it's on EVERY marketing page, and an
// in-progress conversation (sessionStorage) survives navigation.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main>{children}</main>
      <Footer />
      <ChatLauncher />
    </>
  )
}
