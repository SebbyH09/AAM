import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import { notFound } from 'next/navigation'
import OrderForm from '../../OrderForm'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditOrderPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: order },
    { data: lineItems },
  ] = await Promise.all([
    supabase.from('inventory_orders').select('*').eq('id', id).single(),
    supabase.from('inventory_order_items').select('*').eq('order_id', id),
  ])

  if (!order) notFound()

  return (
    <div>
      <Header title="Edit Order" subtitle={order.order_number ?? order.vendor} />
      <div className="p-6">
        <OrderForm
          order={order}
          existingLineItems={lineItems?.map((li) => ({
            item_id: li.item_id,
            quantity: li.quantity,
            unit_cost: li.unit_cost,
          })) ?? []}
        />
      </div>
    </div>
  )
}
