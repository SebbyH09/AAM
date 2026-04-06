import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import ContractForm from '../../ContractForm'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditContractPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: contract }, { data: assets }, { data: linkedAssets }] = await Promise.all([
    supabase.from('service_contracts').select('*').eq('id', id).single(),
    supabase.from('assets').select('id, name, asset_tag').order('name'),
    supabase.from('service_contract_assets').select('asset_id').eq('service_contract_id', id),
  ])

  if (!contract) notFound()

  // Get linked asset IDs from junction table, falling back to legacy asset_id
  const linkedAssetIds = linkedAssets && linkedAssets.length > 0
    ? linkedAssets.map((la) => la.asset_id)
    : contract.asset_id ? [contract.asset_id] : []

  return (
    <div>
      <Header title="Edit Contract" subtitle={contract.vendor_name} />
      <div className="p-6">
        <ContractForm assets={assets ?? []} contract={contract} defaultAssetIds={linkedAssetIds} />
      </div>
    </div>
  )
}
