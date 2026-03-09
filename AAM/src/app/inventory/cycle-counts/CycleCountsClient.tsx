'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { formatDate, statusColor } from '@/lib/utils'
import { CycleCountWithItem } from '@/types/database'
import Link from 'next/link'
import { Search, ClipboardCheck } from 'lucide-react'

const STATUS_FILTERS = ['all', 'pending', 'completed', 'reviewed']

interface Props {
  cycleCounts: CycleCountWithItem[]
}

export default function CycleCountsClient({ cycleCounts }: Props) {
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')

  const filtered = cycleCounts.filter((cc) => {
    const matchSearch =
      search === '' ||
      (cc.inventory_items?.name?.toLowerCase().includes(search.toLowerCase())) ||
      cc.counted_by.toLowerCase().includes(search.toLowerCase())
    const matchStatus = selectedStatus === 'all' || cc.status === selectedStatus
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
            placeholder="Search items, counter..."
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

      {/* Cycle Counts Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <ClipboardCheck className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600">No cycle counts found</p>
          <p className="text-sm text-gray-400 mt-1">
            {cycleCounts.length === 0 ? 'Perform your first cycle count to get started' : 'Try adjusting your filters'}
          </p>
          <Link
            href="/inventory/cycle-counts/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Count
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Count Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Counted By</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Expected</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actual</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Variance</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((cc) => (
                <tr key={cc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/inventory/items/${cc.item_id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                      {cc.inventory_items?.name ?? 'Unknown'}
                    </Link>
                    {cc.inventory_items?.sku && (
                      <p className="text-xs text-gray-500">{cc.inventory_items.sku}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(cc.count_date)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{cc.counted_by}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{cc.expected_quantity}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{cc.actual_quantity}</td>
                  <td className="px-6 py-4">
                    {cc.variance === 0 ? (
                      <span className="text-sm text-gray-400">0</span>
                    ) : (
                      <span className={`text-sm font-medium ${cc.variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {cc.variance > 0 ? '+' : ''}{cc.variance}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={statusColor(cc.status)}>{cc.status}</Badge>
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
