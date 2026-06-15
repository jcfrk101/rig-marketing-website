interface StepsProps {
  eyebrow: string
  title: string
  items: string[]
}

export default function Steps({ eyebrow, title, items }: StepsProps) {
  return (
    <section className="bg-rig-navy/[0.03] py-16 sm:py-24">
      <div className="container-rig">
        <div className="max-w-2xl">
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="section-title">{title}</h2>
        </div>

        <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          {items.map((item, i) => (
            <li key={i} className="rounded-2xl border border-rig-navy/10 bg-white p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rig-green/15 text-sm font-bold text-rig-green-dark">
                {i + 1}
              </span>
              <p className="mt-4 text-sm leading-relaxed text-rig-navy/80">{item}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
