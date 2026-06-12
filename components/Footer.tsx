import Logo from './Logo'
import { footer, brand } from '@/data/content'

export default function Footer() {
  return (
    <footer className="bg-rig-navy-deep text-white">
      <div className="container-rig grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-white/60">{footer.tagline}</p>
        </div>

        {footer.columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50">{col.title}</h3>
            <ul className="mt-4 space-y-3">
              {col.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-sm text-white/80 transition hover:text-rig-green">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="container-rig flex flex-col gap-2 py-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} {brand.name}. All rights reserved.</span>
          <span>Built for fleets that can’t afford downtime.</span>
        </div>
      </div>
    </footer>
  )
}
