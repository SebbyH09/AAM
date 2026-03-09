import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatCurrency, statusColor } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Edit, Package, Truck, Calendar } from 'lucide-react'
import OrderStatusActions from './OrderStatusActions'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: order },
    { data: orderItems },
  ] = await Promise.all([
    supabase.from('inventory_orders').select('*').eq('id', id).single(),
    supabase.from('inventory_order_items')
      .select('*, inventory_items(name, sku, unit)')
      .eq('order_id', id)
      .order('created_at'),
  ])

  if (!order) notFound()

  const itemCount = orderItems?.length ?? 0
  const totalQty = orderItems?.reduce((sum, oi) => sum + oi.quantity, 0) ?? 0

  return (
    <div>
      <Header
        title={order.order_number ?? 'Order'}
        subtitle={`${order.vendor} • ${formatDate(order.order_date)}`}
        actions={
          <div className="flex gap-2">
            <Link
              href={`/inventory/orders/${id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Link>
            <OrderStatusActions orderId={id} currentStatus={order.status} />
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Info Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
            <Badge className={`mt-1 ${statusColor(order.status)}`}>{order.status}</Badge>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Cost</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{formatCurrency(order.total_cost)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Items</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{itemCount} items, {totalQty} units</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Expected Delivery</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{formatDate(order.expected_date)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Order Details */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900">Order Details</h2>
              </div>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div>
                <p className="text-xs text-gray-500">Order Number</p>
                <p className="text-sm text-gray-900">{order.order_number ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Vendor</p>
                <p className="text-sm text-gray-900">{order.vendor}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Ordered By</p>
                <p className="text-sm text-gray-900">{order.ordered_by ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Order Date</p>
                <p className="text-sm text-gray-900">{formatDate(order.order_date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Expected Date</p>
                <p className="text-sm text-gray-900">{formatDate(order.expected_date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Received Date</p>
                <p className="text-sm text-gray-900">{formatDate(order.received_date)}</p>
              </div>
              {order.notes && (
                <div>
                  <p className="text-xs text-gray-500">Notes</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{order.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-2">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
                <h2 className="font-semibold text-gray-900">Line Items</h2>
              </div>
            </div>
            {orderItems && orderItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Qty Ordered</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Qty Received</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Unit Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orderItems.map((oi: any) => (
                      <tr key={oi.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3">
                          <Link href={`/inventory/items/${oi.item_id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                            {oi.inventory_items?.name ?? 'Unknown Item'}
                          </Link>
                          {oi.inventory_items?.sku && (
                            <p className="text-xs text-gray-500">{oi.inventory_items.sku}</p>
                          )}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-900">
                          {oi.quantity} {oi.inventory_items?.unit ?? ''}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-900">
                          {oi.received_quantity ?? '—'}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">{formatCurrency(oi.unit_cost)}</td>
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">{formatCurrency(oi.total_cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-6 py-4 text-sm text-gray-400">No line items added yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
