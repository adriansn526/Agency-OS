import { SettingsForm } from '@/components/accounting/settings-form'
import { RulesTable } from '@/components/accounting/rules-table'
import { CategoriesManager } from '@/components/accounting/categories-manager'

export const metadata = {
  title: 'Setări Contabile & Fiscale',
}

export default function AccountingSettingsPage() {
  return (
    <div className="flex flex-col gap-8 p-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Setări Contabile</h1>
        <p className="text-muted-foreground mt-2">
          Gestionează regimul fiscal, cotele de TVA, categoriile și regulile de deductibilitate.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 items-start">
        <SettingsForm />
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Categorii de Cheltuieli</h2>
          <p className="text-muted-foreground mt-1">
            Gestionează nomenclatorul de categorii și unifică duplicatele.
          </p>
        </div>
        <CategoriesManager />
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
