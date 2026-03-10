import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import MaintenancePlanForm from '../MaintenancePlanForm'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ asset_id?: string }>
}

export default async function NewMaintenancePlanPage({ searchParams }: PageProps) {
  const { asset_id } = await searchParams
  const supabase = await createClient()
  const { data: assets } = await supabase.from('assets').select('id, name, asset_tag, location').order('name')

  return (
    <div>
      <Header title="New Maintenance Plan" subtitle="Create a scheduled maintenance task" />
      <div className="p-6">
        <MaintenancePlanForm assets={assets ?? []} defaultAssetId={asset_id} />
      </div>
    </div>
  )
}
