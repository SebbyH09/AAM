import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import AssetForm from '../AssetForm'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ group?: string }>
}

export default async function NewAssetPage({ searchParams }: PageProps) {
  const { group } = await searchParams
  const supabase = await createClient()
  const { data: groups } = await supabase.from('asset_groups').select('*').order('name')

  return (
    <div>
      <Header title="Add New Asset" subtitle="Register a new instrument or equipment" />
      <div className="p-6">
        <AssetForm groups={groups ?? []} defaultGroupId={group} />
      </div>
    </div>
  )
}
