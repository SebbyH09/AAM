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

  const [{ data: contract }, { data: assets }] = await Promise.all([
    supabase.from('service_contracts').select('*').eq('id', id).single(),
    supabase.from('assets').select('id, name, asset_tag').order('name'),
  ])

  if (!contract) notFound()

  return (
    <div>
      <Header title="Edit Contract" subtitle={contract.vendor_name} />
      <div className="p-6">
        <ContractForm assets={assets ?? []} contract={contract} />
      </div>
    </div>
  )
}
