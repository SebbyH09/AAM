import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import ContractForm from '../ContractForm'
import { ASSET_GROUP_PICKER_COLUMNS, ASSET_PICKER_COLUMNS } from '@/lib/assetPicker'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ asset_id?: string; group?: string }>
}

export default async function NewContractPage({ searchParams }: PageProps) {
  const { asset_id, group } = await searchParams
  const supabase = await createClient()

  const [{ data: assets }, { data: groups }] = await Promise.all([
    supabase.from('assets').select(ASSET_PICKER_COLUMNS).order('name'),
    supabase.from('asset_groups').select(ASSET_GROUP_PICKER_COLUMNS).order('name'),
  ])
  const defaultAssetIds = group
    ? (assets ?? []).filter((a) => a.group_id === group).map((a) => a.id)
    : asset_id ? [asset_id] : []

  return (
    <div>
      <Header title="Add Service Contract" subtitle="Attach a service contract to assets" />
      <div className="p-6">
        <ContractForm assets={assets ?? []} groups={groups ?? []} defaultAssetIds={defaultAssetIds} />
      </div>
    </div>
  )
}
