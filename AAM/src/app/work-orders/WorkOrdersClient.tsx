'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatCurrency, statusColor } from '@/lib/utils'
import Link from 'next/link'
import { Search, ClipboardList, ChevronRight } from 'lucide-react'

interface WorkOrder {
  id: string
  title: string
  description: string | null
  category: string
  priority: string
  status: string
  request_date: string
  scheduled_date: string | null
  completed_date: string | null
  requested_by: string | null
  assigned_to: string | null
  cost: number | null
  work_order_number: string | null
  assets: { name: string; asset_tag: string | null; serial_number: string | null; model: string | null } | null
}

interface WorkOrdersClientProps {
  workOrders: WorkOrder[]
}

const STATUS_FILTERS = ['all', 'open', 'in_progress', 'on_hold', 'completed', 'cancelled']
const PRIORITY_FILTERS = ['all', 'critical', 'high', 'medium', 'low']

export default function WorkOrdersClient({ workOrders }: WorkOrdersClientProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const filtered = workOrders.filter((w) => {
    const matchSearch =
      search === '' ||
      w.title.toLowerCase().includes(search.toLowerCase()) ||
      (w.description?.toLowerCase().includes(search.toLowerCase())) ||
      (w.assets?.name?.toLowerCase().includes(search.toLowerCase())) ||
      (w.assets?.serial_number?.toLowerCase().includes(search.toLowerCase())) ||
      (w.assets?.model?.toLowerCase().includes(search.toLowerCase())) ||
      (w.work_order_number?.toLowerCase().includes(search.toLowerCase()))
    const matchStatus = statusFilter === 'all' || w.status === statusFilter
    const matchPriority = priorityFilter === 'all' || w.priority === priorityFilter
    return matchSearch && matchStatus && matchPriority
  })

  const openCount = workOrders.filter((w) => ['open', 'in_progress', 'on_hold'].includes(w.status)).length

  return (
    <div className="space-y-4">
      {openCount > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
          <p className="text-sm text-yellow-800">
            <strong>{openCount}</strong> work order(s) currently open or in progress
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search work orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="flex gap-1">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                  statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {PRIORITY_FILTERS.map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                  priorityFilter === p ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <ClipboardList className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600">No work orders found</p>
          <Link
            href="/work-orders/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Work Order
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Work Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Asset</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Requested</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Cost</th>
                <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((wo) => (
                <tr key={wo.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900 max-w-xs truncate">{wo.title}</p>
                    <p className="text-xs text-gray-500">
                      {wo.work_order_number && `#${wo.work_order_number} • `}
                      {wo.requested_by ? `By ${wo.requested_by}` : 'Unassigned requester'}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {wo.assets?.name ?? <span className="text-gray-400">No asset</span>}
                    {wo.assets?.asset_tag && <span className="block text-xs text-gray-400">{wo.assets.asset_tag}</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 capitalize">{wo.category}</td>
                  <td className="px-6 py-4">
                    <Badge className={statusColor(wo.priority)}>{wo.priority}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={statusColor(wo.status)}>{wo.status.replace('_', ' ')}</Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <p>{formatDate(wo.request_date)}</p>
                    {wo.completed_date && (
                      <p className="text-xs text-gray-400">Done: {formatDate(wo.completed_date)}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(wo.cost)}</td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/work-orders/${wo.id}/edit`}
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      Edit <ChevronRight className="h-4 w-4" />
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
