import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import WorkOrdersClient from './WorkOrdersClient'

export const dynamic = 'force-dynamic'

export default async function WorkOrdersPage() {
  const supabase = await createClient()

  const { data: workOrders } = await supabase
    .from('work_orders')
    .select('*, assets(name, asset_tag, serial_number, model)')
    .order('request_date', { ascending: false })

  return (
    <div>
      <Header
        title="Other Work Orders"
        subtitle="Log one-off maintenance or work orders, with or without an instrument"
        actions={
          <Link
            href="/work-orders/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Work Order
          </Link>
        }
      />
      <div className="p-6">
        <WorkOrdersClient workOrders={workOrders ?? []} />
      </div>
    </div>
  )
}
