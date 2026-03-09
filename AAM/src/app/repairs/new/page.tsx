import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import RepairForm from '../RepairForm'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ asset_id?: string }>
}

export default async function NewRepairPage({ searchParams }: PageProps) {
  const { asset_id } = await searchParams
  const supabase = await createClient()
  const { data: assets } = await supabase.from('assets').select('id, name, asset_tag').order('name')

  return (
    <div>
      <Header title="Log Repair" subtitle="Record a new repair or service request" />
      <div className="p-6">
        <RepairForm assets={assets ?? []} defaultAssetId={asset_id} />
      </div>
    </div>
  )
}
