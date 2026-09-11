import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import BudgetForm from '../BudgetForm'
import { ASSET_PICKER_COLUMNS } from '@/components/AssetPicker'

export const dynamic = 'force-dynamic'

export default async function NewBudgetPage() {
  const supabase = await createClient()
  const { data: assets } = await supabase.from('assets').select(ASSET_PICKER_COLUMNS).order('name')

  return (
    <div>
      <Header title="Add Budget" subtitle="Create a new budget for maintenance or capital planning" />
      <div className="p-6">
        <BudgetForm assets={assets ?? []} />
      </div>
    </div>
  )
}
