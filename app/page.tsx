import Link from 'next/link'
import BikeHighlights from '@/components/BikeHighlights'

const steps = [
  {
    title: '1. Vyberte kolo',
    text: 'Prohlédněte si galerii gravel kol a vyberte si to pravé pro vaše dobrodružství.',
  },
  {
    title: '2. Zarezervujte termín',
    text: 'V kalendáři uvidíte, kdy je kolo volné. Vyberte datum a vyplňte kontaktní údaje.',
  },
  {
    title: '3. Vyrazte na cestu',
    text: 'Po potvrzení rezervace a platbě si kolo vyzvednete a můžete vyrazit.',
  },
]

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-brand-primary">
        <div className="container-page grid items-center gap-8 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-brand-dark/70">
              Půjčovna gravel kol
            </p>
            <h1 className="mt-3 text-4xl font-black leading-tight text-brand-dark md:text-5xl">
              Objevte svět gravelu. Bez starostí o kolo.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-brand-dark/80">
              Půjčíme vám špičková gravel kola značek Cannondale, Ridley, Rondo a Superior.
              Rezervujte online, vyzvedněte na prodejně a vyražte na šotolinu.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/galerie" className="btn-dark">
                Rezervovat kolo
              </Link>
              <Link href="/jak-to-funguje" className="btn-outline">
                Jak to funguje
              </Link>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="rounded-lg bg-white/60 p-8 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-widest text-brand-secondary">
                Proč si půjčit u nás?
              </p>
              <ul className="mt-4 space-y-3 text-brand-dark">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-secondary" />
                  Špičková gravel kola v perfektním stavu
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-secondary" />
                  Online rezervace s přehledným kalendářem
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-secondary" />
                  Půjčení i vrácení o víkendech a svátcích
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-secondary" />
                  Slevy při delší výpůjčce
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Jak to funguje */}
      <section className="container-page py-16">
        <h2 className="text-center text-3xl font-black text-brand-dark">Jak to funguje</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-gray-600">
          Rezervace gravel kola je jednoduchá a zvládnete ji za pár minut.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.title} className="card p-6">
              <h3 className="text-lg font-bold text-brand-dark">{step.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Nabídka kol */}
      <section className="bg-gray-50 py-16">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black text-brand-dark">Naše gravel kola</h2>
              <p className="mt-2 text-gray-600">Vyberte si z aktuální nabídky.</p>
            </div>
            <Link href="/galerie" className="btn-secondary">
              Zobrazit všechny
            </Link>
          </div>
          <BikeHighlights />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-dark py-16 text-white">
        <div className="container-page text-center">
          <h2 className="text-3xl font-black">Připraveni vyrazit?</h2>
          <p className="mx-auto mt-2 max-w-xl text-gray-300">
            Podívejte se na dostupná kola a zarezervujte si svůj termín ještě dnes.
          </p>
          <Link href="/galerie" className="btn-primary mt-6">
            Zobrazit galerii kol
          </Link>
        </div>
      </section>
    </>
  )
}