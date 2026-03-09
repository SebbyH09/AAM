import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import MaintenancePlanForm from '../../MaintenancePlanForm'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditMaintenancePlanPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: plan }, { data: assets }] = await Promise.all([
    supabase.from('maintenance_plans').select('*').eq('id', id).single(),
    supabase.from('assets').select('id, name, asset_tag').order('name'),
  ])

  if (!plan) notFound()

  return (
    <div>
      <Header title="Edit Maintenance Plan" subtitle={plan.name} />
      <div className="p-6">
        <MaintenancePlanForm assets={assets ?? []} plan={plan} />
      </div>
    </div>
  )
}
