import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import BudgetForm from '../BudgetForm'

export const dynamic = 'force-dynamic'

export default async function NewBudgetPage() {
  const supabase = await createClient()
  const { data: assets } = await supabase.from('assets').select('id, name, asset_tag').order('name')

  return (
    <div>
      <Header title="Add Budget" subtitle="Create a new budget for maintenance or capital planning" />
      <div className="p-6">
        <BudgetForm assets={assets ?? []} />
      </div>
    </div>
  )
}
