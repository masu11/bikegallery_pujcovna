import Link from 'next/link'

const steps = [
  {
    title: '1. Vyberte kolo',
    text: 'V galerii si prohlédněte dostupná gravel kola. Každé kolo má své varianty (barva, velikost) a cenu za den.',
  },
  {
    title: '2. Zkontrolujte dostupnost',
    text: 'V kalendáři u kola uvidíte, kdy je volné (bílé), rezervované (žluté) nebo obsazené (červené). Vyberte termín půjčení.',
  },
  {
    title: '3. Vyplňte údaje',
    text: 'Do košíku přidejte kolo a vyplňte jméno, e-mail, telefon a adresu. Odesláním vytvoříte nezávazný požadavek.',
  },
  {
    title: '4. Potvrzení rezervace',
    text: 'Rezervaci zkontrolujeme a potvrdíme. Na e-mail vám přijde potvrzení s QR kódem na platbu.',
  },
  {
    title: '5. Platba',
    text: 'Zaplatíte bankovním převodem přes QR kód. Po připsání platby je termín definitivně obsazený.',
  },
  {
    title: '6. Vyzvednutí a jízda',
    text: 'Kolo si vyzvednete na prodejně v domluvený den. Půjčení i vrácení je možné i o víkendech a svátcích.',
  },
]

export default function HowItWorksPage() {
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-black text-brand-dark">Jak to funguje</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Rezervace gravel kola je jednoduchá. Postupujte podle následujících kroků.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {steps.map((step) => (
          <div key={step.title} className="card p-6">
            <h2 className="text-lg font-bold text-brand-dark">{step.title}</h2>
            <p className="mt-2 text-sm text-gray-600">{step.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-lg bg-brand-primary p-8 text-center">
        <h2 className="text-2xl font-black text-brand-dark">Připraveni vyrazit?</h2>
        <p className="mt-2 text-brand-dark/80">Podívejte se na dostupná kola.</p>
        <Link href="/galerie" className="btn-dark mt-4">
          Zobrazit galerii kol
        </Link>
      </div>
    </div>
  )
}