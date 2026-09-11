import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import BudgetForm from '../../BudgetForm'
import { notFound } from 'next/navigation'
import { ASSET_PICKER_COLUMNS } from '@/lib/assetPicker'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditBudgetPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: budget }, { data: assets }] = await Promise.all([
    supabase.from('budgets').select('*').eq('id', id).single(),
    supabase.from('assets').select(ASSET_PICKER_COLUMNS).order('name'),
  ])

  if (!budget) notFound()

  return (
    <div>
      <Header title="Edit Budget" subtitle={budget.name} />
      <div className="p-6">
        <BudgetForm assets={assets ?? []} budget={budget} />
      </div>
    </div>
  )
}
