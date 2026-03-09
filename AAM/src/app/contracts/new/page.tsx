import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import ContractForm from '../ContractForm'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ asset_id?: string }>
}

export default async function NewContractPage({ searchParams }: PageProps) {
  const { asset_id } = await searchParams
  const supabase = await createClient()

  const { data: assets } = await supabase.from('assets').select('id, name, asset_tag').order('name')

  return (
    <div>
      <Header title="Add Service Contract" subtitle="Attach a service contract to an asset" />
      <div className="p-6">
        <ContractForm assets={assets ?? []} defaultAssetId={asset_id} />
      </div>
    </div>
  )
}
