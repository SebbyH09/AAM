import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import ContractsClient from './ContractsClient'

export const dynamic = 'force-dynamic'

export default async function ContractsPage() {
  const supabase = await createClient()

  const { data: contracts } = await supabase
    .from('service_contracts')
    .select('*, assets(name, asset_tag)')
    .order('end_date')

  const { data: assets } = await supabase
    .from('assets')
    .select('id, name, asset_tag')
    .order('name')

  return (
    <div>
      <Header
        title="Service Contracts"
        subtitle="Manage all service agreements and warranties"
        actions={
          <Link
            href="/contracts/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Contract
          </Link>
        }
      />
      <div className="p-6">
        <ContractsClient contracts={contracts ?? []} />
      </div>
    </div>
  )
}
