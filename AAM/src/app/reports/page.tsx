import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import { BarChart3 } from 'lucide-react'
import ReportsClient from './ReportsClient'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const supabase = await createClient()

  const today = new Date()
  const startOfYear = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0]
  const twelveMonthsAgo = new Date(today.getFullYear() - 1, today.getMonth(), 1).toISOString().split('T')[0]

  const [
    { data: maintenanceRecords },
    { data: repairs },
    { data: downtimeEvents },
    { data: assets },
    { data: parts },
    { data: maintenancePlans },
  ] = await Promise.all([
    supabase
      .from('maintenance_records')
      .select('id, performed_date, cost, type, status')
      .gte('performed_date', twelveMonthsAgo)
      .order('performed_date'),
    supabase
      .from('repairs')
      .select('id, status, started_date, completed_date, total_cost, reported_date')
      .order('reported_date', { ascending: false }),
    supabase
      .from('downtime_events')
      .select('id, asset_id, duration_hours, cost_impact, assets(id, name)')
      .not('end_time', 'is', null),
    supabase
      .from('assets')
      .select('id, status, category'),
    supabase
      .from('parts')
      .select('id, name, quantity_on_hand, reorder_point, unit_cost'),
    supabase
      .from('maintenance_plans')
      .select('id, is_active, next_due_date')
      .eq('is_active', true),
  ])

  return (
    <div>
      <Header
        title="Reports & Analytics"
        subtitle="Maintenance costs, repair trends, and operational insights"
        actions={
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <BarChart3 className="h-4 w-4" />
            <span>Year to date</span>
          </div>
        }
      />
      <div className="p-6">
        <ReportsClient
          maintenanceRecords={(maintenanceRecords ?? []) as any}
          repairs={(repairs ?? []) as any}
          downtimeEvents={(downtimeEvents ?? []) as any}
          assets={(assets ?? []) as any}
          parts={(parts ?? []) as any}
          maintenancePlans={(maintenancePlans ?? []) as any}
          startOfYear={startOfYear}
        />
      </div>
    </div>
  )
}
