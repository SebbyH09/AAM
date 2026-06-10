import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import { Calendar } from 'lucide-react'
import ScheduleClient from './ScheduleClient'
import { addDays } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function SchedulePage() {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]
  const in90Days = addDays(new Date(), 90).toISOString().split('T')[0]

  const [
    { data: maintenancePlans },
    { data: repairs },
    { data: calibrations },
  ] = await Promise.all([
    supabase
      .from('maintenance_plans')
      .select('id, name, next_due_date, priority, assets(id, name, asset_tag)')
      .eq('is_active', true)
      .lte('next_due_date', in90Days)
      .order('next_due_date'),
    supabase
      .from('repairs')
      .select('id, description, priority, status, reported_date, assets(id, name, asset_tag)')
      .in('status', ['open', 'in_progress'])
      .order('reported_date'),
    supabase
      .from('calibration_records')
      .select('id, next_due_date, performed_by, result, assets(id, name, asset_tag)')
      .gte('next_due_date', today)
      .lte('next_due_date', in90Days)
      .order('next_due_date'),
  ])

  // Build unified events array
  const events = [
    ...(maintenancePlans ?? []).map((p: any) => ({
      id: p.id,
      type: 'maintenance' as const,
      title: p.name,
      date: p.next_due_date,
      assetName: p.assets?.name ?? null,
      priority: p.priority,
      href: `/maintenance/${p.id}/edit`,
    })),
    ...(repairs ?? []).map((r: any) => ({
      id: r.id,
      type: 'repair' as const,
      title: r.description,
      date: r.reported_date,
      assetName: r.assets?.name ?? null,
      priority: r.priority,
      href: `/repairs/${r.id}/edit`,
    })),
    ...(calibrations ?? []).map((c: any) => ({
      id: c.id,
      type: 'calibration' as const,
      title: `Calibration Due`,
      date: c.next_due_date,
      assetName: c.assets?.name ?? null,
      priority: null,
      href: `/calibrations/${c.id}/edit`,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div>
      <Header
        title="Schedule"
        subtitle="Upcoming maintenance, repairs, and calibrations"
        actions={
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>Next 90 days</span>
          </div>
        }
      />
      <div className="p-6">
        <ScheduleClient events={events} />
      </div>
    </div>
  )
}
