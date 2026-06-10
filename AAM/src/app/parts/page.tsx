import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { Plus, Package2, AlertTriangle, DollarSign } from 'lucide-react'
import { StatCard } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import PartsClient from './PartsClient'

export const dynamic = 'force-dynamic'

export default async function PartsPage() {
  const supabase = await createClient()

  const [{ data: parts }, { data: vendors }] = await Promise.all([
    supabase.from('parts').select('*, vendors(id, name)').order('name'),
    supabase.from('vendors').select('id, name').order('name'),
  ])

  const totalParts = parts?.length ?? 0
  const lowStockCount = parts?.filter(
    (p) => p.reorder_point != null && p.quantity_on_hand <= p.reorder_point
  ).length ?? 0
  const totalValue = parts?.reduce(
    (sum, p) => sum + (p.quantity_on_hand ?? 0) * (p.unit_cost ?? 0),
    0
  ) ?? 0

  return (
    <div>
      <Header
        title="Parts Inventory"
        subtitle="Track parts, stock levels, and inventory transactions"
        actions={
          <Link
            href="/parts/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Part
          </Link>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Parts"
            value={totalParts}
            subtitle="In catalog"
            icon={<Package2 className="h-6 w-6" />}
            color="blue"
          />
          <StatCard
            title="Low Stock"
            value={lowStockCount}
            subtitle="At or below reorder point"
            icon={<AlertTriangle className="h-6 w-6" />}
            color={lowStockCount > 0 ? 'red' : 'green'}
          />
          <StatCard
            title="Inventory Value"
            value={formatCurrency(totalValue)}
            subtitle="Total stock value"
            icon={<DollarSign className="h-6 w-6" />}
            color="green"
          />
        </div>
        <PartsClient parts={parts ?? []} vendors={vendors ?? []} />
      </div>
    </div>
  )
}
