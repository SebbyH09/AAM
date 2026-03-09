'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatCurrency, statusColor } from '@/lib/utils'
import { Asset } from '@/types/database'
import Link from 'next/link'
import { Search, Package, ChevronRight } from 'lucide-react'

const CATEGORIES = ['All', 'Analytical', 'Lab Equipment', 'HVAC', 'IT/Network', 'Electrical', 'Mechanical', 'Other']
const STATUSES = ['all', 'active', 'inactive', 'repair', 'decommissioned']

interface AssetsClientProps {
  assets: Asset[]
}

export default function AssetsClient({ assets }: AssetsClientProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('all')

  const filtered = assets.filter((a) => {
    const matchSearch =
      search === '' ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.asset_tag?.toLowerCase().includes(search.toLowerCase())) ||
      (a.serial_number?.toLowerCase().includes(search.toLowerCase())) ||
      (a.location?.toLowerCase().includes(search.toLowerCase()))
    const matchCategory = selectedCategory === 'All' || a.category === selectedCategory
    const matchStatus = selectedStatus === 'all' || a.status === selectedStatus
    return matchSearch && matchCategory && matchStatus
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
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

      {/* Asset Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <Package className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-600">No assets found</p>
          <p className="text-sm text-gray-400 mt-1">
            {assets.length === 0 ? 'Add your first asset to get started' : 'Try adjusting your filters'}
          </p>
          <Link
            href="/assets/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add Asset
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Asset</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Purchase Date</th>
                <th className="relative px-6 py-3"><span className="sr-only">View</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{asset.name}</p>
                      <p className="text-xs text-gray-500">
                        {[asset.asset_tag, asset.manufacturer, asset.model].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{asset.category}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{asset.location ?? '—'}</td>
                  <td className="px-6 py-4">
                    <Badge className={statusColor(asset.status)}>{asset.status}</Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(asset.purchase_date)}</td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/assets/${asset.id}`}
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
