import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import WorkOrderForm from '../WorkOrderForm'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ asset_id?: string }>
}

export default async function NewWorkOrderPage({ searchParams }: PageProps) {
  const { asset_id } = await searchParams
  const supabase = await createClient()
  const { data: assets } = await supabase.from('assets').select('id, name, asset_tag').order('name')

  return (
    <div>
      <Header title="New Work Order" subtitle="Log a one-off maintenance or work order" />
      <div className="p-6">
        <WorkOrderForm assets={assets ?? []} defaultAssetId={asset_id} />
      </div>
    </div>
  )
}
