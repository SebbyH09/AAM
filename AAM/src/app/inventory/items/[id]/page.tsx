import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatCurrency, statusColor } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Edit, ClipboardCheck, ShoppingCart, Package, ArrowLeftRight } from 'lucide-react'
import DeleteInventoryItemButton from './DeleteInventoryItemButton'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function InventoryItemDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: item },
    { data: cycleCounts },
    { data: orderItems },
    alternatesResult,
  ] = await Promise.all([
    supabase.from('inventory_items').select('*').eq('id', id).single(),
    supabase.from('cycle_counts')
      .select('*')
      .eq('item_id', id)
      .order('count_date', { ascending: false })
      .limit(10),
    supabase.from('inventory_order_items')
      .select('*, inventory_orders(*)')
      .eq('item_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('alternate_inventory_items')
      .select('id, alternate_item_id, notes, inventory_items!alternate_item_id(id, name, sku, category, quantity_on_hand, unit, reorder_point)')
      .eq('item_id', id)
      .then((r) => r)
      .catch(() => ({ data: [] })),
  ])

  if (!item) notFound()

  const alternates: any[] = (alternatesResult as any)?.data ?? []

  const isLow = item.quantity_on_hand <= item.reorder_point
  const isOut = item.quantity_on_hand === 0
  const stockLabel = isOut ? 'Out of stock' : isLow ? 'Low stock' : 'In stock'
  const stockColor = isOut ? 'bg-red-100 text-red-800' : isLow ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
  const totalValue = item.unit_cost != null ? item.unit_cost * item.quantity_on_hand : null

  return (
    <div>
      <Header
        title={item.name}
        subtitle={[item.sku, item.category, item.vendor].filter(Boolean).join(' • ')}
        actions={
          <div className="flex gap-2">
            <Link
              href={`/inventory/items/${id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">Edit</span>
            </Link>
            <DeleteInventoryItemButton itemId={id} itemName={item.name} />
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Stock Status</p>
            <Badge className={`mt-1 ${stockColor}`}>{stockLabel}</Badge>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Quantity on Hand</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {item.quantity_on_hand} {item.unit}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Reorder Point</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {item.reorder_point} {item.unit}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Value</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{formatCurrency(totalValue)}</p>
          </div>
        </div>

        {/* Detail Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Item Details */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900">Item Details</h2>
              </div>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div>
                <p className="text-xs text-gray-500">SKU</p>
                <p className="text-sm text-gray-900">{item.sku ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Category</p>
                <p className="text-sm text-gray-900">{item.category}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Unit</p>
                <p className="text-sm text-gray-900">{item.unit}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Unit Cost</p>
                <p className="text-sm text-gray-900">{formatCurrency(item.unit_cost)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Vendor</p>
                <p className="text-sm text-gray-900">{item.vendor ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Location</p>
                <p className="text-sm text-gray-900">{item.location ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Reorder Quantity</p>
                <p className="text-sm text-gray-900">{item.reorder_quantity} {item.unit}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Next Cycle Count</p>
                <p className="text-sm text-gray-900">{formatDate(item.next_count_date)}</p>
              </div>
              {item.description && (
                <div>
                  <p className="text-xs text-gray-500">Description</p>
                  <p className="text-sm text-gray-900">{item.description}</p>
                </div>
              )}
              {item.notes && (
                <div>
                  <p className="text-xs text-gray-500">Notes</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{item.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Cycle Count History */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-orange-600" />
                <h2 className="font-semibold text-gray-900">Cycle Counts</h2>
              </div>
              <Link
                href={`/inventory/cycle-counts/new?item_id=${id}`}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
              >
                New Count
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {cycleCounts && cycleCounts.length > 0 ? (
                cycleCounts.map((cc: any) => (
                  <div key={cc.id} className="px-6 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{formatDate(cc.count_date)}</p>
                      <Badge className={statusColor(cc.status)}>{cc.status}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Expected: {cc.expected_quantity} • Actual: {cc.actual_quantity}
                      {cc.variance !== 0 && (
                        <span className={cc.variance < 0 ? ' text-red-600 font-medium' : ' text-green-600 font-medium'}>
                          {' '}({cc.variance > 0 ? '+' : ''}{cc.variance})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">By {cc.counted_by}</p>
                  </div>
                ))
              ) : (
                <p className="px-6 py-4 text-sm text-gray-400">No cycle counts recorded.</p>
              )}
            </div>
          </div>

          {/* Order History */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900">Order History</h2>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {orderItems && orderItems.length > 0 ? (
                orderItems.map((oi: any) => (
                  <Link key={oi.id} href={`/inventory/orders/${oi.order_id}`} className="block px-6 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {oi.inventory_orders?.order_number ?? 'Order'}
                      </p>
                      <Badge className={statusColor(oi.inventory_orders?.status ?? 'pending')}>
                        {oi.inventory_orders?.status ?? '—'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Qty: {oi.quantity} • {formatDate(oi.inventory_orders?.order_date)}
                      {oi.total_cost != null && ` • ${formatCurrency(oi.total_cost)}`}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="px-6 py-4 text-sm text-gray-400">No orders for this item.</p>
              )}
            </div>
          </div>
        </div>

        {/* Alternate / Substitute Items */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-purple-600" />
              <h2 className="font-semibold text-gray-900">Alternate / Substitute Items</h2>
            </div>
            <Link
              href={`/inventory/items/${id}/edit`}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Manage
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {alternates.length > 0 ? (
              alternates.map((alt: any) => {
                const altItem = alt.inventory_items
                if (!altItem) return null
                const altIsLow = altItem.quantity_on_hand <= altItem.reorder_point
                const altIsOut = altItem.quantity_on_hand === 0
                const altBadge = altIsOut
                  ? { label: 'Out of stock', color: 'bg-red-100 text-red-800' }
                  : altIsLow
                  ? { label: 'Low stock', color: 'bg-orange-100 text-orange-800' }
                  : { label: 'In stock', color: 'bg-green-100 text-green-800' }
                return (
                  <Link
                    key={alt.id}
                    href={`/inventory/items/${altItem.id}`}
                    className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{altItem.name}</p>
                      <p className="text-xs text-gray-500">
                        {altItem.sku && <>{altItem.sku} · </>}
                        {altItem.quantity_on_hand} {altItem.unit} on hand
                        {alt.notes && <> · <span className="italic">{alt.notes}</span></>}
                      </p>
                    </div>
                    <Badge className={altBadge.color}>{altBadge.label}</Badge>
                  </Link>
                )
              })
            ) : (
              <div className="flex items-center justify-between px-6 py-4">
                <p className="text-sm text-gray-400">No alternate items linked.</p>
                <Link
                  href={`/inventory/items/${id}/edit`}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Add alternates →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
