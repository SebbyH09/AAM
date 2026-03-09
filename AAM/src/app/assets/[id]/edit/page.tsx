import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import AssetForm from '../../AssetForm'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditAssetPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: asset } = await supabase.from('assets').select('*').eq('id', id).single()
  if (!asset) notFound()

  return (
    <div>
      <Header title="Edit Asset" subtitle={asset.name} />
      <div className="p-6">
        <AssetForm asset={asset} />
      </div>
    </div>
  )
}
