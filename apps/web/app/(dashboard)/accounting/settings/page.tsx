import { SettingsForm } from '@/components/accounting/settings-form'
import { RulesTable } from '@/components/accounting/rules-table'

export const metadata = {
  title: 'Setări Contabile & Fiscale',
}

export default function AccountingSettingsPage() {
  return (
    <div className="flex flex-col gap-8 p-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Setări Contabile</h1>
        <p className="text-muted-foreground mt-2">
          Gestionează regimul fiscal, cotele de TVA și regulile de deductibilitate. 
          Toate modificările păstrează un istoric strict pentru a nu afecta rapoartele din lunile trecute.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 items-start">
        <SettingsForm />
        
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-amber-700 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            Informație Orientativă
          </h3>
          <p className="text-sm text-amber-700/90">
            Toate cifrele de taxe produse de acest modul sunt <strong>estimări orientative</strong>, 
            nu constituie calcul fiscal cu valoare legală. Sursa de adevăr rămâne contabilul autorizat.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Reguli de Deductibilitate</h2>
          <p className="text-muted-foreground mt-1">
            Configurează cum sunt recunoscute cheltuielile și TVA-ul în funcție de furnizor sau categorie.
          </p>
        </div>
        
        <RulesTable />
      </div>
    </div>
  )
}
