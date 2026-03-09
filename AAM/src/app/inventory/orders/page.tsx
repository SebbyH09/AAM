import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import OrdersClient from './OrdersClient'

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('inventory_orders')
    .select('*')
    .order('order_date', { ascending: false })

  return (
    <div>
      <Header
        title="Orders"
        subtitle="Manage purchase orders for consumable inventory"
        actions={
          <Link
            href="/inventory/orders/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Order
          </Link>
        }
      />

      <div className="p-6">
        <OrdersClient orders={orders ?? []} />
      </div>
    </div>
  )
}
