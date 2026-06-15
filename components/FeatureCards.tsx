interface FeatureCardsProps {
  eyebrow: string
  title: string
  items: { title: string; copy: string }[]
}

export default function FeatureCards({ eyebrow, title, items }: FeatureCardsProps) {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="container-rig">
        <div className="max-w-2xl">
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="section-title">{title}</h2>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.title} className="rounded-2xl border border-rig-navy/10 p-6">
              <div className="mb-4 h-1 w-10 rounded-full bg-rig-green" />
              <h3 className="text-lg font-semibold text-rig-navy">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-rig-navy/60">{item.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
