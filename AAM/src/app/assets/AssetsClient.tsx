'use client'

import { Fragment, useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { formatDate, statusColor } from '@/lib/utils'
import { Asset, AssetGroup } from '@/types/database'
import Link from 'next/link'
import { Search, Package, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown, Download, ChevronDown, X, Layers, List, Unlink } from 'lucide-react'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import { useAssetCategories } from '@/hooks/useAssetCategories'
import GroupAssetsModal from './GroupAssetsModal'

const STATUSES = ['all', 'active', 'inactive', 'repair', 'decommissioned']
const COLUMN_COUNT = 8

interface AssetsClientProps {
  assets: Asset[]
  groups: AssetGroup[]
}

type SortField = 'name' | 'category' | 'location' | 'status' | 'purchase_date' | 'date_installed'
type SortDir = 'asc' | 'desc'
type ViewMode = 'list' | 'grouped'

const FILTERS_STORAGE_KEY = 'assets-list-filters'

interface StoredFilters {
  search: string
  selectedCategory: string
  selectedStatus: string
  sortField: SortField
  sortDir: SortDir
  viewMode: ViewMode
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

function exportAssets(assets: Asset[], groupsById: Map<string, AssetGroup>, format: 'xlsx' | 'csv') {
  const rows = assets.map((a) => ({
    'Name': a.name,
    'Group': (a.group_id && groupsById.get(a.group_id)?.name) || '',
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
    { wch: 24 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 20 },
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

export default function AssetsClient({ assets, groups }: AssetsClientProps) {
  const router = useRouter()
  const categories = useAssetCategories()
  const groupsById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups])
  const [stored] = useState(loadStoredFilters)
  const [search, setSearch] = useState(stored.search ?? '')
  const [selectedCategory, setSelectedCategory] = useState(stored.selectedCategory ?? 'All')
  const [selectedStatus, setSelectedStatus] = useState(stored.selectedStatus ?? 'all')
  const [sortField, setSortField] = useState<SortField>(stored.sortField ?? 'name')
  const [sortDir, setSortDir] = useState<SortDir>(stored.sortDir ?? 'asc')
  const [viewMode, setViewMode] = useState<ViewMode>(stored.viewMode ?? 'list')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [ungrouping, setUngrouping] = useState(false)
  const [actionError, setActionError] = useState('')
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
      const toStore: StoredFilters = { search, selectedCategory, selectedStatus, sortField, sortDir, viewMode }
      window.sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(toStore))
    } catch {
      // Ignore storage errors (e.g. private mode / quota).
    }
  }, [search, selectedCategory, selectedStatus, sortField, sortDir, viewMode])

  const filtered = assets.filter((a) => {
    const groupName = a.group_id ? groupsById.get(a.group_id)?.name : undefined
    const matchSearch =
      search === '' ||
      (groupName?.toLowerCase().includes(search.toLowerCase())) ||
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

  // Grouped view: each group with visible members, in name order, then everything ungrouped.
  const groupedSections = useMemo(() => {
    const byGroup = new Map<string, Asset[]>()
    const ungrouped: Asset[] = []
    for (const a of sorted) {
      if (a.group_id && groupsById.has(a.group_id)) {
        const list = byGroup.get(a.group_id) ?? []
        list.push(a)
        byGroup.set(a.group_id, list)
      } else {
        ungrouped.push(a)
      }
    }
    const sections = [...byGroup.entries()]
      .map(([id, members]) => ({ group: groupsById.get(id)!, members }))
      .sort((a, b) => a.group.name.localeCompare(b.group.name))
    return { sections, ungrouped }
  }, [sorted, groupsById])

  function toggleGroupCollapsed(id: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectMany(ids: string[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const allSelected = ids.every((id) => next.has(id))
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)))
      return next
    })
  }

  async function removeSelectedFromGroups() {
    const ids = selectedVisible.filter((a) => a.group_id).map((a) => a.id)
    if (ids.length === 0) return
    setUngrouping(true)
    setActionError('')
    const { error } = await createClient().from('assets').update({ group_id: null }).in('id', ids)
    setUngrouping(false)
    if (error) {
      setActionError(error.message)
      return
    }
    router.refresh()
  }

  const selectedInGroups = selectedVisible.filter((a) => a.group_id).length

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

  function renderRow(asset: Asset, nested = false) {
    const group = asset.group_id ? groupsById.get(asset.group_id) : undefined
    return (
      <tr
        key={asset.id}
        onClick={() => router.push(`/assets/${asset.id}`)}
        className={`transition-colors cursor-pointer ${
          selectedIds.has(asset.id) ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-blue-50'
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
        <td className={`px-6 py-4 ${nested ? 'pl-12' : ''}`}>
          <div className={nested ? 'border-l-2 border-blue-200 pl-3' : ''}>
            <p className="text-sm font-medium text-gray-900">{asset.name}</p>
            <p className="text-xs text-gray-500">
              {[asset.asset_tag, asset.manufacturer, asset.model].filter(Boolean).join(' • ')}
            </p>
            {group && !nested && (
              <Link
                href={`/assets/groups/${group.id}`}
                onClick={(e) => e.stopPropagation()}
                className="mt-1 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
              >
                <Layers className="h-3 w-3" />
                {group.name}
              </Link>
            )}
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
    )
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
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter by category"
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="All">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            {selectedCategory !== 'All' && !categories.includes(selectedCategory) && (
              <option value={selectedCategory}>{selectedCategory}</option>
            )}
          </select>
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

          {/* List / grouped view toggle */}
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
            {([
              { mode: 'list', label: 'List', icon: List },
              { mode: 'grouped', label: 'Grouped', icon: Layers },
            ] as const).map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                aria-pressed={viewMode === mode}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  viewMode === mode ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

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
                  onClick={() => { exportAssets(exportRows, groupsById, 'xlsx'); setExportOpen(false) }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Export as Excel
                </button>
                <button
                  onClick={() => { exportAssets(exportRows, groupsById, 'csv'); setExportOpen(false) }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg border-t border-gray-100"
                >
                  Export as CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk actions for the checked assets */}
      {selectedVisible.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
          <p className="text-sm font-medium text-blue-900">
            {selectedVisible.length} selected
          </p>
          <button
            onClick={() => setGroupModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Layers className="h-3.5 w-3.5" />
            Group as one unit
          </button>
          {selectedInGroups > 0 && (
            <button
              onClick={removeSelectedFromGroups}
              disabled={ungrouping}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Unlink className="h-3.5 w-3.5" />
              Remove from group{selectedInGroups === 1 ? '' : 's'}
            </button>
          )}
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs font-medium text-blue-700 hover:text-blue-900"
          >
            Clear selection
          </button>
          {actionError && <p className="w-full text-xs text-red-600">{actionError}</p>}
        </div>
      )}

      <GroupAssetsModal
        open={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        assets={selectedVisible}
        groups={groups}
        onDone={() => { setGroupModalOpen(false); setSelectedIds(new Set()); setViewMode('grouped') }}
      />

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
              {viewMode === 'list' ? (
                sorted.map((asset) => renderRow(asset))
              ) : (
                <>
                  {groupedSections.sections.map(({ group, members }) => {
                    const collapsed = collapsedGroups.has(group.id)
                    const memberIds = members.map((m) => m.id)
                    const checkedCount = memberIds.filter((id) => selectedIds.has(id)).length
                    return (
                      <Fragment key={group.id}>
                        <tr
                          onClick={() => toggleGroupCollapsed(group.id)}
                          className="cursor-pointer bg-slate-50 transition-colors hover:bg-blue-50"
                        >
                          <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              aria-label={`Select all assets in ${group.name}`}
                              checked={checkedCount === memberIds.length}
                              ref={(el) => { if (el) el.indeterminate = checkedCount > 0 && checkedCount < memberIds.length }}
                              onChange={() => toggleSelectMany(memberIds)}
                              className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td colSpan={COLUMN_COUNT - 1} className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
                              <Layers className="h-4 w-4 text-blue-600" />
                              <Link
                                href={`/assets/groups/${group.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-sm font-semibold text-gray-900 hover:text-blue-700 hover:underline"
                              >
                                {group.name}
                              </Link>
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                {members.length} piece{members.length === 1 ? '' : 's'}
                              </span>
                              {group.description && (
                                <span className="hidden truncate text-xs text-gray-500 md:inline">{group.description}</span>
                              )}
                            </div>
                          </td>
                        </tr>
                        {!collapsed && members.map((asset) => renderRow(asset, true))}
                      </Fragment>
                    )
                  })}
                  {groupedSections.ungrouped.length > 0 && groupedSections.sections.length > 0 && (
                    <tr className="no-hover bg-slate-50">
                      <td colSpan={COLUMN_COUNT} className="px-6 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Not grouped
                      </td>
                    </tr>
                  )}
                  {groupedSections.ungrouped.map((asset) => renderRow(asset))}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
