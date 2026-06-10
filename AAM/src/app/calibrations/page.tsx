import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { Plus, FlaskConical, CheckCircle, AlertTriangle } from 'lucide-react'
import { StatCard } from '@/components/ui/Card'
import CalibrationsClient from './CalibrationsClient'
import { addDays } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function CalibrationsPage() {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]
  const endOfMonth = addDays(new Date(), 30).toISOString().split('T')[0]

  const [{ data: calibrations }, { count: dueThisMonth }, { count: overdueCount }] =
    await Promise.all([
      supabase
        .from('calibration_records')
        .select('*, assets(id, name, asset_tag)')
        .order('next_due_date'),
      supabase
        .from('calibration_records')
        .select('*', { count: 'exact', head: true })
        .gte('next_due_date', today)
        .lte('next_due_date', endOfMonth),
      supabase
        .from('calibration_records')
        .select('*', { count: 'exact', head: true })
        .lt('next_due_date', today),
    ])

  const totalRecords = calibrations?.length ?? 0
  const passCount = calibrations?.filter((c) => c.result === 'pass').length ?? 0
  const passRate = totalRecords > 0 ? Math.round((passCount / totalRecords) * 100) : 0

  return (
    <div>
      <Header
        title="Calibrations"
        subtitle="Track calibration records and upcoming due dates"
        actions={
          <Link
            href="/calibrations/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Calibration
          </Link>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Records"
            value={totalRecords}
            subtitle="All calibrations"
            icon={<FlaskConical className="h-6 w-6" />}
            color="blue"
          />
          <StatCard
            title="Due This Month"
            value={dueThisMonth ?? 0}
            subtitle="Next 30 days"
            icon={<AlertTriangle className="h-6 w-6" />}
            color={(dueThisMonth ?? 0) > 0 ? 'orange' : 'green'}
          />
          <StatCard
            title="Overdue"
            value={overdueCount ?? 0}
            subtitle="Past due date"
            icon={<AlertTriangle className="h-6 w-6" />}
            color={(overdueCount ?? 0) > 0 ? 'red' : 'green'}
          />
          <StatCard
            title="Pass Rate"
            value={`${passRate}%`}
            subtitle={`${passCount} passed`}
            icon={<CheckCircle className="h-6 w-6" />}
            color={passRate >= 80 ? 'green' : 'yellow'}
          />
        </div>
        <CalibrationsClient calibrations={calibrations ?? []} />
      </div>
    </div>
  )
}
