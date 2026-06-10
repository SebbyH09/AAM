'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import { Search, Package2, PlusCircle, MinusCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import StockModal from './StockModal'

interface Vendor {
  id: string
  name: string
}

interface Part {
  id: string
  part_number: string | null
  name: string
  category: string | null
  quantity_on_hand: number
  reorder_point: number | null
  reorder_quantity: number | null
  unit_cost: number | null
  location: string | null
  unit_of_measure: string
  description: string | null
  notes: string | null
  vendor_id: string | null
  vendors: Vendor | null
  created_at: string
}

interface PartsClientProps {
  parts: Part[]
  vendors: Vendor[]
}

const CATEGORY_OPTIONS = [
  'mechanical', 'electrical', 'electronic', 'consumable', 'filter', 'lubricant', 'other',
]

export default function PartsClient({ parts, vendors }: PartsClientProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [stockModal, setStockModal] = useState<{ part: Part; mode: 'add' | 'use' } | null>(null)

  const filtered = useMemo(() => {
    return parts.filter((p) => {
      const matchSearch =
        search === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.part_number?.toLowerCase().includes(search.toLowerCase()))
      const matchCategory = categoryFilter === '' || p.category === categoryFilter
      const matchLowStock =
        !lowStockOnly || (p.reorder_point != null && p.quantity_on_hand <= p.reorder_point)
      return matchSearch && matchCategory && matchLowStock
    })
  }, [parts, search, categoryFilter, lowStockOnly])

  function isLowStock(part: Part) {
    return part.reorder_point != null && part.quantity_on_hand <= part.reorder_point
  }

  return (
    <div className="space-y-4">
      {stockModal && (
        <StockModal
          part={stockModal.part}
          mode={stockModal.mode}
          onClose={() => setStockModal(null)}
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search parts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="rounded text-blue-600"
            />
            Low Stock only
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <Package2 className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600">No parts found</p>
          <Link
            href="/parts/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add Part
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Part #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Qty on Hand</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Reorder Pt</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Unit Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Vendor</th>
                  <th className="relative px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filtered.map((part) => {
                  const low = isLowStock(part)
                  return (
                    <tr key={part.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-600">{part.part_number ?? '—'}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{part.name}</p>
                        {part.description && (
                          <p className="text-xs text-gray-500 truncate max-w-xs">{part.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                        {part.category ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-semibold ${low ? 'text-red-600' : 'text-gray-900'}`}>
                          {part.quantity_on_hand} {part.unit_of_measure}
                        </span>
                        {low && (
                          <Badge className="ml-2 bg-red-100 text-red-800">Low</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {part.reorder_point != null ? part.reorder_point : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {part.unit_cost != null ? formatCurrency(part.unit_cost) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{part.location ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {part.vendors?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setStockModal({ part, mode: 'add' })}
                            className="text-green-600 hover:text-green-800"
                            title="Add Stock"
                          >
                            <PlusCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setStockModal({ part, mode: 'use' })}
                            className="text-orange-600 hover:text-orange-800"
                            title="Use Stock"
                          >
                            <MinusCircle className="h-4 w-4" />
                          </button>
                          <Link
                            href={`/parts/${part.id}/edit`}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
