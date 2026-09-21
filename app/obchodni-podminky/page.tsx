export default function TermsPage() {
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-black text-brand-dark">Obchodní podmínky</h1>
      <div className="prose mt-6 max-w-3xl space-y-4 text-gray-700">
        <h2 className="text-lg font-bold text-brand-dark">1. Rezervace</h2>
        <p>
          Rezervace kola probíhá prostřednictvím rezervačního systému na tomto webu.
          Odesláním formuláře vytváříte požadavek na rezervaci, který je potvrzen
          provozovatelem e-mailem.
        </p>
        <h2 className="text-lg font-bold text-brand-dark">2. Platba</h2>
        <p>
          Po potvrzení rezervace obdržíte e-mail s QR kódem na platbu bankovním převodem.
          Termín je definitivně obsazený až po připsání platby na účet.
        </p>
        <h2 className="text-lg font-bold text-brand-dark">3. Půjčení a vrácení</h2>
        <p>
          Kolo si vyzvednete v domluvený den na prodejně. Vrácení je možné i o víkendech
          a svátcích po předchozí domluvě.
        </p>
        <h2 className="text-lg font-bold text-brand-dark">4. Storno</h2>
        <p>
          Storno rezervace je možné do 48 hodin před začátkem výpůjčky. Více informací
          vám poskytneme na e-mailu.
        </p>
      </div>
    </div>
  )
}