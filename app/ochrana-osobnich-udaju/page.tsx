export default function PrivacyPage() {
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-black text-brand-dark">Ochrana osobních údajů</h1>
      <div className="prose mt-6 max-w-3xl space-y-4 text-gray-700">
        <p>
          Tento dokument popisuje, jakým způsobem zpracováváme osobní údaje v souvislosti
          s rezervacemi v půjčovně gravel kol.
        </p>
        <h2 className="text-lg font-bold text-brand-dark">Jaké údaje zpracováváme</h2>
        <p>
          Pro vyřízení rezervace zpracováváme: jméno a příjmení, e-mailovou adresu, telefon,
          adresu a případnou poznámku k rezervaci.
        </p>
        <h2 className="text-lg font-bold text-brand-dark">Účel zpracování</h2>
        <p>
          Údaje zpracováváme výhradně za účelem vyřízení a správy rezervace a komunikace
          s vámi v souvislosti s půjčovnou.
        </p>
        <h2 className="text-lg font-bold text-brand-dark">Doba uchování</h2>
        <p>
          Osobní údaje uchováváme po dobu nezbytnou k vyřízení rezervace a po dobu stanovenou
          právními předpisy (zejména pro účetní účely).
        </p>
        <h2 className="text-lg font-bold text-brand-dark">Vaše práva</h2>
        <p>
          Máte právo na přístup k údajům, jejich opravu, výmaz, omezení zpracování a právo
          vznést námitku. Kontaktujte nás na e-mailu info@bikegallery.cz.
        </p>
      </div>
    </div>
  )
}