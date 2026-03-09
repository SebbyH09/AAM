import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import { StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  Boxes, ShoppingCart, ClipboardCheck, AlertTriangle,
  CheckCircle, TrendingDown, Package, ArrowRight,
} from 'lucide-react'
import { formatDate, formatCurrency, statusColor } from '@/lib/utils'
import Link from 'next/link'
import { addDays } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function InventoryDashboardPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const in7Days = addDays(new Date(), 7).toISOString().split('T')[0]

  const [
    { count: totalItems },
    { count: activeItems },
    { data: lowStockItems },
    { data: recentOrders },
    { data: dueCycleCounts },
    { count: pendingOrders },
    { data: allItems },
  ] = await Promise.all([
    supabase.from('inventory_items').select('*', { count: 'exact', head: true }),
    supabase.from('inventory_items').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('inventory_items')
      .select('*')
      .eq('is_active', true)
      .order('quantity_on_hand')
      .limit(10),
    supabase.from('inventory_orders')
      .select('*')
      .in('status', ['submitted', 'approved', 'ordered', 'shipped'])
      .order('order_date', { ascending: false })
      .limit(5),
    supabase.from('inventory_items')
      .select('*')
      .eq('is_active', true)
      .not('next_count_date', 'is', null)
      .lte('next_count_date', in7Days)
      .order('next_count_date')
      .limit(5),
    supabase.from('inventory_orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['submitted', 'approved', 'ordered', 'shipped']),
    supabase.from('inventory_items')
      .select('quantity_on_hand, reorder_point')
      .eq('is_active', true),
  ])

  // Calculate low stock count from items where quantity <= reorder_point
  const lowStockCount = allItems?.filter(
    (item) => item.quantity_on_hand <= item.reorder_point
  ).length ?? 0

  // Filter the lowStockItems to only show actually low stock
  const lowStockList = lowStockItems?.filter(
    (item) => item.quantity_on_hand <= item.reorder_point
  ) ?? []

  // Items due for cycle count (overdue or due within 7 days)
  const dueCountsList = dueCycleCounts ?? []

  return (
    <div>
      <Header title="Inventory Dashboard" subtitle="Overview of consumable inventory, orders, and cycle counts" />

      <div className="p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Items"
            value={totalItems ?? 0}
            subtitle={`${activeItems ?? 0} active`}
            icon={<Boxes className="h-6 w-6" />}
            color="blue"
          />
          <StatCard
            title="Low Stock"
            value={lowStockCount}
            subtitle="At or below reorder point"
            icon={<TrendingDown className="h-6 w-6" />}
            color={lowStockCount > 0 ? 'red' : 'green'}
          />
          <StatCard
            title="Pending Orders"
            value={pendingOrders ?? 0}
            subtitle="In progress"
            icon={<ShoppingCart className="h-6 w-6" />}
            color={pendingOrders ? 'yellow' : 'green'}
          />
          <StatCard
            title="Cycle Counts Due"
            value={dueCountsList.length}
            subtitle="Due within 7 days"
            icon={<ClipboardCheck className="h-6 w-6" />}
            color={dueCountsList.length > 0 ? 'orange' : 'green'}
          />
        </div>

        {/* Alert Banner */}
        {(lowStockCount > 0 || dueCountsList.length > 0) && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-orange-800">Action Required</p>
                <p className="text-sm text-orange-700 mt-0.5">
                  {lowStockCount > 0 && `${lowStockCount} item(s) are low on stock. `}
                  {dueCountsList.length > 0 && `${dueCountsList.length} item(s) due for cycle count.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Low Stock Items */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <h2 className="font-semibold text-gray-900">Low Stock Items</h2>
              </div>
              <Link href="/inventory/items" className="text-sm text-blue-600 hover:text-blue-800">View all →</Link>
            </div>
            <div className="divide-y divide-gray-100">
              {lowStockList.length > 0 ? (
                lowStockList.slice(0, 5).map((item: any) => {
                  const pct = item.reorder_point > 0
                    ? Math.round((item.quantity_on_hand / item.reorder_point) * 100)
                    : 0
                  return (
                    <Link key={item.id} href={`/inventory/items/${item.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          {item.quantity_on_hand} {item.unit} remaining • Reorder at {item.reorder_point}
                        </p>
                      </div>
                      <Badge className={item.quantity_on_hand === 0 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}>
                        {item.quantity_on_hand === 0 ? 'Out of stock' : `${pct}%`}
                      </Badge>
                    </Link>
                  )
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="h-8 w-8 text-green-400 mb-2" />
                  <p className="text-sm text-gray-500">All items well stocked</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900">Recent Orders</h2>
              </div>
              <Link href="/inventory/orders" className="text-sm text-blue-600 hover:text-blue-800">View all →</Link>
            </div>
            <div className="divide-y divide-gray-100">
              {recentOrders && recentOrders.length > 0 ? (
                recentOrders.map((order: any) => (
                  <Link key={order.id} href={`/inventory/orders/${order.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {order.order_number ?? 'No order #'} — {order.vendor}
                      </p>
                      <p className="text-xs text-gray-500">
                        Ordered {formatDate(order.order_date)}
                        {order.total_cost != null && ` • ${formatCurrency(order.total_cost)}`}
                      </p>
                    </div>
                    <Badge className={statusColor(order.status)}>{order.status}</Badge>
                  </Link>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Package className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No pending orders</p>
                </div>
              )}
            </div>
          </div>

          {/* Cycle Counts Due */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-orange-600" />
                <h2 className="font-semibold text-gray-900">Cycle Counts Due</h2>
              </div>
              <Link href="/inventory/cycle-counts" className="text-sm text-blue-600 hover:text-blue-800">View all →</Link>
            </div>
            <div className="divide-y divide-gray-100">
              {dueCountsList.length > 0 ? (
                dueCountsList.map((item: any) => {
                  const isOverdue = new Date(item.next_count_date) < new Date()
                  return (
                    <div key={item.id} className="flex items-center justify-between px-6 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          {item.category} • {item.location ?? 'No location'} • Last counted {formatDate(item.last_counted_date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <Badge className={isOverdue ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                          {isOverdue ? 'Overdue' : `Due ${formatDate(item.next_count_date)}`}
                        </Badge>
                        <Link
                          href={`/inventory/cycle-counts/new?item_id=${item.id}`}
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                        >
                          Count <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="h-8 w-8 text-green-400 mb-2" />
                  <p className="text-sm text-gray-500">No cycle counts due</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
