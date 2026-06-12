'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from './Logo'
import { nav } from '@/data/content'

export default function Nav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-rig-navy-deep/90 backdrop-blur">
      <div className="container-rig flex h-16 items-center justify-between">
        <Link href="/" aria-label="Rig home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {nav.links.map((link) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`text-sm font-medium transition ${
                  active ? 'text-rig-green' : 'text-white/70 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <a href={nav.cta.href} className="btn-primary">
          {nav.cta.label}
        </a>
      </div>
    </header>
  )
}
