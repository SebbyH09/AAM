'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatCurrency, statusColor } from '@/lib/utils'
import { InventoryOrder } from '@/types/database'
import Link from 'next/link'
import { Search, ShoppingCart, ChevronRight } from 'lucide-react'

const STATUS_FILTERS = ['all', 'draft', 'submitted', 'approved', 'ordered', 'shipped', 'received', 'cancelled']

interface Props {
  orders: InventoryOrder[]
}

export default function OrdersClient({ orders }: Props) {
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')

  const filtered = orders.filter((order) => {
    const matchSearch =
      search === '' ||
      order.vendor.toLowerCase().includes(search.toLowerCase()) ||
      (order.order_number?.toLowerCase().includes(search.toLowerCase())) ||
      (order.ordered_by?.toLowerCase().includes(search.toLowerCase()))
    const matchStatus = selectedStatus === 'all' || order.status === selectedStatus
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search orders, vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedStatus(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                selectedStatus === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <ShoppingCart className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600">No orders found</p>
          <p className="text-sm text-gray-400 mt-1">
            {orders.length === 0 ? 'Create your first order to get started' : 'Try adjusting your filters'}
          </p>
          <Link
            href="/inventory/orders/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Order
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Order Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Expected</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="relative px-6 py-3"><span className="sr-only">View</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{order.order_number ?? '—'}</p>
                    {order.ordered_by && <p className="text-xs text-gray-500">by {order.ordered_by}</p>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{order.vendor}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(order.order_date)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(order.expected_date)}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(order.total_cost)}</td>
                  <td className="px-6 py-4">
                    <Badge className={statusColor(order.status)}>{order.status}</Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/inventory/orders/${order.id}`}
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      View
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
