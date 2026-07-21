'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { formatDate, statusColor } from '@/lib/utils'
import { Asset } from '@/types/database'
import Link from 'next/link'
import { Search, Package, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown, Download, ChevronDown, X } from 'lucide-react'
import * as XLSX from 'xlsx'

const CATEGORIES = ['All', 'Analytical', 'Lab Equipment', 'HVAC', 'IT/Network', 'Electrical', 'Mechanical', 'Other']
const STATUSES = ['all', 'active', 'inactive', 'repair', 'decommissioned']

interface AssetsClientProps {
  assets: Asset[]
}

type SortField = 'name' | 'category' | 'location' | 'status' | 'purchase_date' | 'date_installed'
type SortDir = 'asc' | 'desc'

const FILTERS_STORAGE_KEY = 'assets-list-filters'

interface StoredFilters {
  search: string
  selectedCategory: string
  selectedStatus: string
  sortField: SortField
  sortDir: SortDir
}

function loadStoredFilters(): Partial<StoredFilters> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.sessionStorage.getItem(FILTERS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Partial<StoredFilters>) : {}
  } catch {
    return {}
  }
}

function exportAssets(assets: Asset[], format: 'xlsx' | 'csv') {
  const rows = assets.map((a) => ({
    'Name': a.name,
    'Asset Tag': a.asset_tag ?? '',
    'Category': a.category,
    'Manufacturer': a.manufacturer ?? '',
    'Model': a.model ?? '',
    'Serial Number': a.serial_number ?? '',
    'Location': a.location ?? '',
    'Status': a.status,
    'Purchase Date': a.purchase_date ?? '',
    'Date Installed': a.date_installed ?? '',
    'Purchase Cost': a.purchase_cost ?? '',
    'Notes': a.notes ?? '',
    'Power Requirements': a.power_requirements ?? '',
    'Dimensions': a.dimensions ?? '',
    'Weight': a.weight ?? '',
    'Internet Requirements': a.internet_requirements ?? '',
    'Water Requirements': a.water_requirements ?? '',
    'Air/Gas Requirements': a.air_gas_requirements ?? '',
    'Ventilation Requirements': a.ventilation_requirements ?? '',
    'Environmental Requirements': a.environmental_requirements ?? '',
    'Facilities Notes': a.facilities_notes ?? '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Assets')
  ws['!cols'] = [
    { wch: 24 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 20 },
    { wch: 16 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
    { wch: 14 }, { wch: 30 }, { wch: 20 }, { wch: 14 }, { wch: 12 },
    { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 24 }, { wch: 24 },
  ]
  const timestamp = new Date().toISOString().slice(0, 10)
  if (format === 'csv') {
    XLSX.writeFile(wb, `assets_${timestamp}.csv`, { bookType: 'csv' })
  } else {
    XLSX.writeFile(wb, `assets_${timestamp}.xlsx`)
  }
}

export default function AssetsClient({ assets }: AssetsClientProps) {
  const router = useRouter()
  const [stored] = useState(loadStoredFilters)
  const [search, setSearch] = useState(stored.search ?? '')
  const [selectedCategory, setSelectedCategory] = useState(stored.selectedCategory ?? 'All')
  const [selectedStatus, setSelectedStatus] = useState(stored.selectedStatus ?? 'all')
  const [sortField, setSortField] = useState<SortField>(stored.sortField ?? 'name')
  const [sortDir, setSortDir] = useState<SortDir>(stored.sortDir ?? 'asc')
  const [exportOpen, setExportOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Persist search and filters so they survive navigating to an asset and back.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const toStore: StoredFilters = { search, selectedCategory, selectedStatus, sortField, sortDir }
      window.sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(toStore))
    } catch {
      // Ignore storage errors (e.g. private mode / quota).
    }
  }, [search, selectedCategory, selectedStatus, sortField, sortDir])

  const filtered = assets.filter((a) => {
    const matchSearch =
      search === '' ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.asset_tag?.toLowerCase().includes(search.toLowerCase())) ||
      (a.serial_number?.toLowerCase().includes(search.toLowerCase())) ||
      (a.model?.toLowerCase().includes(search.toLowerCase())) ||
      (a.location?.toLowerCase().includes(search.toLowerCase())) ||
      (a.manufacturer?.toLowerCase().includes(search.toLowerCase()))
    const matchCategory = selectedCategory === 'All' || a.category === selectedCategory
    const matchStatus = selectedStatus === 'all' || a.status === selectedStatus
    return matchSearch && matchCategory && matchStatus
  })

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      const valA = a[sortField]
      const valB = b[sortField]

      if (sortField === 'purchase_date' || sortField === 'date_installed') {
        const dateA = valA ? new Date(valA).getTime() : 0
        const dateB = valB ? new Date(valB).getTime() : 0
        cmp = dateA - dateB
      } else {
        const strA = (valA ?? '').toString().toLowerCase()
        const strB = (valB ?? '').toString().toLowerCase()
        cmp = strA.localeCompare(strB)
      }

      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortField, sortDir])

  // Keep the selection in sync with the visible rows so a checked asset that is
  // filtered out doesn't linger in a hidden selection.
  const visibleIds = useMemo(() => new Set(sorted.map((a) => a.id)), [sorted])
  const selectedVisible = useMemo(
    () => sorted.filter((a) => selectedIds.has(a.id)),
    [sorted, selectedIds],
  )
  const allVisibleSelected = sorted.length > 0 && selectedVisible.length === sorted.length
  const someVisibleSelected = selectedVisible.length > 0 && !allVisibleSelected

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        // Deselect only the currently visible rows.
        visibleIds.forEach((id) => next.delete(id))
      } else {
        visibleIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  // Export the checked assets when there's a selection, otherwise everything shown.
  const exportRows = selectedVisible.length > 0 ? selectedVisible : sorted

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-gray-400" />
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 text-blue-600" />
      : <ArrowDown className="h-3 w-3 text-blue-600" />
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, tag, serial, model, location, manufacturer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-9 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap items-center">
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

          {/* Export dropdown */}
          <div ref={exportRef} className="relative">
            <button
              onClick={() => setExportOpen((v) => !v)}
              disabled={exportRows.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="h-3.5 w-3.5" />
              {selectedVisible.length > 0 ? `Export (${selectedVisible.length})` : 'Export'}
              <ChevronDown className="h-3 w-3" />
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1 z-10 w-52 rounded-lg border border-gray-200 bg-white shadow-lg">
                <p className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                  {selectedVisible.length > 0
                    ? `${selectedVisible.length} selected asset${selectedVisible.length === 1 ? '' : 's'}`
                    : `All ${sorted.length} asset${sorted.length === 1 ? '' : 's'} shown`}
                </p>
                <button
                  onClick={() => { exportAssets(exportRows, 'xlsx'); setExportOpen(false) }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Export as Excel
                </button>
                <button
                  onClick={() => { exportAssets(exportRows, 'csv'); setExportOpen(false) }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg border-t border-gray-100"
                >
                  Export as CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Asset Grid */}
      {sorted.length === 0 ? (
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
                <th className="px-6 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all assets"
                    checked={allVisibleSelected}
                    ref={(el) => { if (el) el.indeterminate = someVisibleSelected }}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left">
                  <button onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700">
                    Asset <SortIcon field="name" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button onClick={() => toggleSort('category')} className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700">
                    Category <SortIcon field="category" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button onClick={() => toggleSort('location')} className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700">
                    Location <SortIcon field="location" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button onClick={() => toggleSort('status')} className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700">
                    Status <SortIcon field="status" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button onClick={() => toggleSort('purchase_date')} className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700">
                    Purchase Date <SortIcon field="purchase_date" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button onClick={() => toggleSort('date_installed')} className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700">
                    Date Installed <SortIcon field="date_installed" />
                  </button>
                </th>
                <th className="relative px-6 py-3"><span className="sr-only">View</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((asset) => (
                <tr
                  key={asset.id}
                  onClick={() => router.push(`/assets/${asset.id}`)}
                  className={`transition-colors cursor-pointer ${
                    selectedIds.has(asset.id) ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${asset.name}`}
                      checked={selectedIds.has(asset.id)}
                      onChange={() => toggleSelect(asset.id)}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
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
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(asset.date_installed)}</td>
                  <td className="px-6 py-4 text-right">
                    <ChevronRight className="h-4 w-4 text-gray-400" />
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
