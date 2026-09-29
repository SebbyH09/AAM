import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import RepairForm from '../RepairForm'
import { ASSET_GROUP_PICKER_COLUMNS, ASSET_PICKER_COLUMNS } from '@/lib/assetPicker'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ asset_id?: string; group?: string }>
}

export default async function NewRepairPage({ searchParams }: PageProps) {
  const { asset_id, group } = await searchParams
  const supabase = await createClient()
  const [{ data: assets }, { data: groups }] = await Promise.all([
    supabase.from('assets').select(ASSET_PICKER_COLUMNS).order('name'),
    supabase.from('asset_groups').select(ASSET_GROUP_PICKER_COLUMNS).order('name'),
  ])

  return (
    <div>
      <Header title="Log Repair" subtitle="Record a new repair or service request" />
      <div className="p-6">
        <RepairForm assets={assets ?? []} groups={groups ?? []} defaultAssetId={asset_id} defaultGroupId={group} />
      </div>
    </div>
  )
}
