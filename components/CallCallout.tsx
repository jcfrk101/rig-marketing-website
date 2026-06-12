interface CallCalloutProps {
  title: string
  subtitle: string
  phone: string
  href: string
}

export default function CallCallout({ title, subtitle, phone, href }: CallCalloutProps) {
  return (
    <section className="bg-rig-green py-14">
      <div className="container-rig flex flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left">
        <div>
          <h2 className="text-2xl font-bold text-rig-navy-deep">{title}</h2>
          <p className="mt-1 text-rig-navy-deep/70">{subtitle}</p>
        </div>
        <a
          href={href}
          className="inline-flex items-center gap-2 rounded-full bg-rig-navy-deep px-7 py-4 text-lg font-bold text-white transition hover:bg-rig-navy"
        >
          {phone}
        </a>
      </div>
    </section>
  )
}
