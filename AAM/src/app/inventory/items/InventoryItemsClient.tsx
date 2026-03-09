'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatCurrency } from '@/lib/utils'
import { InventoryItem } from '@/types/database'
import Link from 'next/link'
import { Search, Boxes, ChevronRight } from 'lucide-react'

const CATEGORIES = ['All', 'Reagents', 'Filters', 'PPE', 'Cleaning Supplies', 'Office Supplies', 'Lab Consumables', 'Electrical', 'Mechanical Parts', 'Other']
const STOCK_FILTERS = ['all', 'low', 'out', 'ok']

interface Props {
  items: InventoryItem[]
}

export default function InventoryItemsClient({ items }: Props) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [stockFilter, setStockFilter] = useState('all')

  const filtered = items.filter((item) => {
    const matchSearch =
      search === '' ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.sku?.toLowerCase().includes(search.toLowerCase())) ||
      (item.location?.toLowerCase().includes(search.toLowerCase())) ||
      (item.vendor?.toLowerCase().includes(search.toLowerCase()))
    const matchCategory = selectedCategory === 'All' || item.category === selectedCategory
    let matchStock = true
    if (stockFilter === 'low') matchStock = item.quantity_on_hand > 0 && item.quantity_on_hand <= item.reorder_point
    if (stockFilter === 'out') matchStock = item.quantity_on_hand === 0
    if (stockFilter === 'ok') matchStock = item.quantity_on_hand > item.reorder_point
    return matchSearch && matchCategory && matchStock
  })

  function stockBadge(item: InventoryItem) {
    if (item.quantity_on_hand === 0) return { label: 'Out of stock', color: 'bg-red-100 text-red-800' }
    if (item.quantity_on_hand <= item.reorder_point) return { label: 'Low stock', color: 'bg-orange-100 text-orange-800' }
    return { label: 'In stock', color: 'bg-green-100 text-green-800' }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search items, SKU, vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STOCK_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStockFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                stockFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'ok' ? 'In Stock' : s === 'out' ? 'Out of Stock' : s === 'low' ? 'Low Stock' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter row */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Items Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <Boxes className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600">No items found</p>
          <p className="text-sm text-gray-400 mt-1">
            {items.length === 0 ? 'Add your first inventory item to get started' : 'Try adjusting your filters'}
          </p>
          <Link
            href="/inventory/items/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add Item
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Qty on Hand</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Unit Cost</th>
                <th className="relative px-6 py-3"><span className="sr-only">View</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item) => {
                const badge = stockBadge(item)
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          {[item.sku, item.vendor].filter(Boolean).join(' • ')}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.category}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.location ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {item.quantity_on_hand} {item.unit}
                      </span>
                      <p className="text-xs text-gray-400">Reorder at {item.reorder_point}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={badge.color}>{badge.label}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatCurrency(item.unit_cost)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/inventory/items/${item.id}`}
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        View
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
