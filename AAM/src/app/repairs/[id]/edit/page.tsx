import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import RepairForm from '../../RepairForm'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditRepairPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: repair }, { data: assets }] = await Promise.all([
    supabase.from('repairs').select('*').eq('id', id).single(),
    supabase.from('assets').select('id, name, asset_tag').order('name'),
  ])

  if (!repair) notFound()

  return (
    <div>
      <Header title="Edit Repair" subtitle={repair.description} />
      <div className="p-6">
        <RepairForm assets={assets ?? []} repair={repair} />
      </div>
    </div>
  )
}
