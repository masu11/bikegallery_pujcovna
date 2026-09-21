export default function ContactPage() {
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-black text-brand-dark">Kontakt</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Máte dotaz k rezervaci nebo půjčovně? Napište nám nebo se zastavte na prodejně.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <div className="card p-6">
          <h2 className="text-lg font-bold text-brand-dark">Prodejna</h2>
          <p className="mt-2 text-sm text-gray-600">
            Bike Gallery
            <br />
            Adresa prodejny
            <br />
            PSČ Město
          </p>
        </div>
        <div className="card p-6">
          <h2 className="text-lg font-bold text-brand-dark">Otevírací doba</h2>
          <p className="mt-2 text-sm text-gray-600">
            Po–Pá: 10:00–18:00
            <br />
            So: 9:00–12:00
            <br />
            Ne: zavřeno
          </p>
        </div>
        <div className="card p-6">
          <h2 className="text-lg font-bold text-brand-dark">Kontaktní údaje</h2>
          <p className="mt-2 text-sm text-gray-600">
            E-mail: info@bikegallery.cz
            <br />
            Telefon: +420 000 000 000
          </p>
        </div>
      </div>
    </div>
  )
}