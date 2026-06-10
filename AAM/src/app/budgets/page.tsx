import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { Plus, DollarSign, TrendingUp } from 'lucide-react'
import { StatCard } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import BudgetsClient from './BudgetsClient'

export const dynamic = 'force-dynamic'

export default async function BudgetsPage() {
  const supabase = await createClient()
  const currentYear = new Date().getFullYear()

  const [{ data: budgets }, { data: assets }] = await Promise.all([
    supabase.from('budgets').select('*, assets(id, name, asset_tag)').order('fiscal_year', { ascending: false }),
    supabase.from('assets').select('id, name, asset_tag').order('name'),
  ])

  const currentYearBudgets = budgets?.filter((b) => b.fiscal_year === currentYear) ?? []
  const totalPlanned = currentYearBudgets.reduce((sum, b) => sum + (b.planned_amount ?? 0), 0)

  return (
    <div>
      <Header
        title="Budget Tracking"
        subtitle="Manage maintenance and capital budgets by year"
        actions={
          <Link
            href="/budgets/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Budget
          </Link>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Budgets"
            value={budgets?.length ?? 0}
            subtitle="All years"
            icon={<DollarSign className="h-6 w-6" />}
            color="blue"
          />
          <StatCard
            title={`${currentYear} Planned`}
            value={formatCurrency(totalPlanned)}
            subtitle={`${currentYearBudgets.length} budget(s)`}
            icon={<TrendingUp className="h-6 w-6" />}
            color="green"
          />
        </div>
        <BudgetsClient budgets={budgets ?? []} />
      </div>
    </div>
  )
}
