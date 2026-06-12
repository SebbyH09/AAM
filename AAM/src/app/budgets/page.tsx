import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { Plus, DollarSign, TrendingUp } from 'lucide-react'
import { StatCard } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import BudgetsClient, { SpendingRecord } from './BudgetsClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

function extractAssetName(raw: unknown): string | null {
  if (!raw) return null
  if (Array.isArray(raw)) return (raw[0] as { name?: string } | undefined)?.name ?? null
  return (raw as { name?: string }).name ?? null
}

export default async function BudgetsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (user?.user_metadata?.role !== 'admin') redirect('/')
  const currentYear = new Date().getFullYear()

  const [
    { data: budgets },
    { data: maintenanceData },
    { data: repairsData },
    { data: contractsData },
  ] = await Promise.all([
    supabase
      .from('budgets')
      .select('*, assets(id, name, asset_tag)')
      .order('fiscal_year', { ascending: false }),
    supabase
      .from('maintenance_records')
      .select('id, asset_id, cost, performed_date, type, status, description, assets(id, name, asset_tag)'),
    supabase
      .from('repairs')
      .select('id, asset_id, total_cost, reported_date, status, description, assets(id, name, asset_tag)'),
    supabase
      .from('service_contracts')
      .select('id, asset_id, cost, start_date, end_date, status, vendor_name, contract_type, assets(id, name, asset_tag)'),
  ])

  const spendingRecords: SpendingRecord[] = [
    ...(contractsData ?? []).map((c) => ({
      id: c.id,
      category: 'contracts' as const,
      description: `${(c.contract_type as string).replace(/_/g, ' ')} — ${c.vendor_name}`,
      asset_name: extractAssetName(c.assets),
      amount: (c.cost as number | null) ?? 0,
      date: c.start_date as string,
      status: c.status as string,
      vendor: c.vendor_name as string,
      fiscal_year: parseInt((c.start_date as string).substring(0, 4)),
    })),
    ...(maintenanceData ?? []).map((m) => ({
      id: m.id,
      category: 'maintenance' as const,
      description: m.description as string,
      asset_name: extractAssetName(m.assets),
      amount: (m.cost as number | null) ?? 0,
      date: m.performed_date as string,
      status: m.status as string,
      vendor: null,
      fiscal_year: parseInt((m.performed_date as string).substring(0, 4)),
    })),
    ...(repairsData ?? []).map((r) => ({
      id: r.id,
      category: 'repairs' as const,
      description: r.description as string,
      asset_name: extractAssetName(r.assets),
      amount: (r.total_cost as number | null) ?? 0,
      date: r.reported_date as string,
      status: r.status as string,
      vendor: null,
      fiscal_year: parseInt((r.reported_date as string).substring(0, 4)),
    })),
  ]

  const currentYearBudgets = budgets?.filter((b) => b.fiscal_year === currentYear) ?? []
  const totalPlanned = currentYearBudgets.reduce((sum, b) => sum + (b.planned_amount ?? 0), 0)

  const currentYearSpend = spendingRecords
    .filter((r) => r.fiscal_year === currentYear)
    .reduce((sum, r) => sum + r.amount, 0)

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
          <StatCard
            title={`${currentYear} Spent`}
            value={formatCurrency(currentYearSpend)}
            subtitle="Contracts + maintenance + repairs"
            icon={<DollarSign className="h-6 w-6" />}
            color={currentYearSpend > totalPlanned ? 'red' : 'yellow'}
          />
          <StatCard
            title={`${currentYear} Remaining`}
            value={formatCurrency(Math.max(totalPlanned - currentYearSpend, 0))}
            subtitle={totalPlanned > 0 ? `${((currentYearSpend / totalPlanned) * 100).toFixed(0)}% used` : 'No budget set'}
            icon={<TrendingUp className="h-6 w-6" />}
            color="purple"
          />
        </div>
        <BudgetsClient budgets={budgets ?? []} spendingRecords={spendingRecords} />
      </div>
    </div>
  )
}
