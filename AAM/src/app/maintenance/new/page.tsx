import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import MaintenancePlanForm from '../MaintenancePlanForm'
import { ASSET_GROUP_PICKER_COLUMNS, ASSET_PICKER_COLUMNS } from '@/lib/assetPicker'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ asset_id?: string; group?: string }>
}

export default async function NewMaintenancePlanPage({ searchParams }: PageProps) {
  const { asset_id, group } = await searchParams
  const supabase = await createClient()
  const [{ data: assets }, { data: groups }] = await Promise.all([
    supabase.from('assets').select(ASSET_PICKER_COLUMNS).order('name'),
    supabase.from('asset_groups').select(ASSET_GROUP_PICKER_COLUMNS).order('name'),
  ])

  return (
    <div>
      <Header title="New Maintenance Plan" subtitle="Create a scheduled maintenance task" />
      <div className="p-6">
        <MaintenancePlanForm assets={assets ?? []} groups={groups ?? []} defaultAssetId={asset_id} defaultGroupId={group} />
      </div>
    </div>
  )
}
