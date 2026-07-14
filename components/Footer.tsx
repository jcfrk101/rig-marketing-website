import Logo from './Logo'
import { footer, brand } from '@/data/content'
import { directoryStates, directoryCorridors, DIRECTORY_ROOT } from '@/data/directory'

export default function Footer() {
  return (
    <footer className="bg-rig-navy-deep text-white">
      <div className="container-rig grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-white/60">{footer.tagline}</p>
          <a
            href={footer.phone.href}
            className="mt-3 inline-block py-1.5 text-sm font-semibold text-rig-green transition hover:text-white"
          >
            {footer.phone.label}
          </a>
        </div>

        {footer.columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50">{col.title}</h3>
            <ul className="mt-3 space-y-1">
              {col.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="inline-block py-1.5 text-sm text-white/80 transition hover:text-rig-green">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* SEO directory — links into www.bigrig.app/semi-truck-repair */}
      <div className="border-t border-white/10">
        <div className="container-rig py-10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50">
              {footer.directory.title}
            </h3>
            <a href={DIRECTORY_ROOT} className="inline-block py-1.5 text-sm font-semibold text-rig-green transition hover:text-white">
              {footer.directory.browseAll} →
            </a>
          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-white/40">
            {footer.directory.corridorsTitle}
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-5">
            {directoryCorridors.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="inline-block py-1.5 text-sm text-white/70 transition hover:text-rig-green">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-white/40">
            {footer.directory.statesTitle}
          </p>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {directoryStates.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="inline-block py-1.5 text-sm text-white/70 transition hover:text-rig-green">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
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
