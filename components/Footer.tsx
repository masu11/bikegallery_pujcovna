import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-brand-dark text-white">
      <div className="container-page grid gap-8 py-12 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded bg-brand-primary text-lg font-black text-black">
              BG
            </span>
            <span className="text-lg font-bold">Bike Gallery Půjčovna</span>
          </div>
          <p className="mt-3 text-sm text-gray-300">
            Půjčovna gravel kol. Rezervujte si kolo online a vyražte na dobrodružství.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-brand-primary">Navigace</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-300">
            <li><Link href="/" className="hover:text-white">Úvod</Link></li>
            <li><Link href="/galerie" className="hover:text-white">Galerie kol</Link></li>
            <li><Link href="/jak-to-funguje" className="hover:text-white">Jak to funguje</Link></li>
            <li><Link href="/kontakt" className="hover:text-white">Kontakt</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-brand-primary">Kontakt</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-300">
            <li>Bike Gallery</li>
            <li>Otevřeno Po–So</li>
            <li>E-mail: info@bikegallery.cz</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4">
        <div className="container-page flex flex-col items-center justify-between gap-2 text-xs text-gray-400 sm:flex-row">
          <span>© {new Date().getFullYear()} Bike Gallery Půjčovna</span>
          <div className="flex gap-4">
            <Link href="/ochrana-osobnich-udaju" className="hover:text-white">Ochrana osobních údajů</Link>
            <Link href="/obchodni-podminky" className="hover:text-white">Obchodní podmínky</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}