import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import WorkOrderForm from '../../WorkOrderForm'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditWorkOrderPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: workOrder }, { data: assets }] = await Promise.all([
    supabase.from('work_orders').select('*').eq('id', id).single(),
    supabase.from('assets').select('id, name, asset_tag').order('name'),
  ])

  if (!workOrder) notFound()

  return (
    <div>
      <Header title="Edit Work Order" subtitle={workOrder.title} />
      <div className="p-6">
        <WorkOrderForm assets={assets ?? []} workOrder={workOrder} />
      </div>
    </div>
  )
}
