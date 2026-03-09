import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import DowntimeClient from './DowntimeClient'

export const dynamic = 'force-dynamic'

export default async function DowntimePage() {
  const supabase = await createClient()

  const [{ data: events }, { data: assets }] = await Promise.all([
    supabase
      .from('downtime_events')
      .select('*, assets(name, asset_tag)')
      .order('start_time', { ascending: false }),
    supabase.from('assets').select('id, name, asset_tag').order('name'),
  ])

  // Compute total downtime by asset
  const assetDowntime: Record<string, number> = {}
  events?.forEach((e) => {
    if (e.asset_id && e.duration_hours) {
      assetDowntime[e.asset_id] = (assetDowntime[e.asset_id] ?? 0) + e.duration_hours
    }
  })

  return (
    <div>
      <Header
        title="Downtime Tracking"
        subtitle="Monitor and analyze equipment downtime events"
      />
      <div className="p-6">
        <DowntimeClient events={events ?? []} assets={assets ?? []} />
      </div>
    </div>
  )
}
