'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Package, Search, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn, statusColor } from '@/lib/utils'
import { type PickerAsset } from '@/lib/assetPicker'

// Re-exported so consumers of the picker can type their asset lists without a
// second import. The constant itself stays in @/lib/assetPicker: Server
// Components cannot read a value out of a 'use client' module.
export type { PickerAsset }

type SearchField = 'name' | 'asset_tag' | 'category' | 'manufacturer' | 'model' | 'serial_number' | 'location' | 'status'

const SEARCH_FIELDS: SearchField[] = [
  'name',
  'asset_tag',
  'model',
  'serial_number',
  'manufacturer',
  'location',
  'category',
  'status',
]

/** `model:1200` style prefixes so a search can be aimed at one field. */
const FIELD_ALIASES: Record<string, SearchField> = {
  name: 'name',
  asset: 'name',
  tag: 'asset_tag',
  'asset_tag': 'asset_tag',
  'asset-tag': 'asset_tag',
  model: 'model',
  'model#': 'model',
  serial: 'serial_number',
  'serial#': 'serial_number',
  serial_number: 'serial_number',
  sn: 'serial_number',
  mfr: 'manufacturer',
  make: 'manufacturer',
  manufacturer: 'manufacturer',
  loc: 'location',
  location: 'location',
  cat: 'category',
  category: 'category',
  status: 'status',
}

const FIELD_LABELS: Record<SearchField, string> = {
  name: 'Name',
  asset_tag: 'Tag',
  model: 'Model',
  serial_number: 'Serial',
  manufacturer: 'Manufacturer',
  location: 'Location',
  category: 'Category',
  status: 'Status',
}

const MAX_RESULTS = 150

interface QueryToken {
  field: SearchField | null
  term: string
}

/** Loose compare so "ABC-123" still finds a serial stored as "ABC123". */
function normalize(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '').toLowerCase()
}

function parseQuery(query: string): QueryToken[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => {
      const idx = raw.indexOf(':')
      if (idx > 0) {
        const field = FIELD_ALIASES[raw.slice(0, idx)]
        const term = raw.slice(idx + 1)
        if (field && term) return { field, term }
      }
      return { field: null, term: raw }
    })
}

function fieldValue(asset: PickerAsset, field: SearchField): string {
  return (asset[field] ?? '').toString()
}

function matchScore(haystack: string, term: string): number {
  if (!haystack) return 0
  const value = haystack.toLowerCase()
  if (value === term) return 6
  if (value.startsWith(term)) return 4
  if (value.includes(term)) return 2
  const loose = normalize(haystack)
  const looseTerm = normalize(term)
  if (looseTerm && loose.includes(looseTerm)) return 1
  return 0
}

/** Returns null when the asset fails any token, otherwise a relevance score. */
function scoreAsset(asset: PickerAsset, tokens: QueryToken[]): number | null {
  let total = 0
  for (const token of tokens) {
    const fields = token.field ? [token.field] : SEARCH_FIELDS
    let best = 0
    for (const field of fields) {
      const score = matchScore(fieldValue(asset, field), token.term)
      // Identifier hits are what people usually mean when they type a code.
      const weighted =
        score > 0 && (field === 'asset_tag' || field === 'serial_number' || field === 'model')
          ? score + 1
          : score
      if (weighted > best) best = weighted
    }
    if (best === 0) return null
    total += best
  }
  return total
}

function termsForField(tokens: QueryToken[], field: SearchField): string[] {
  return tokens.filter((t) => t.field === null || t.field === field).map((t) => t.term)
}

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!text || terms.length === 0) return <>{text}</>

  const lower = text.toLowerCase()
  const ranges: [number, number][] = []
  for (const term of terms) {
    if (!term) continue
    let from = lower.indexOf(term)
    while (from !== -1) {
      ranges.push([from, from + term.length])
      from = lower.indexOf(term, from + term.length)
    }
  }
  if (ranges.length === 0) return <>{text}</>

  ranges.sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const range of ranges) {
    const last = merged[merged.length - 1]
    if (last && range[0] <= last[1]) {
      last[1] = Math.max(last[1], range[1])
    } else {
      merged.push([...range] as [number, number])
    }
  }

  const parts: React.ReactNode[] = []
  let cursor = 0
  merged.forEach(([start, end], i) => {
    if (start > cursor) parts.push(text.slice(cursor, start))
    parts.push(
      <mark key={i} className="rounded bg-yellow-100 px-0.5 text-gray-900">
        {text.slice(start, end)}
      </mark>
    )
    cursor = end
  })
  if (cursor < text.length) parts.push(text.slice(cursor))
  return <>{parts}</>
}

export function assetLabel(asset: PickerAsset): string {
  return `${asset.name}${asset.asset_tag ? ` (${asset.asset_tag})` : ''}`
}

function assetMeta(asset: PickerAsset): { field: SearchField; label: string; value: string }[] {
  return (['model', 'serial_number', 'manufacturer', 'location'] as SearchField[])
    .map((field) => ({ field, label: FIELD_LABELS[field], value: fieldValue(asset, field) }))
    .filter((item) => item.value !== '')
}

function distinctValues(assets: PickerAsset[], field: SearchField): string[] {
  const seen = new Set<string>()
  for (const asset of assets) {
    const value = fieldValue(asset, field)
    if (value) seen.add(value)
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b))
}

interface AssetSearchModalProps {
  open: boolean
  onClose: () => void
  assets: PickerAsset[]
  selectedIds: string[]
  multiple?: boolean
  onSelect: (assetId: string) => void
  title?: string
}

export function AssetSearchModal({ open, ...props }: AssetSearchModalProps) {
  // Mounting fresh on each open is what resets the query and filters.
  if (!open) return null
  return <AssetSearchDialog {...props} />
}

function AssetSearchDialog({
  onClose,
  assets,
  selectedIds,
  multiple = false,
  onSelect,
  title = 'Find an asset',
}: Omit<AssetSearchModalProps, 'open'>) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [location, setLocation] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const categories = useMemo(() => distinctValues(assets, 'category'), [assets])
  const statuses = useMemo(() => distinctValues(assets, 'status'), [assets])
  const locations = useMemo(() => distinctValues(assets, 'location'), [assets])

  const tokens = useMemo(() => parseQuery(query), [query])

  const results = useMemo(() => {
    const scored: { asset: PickerAsset; score: number }[] = []
    for (const asset of assets) {
      if (category && fieldValue(asset, 'category') !== category) continue
      if (status && fieldValue(asset, 'status') !== status) continue
      if (location && fieldValue(asset, 'location') !== location) continue
      const score = tokens.length === 0 ? 0 : scoreAsset(asset, tokens)
      if (score === null) continue
      scored.push({ asset, score })
    }
    scored.sort((a, b) => b.score - a.score || a.asset.name.localeCompare(b.asset.name))
    return scored.map((entry) => entry.asset)
  }, [assets, tokens, category, status, location])

  const visible = results.slice(0, MAX_RESULTS)

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0)
    // Restore whatever the host page (or a parent modal) had set, not just ''.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(timer)
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const choose = useCallback(
    (asset: PickerAsset) => {
      onSelect(asset.id)
      if (!multiple) onClose()
    },
    [multiple, onClose, onSelect]
  )

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => Math.min(prev + 1, visible.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const asset = visible[activeIndex]
      if (asset) choose(asset)
    }
  }

  const hasFilters = Boolean(category || status || location)
  const filterSelect = 'rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 sm:p-6" onKeyDown={handleKeyDown}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative mt-10 flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 border-b border-gray-200 px-6 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActiveIndex(0)
              }}
              placeholder="Search name, tag, model #, serial #, manufacturer, location..."
              className="block w-full rounded-lg border border-gray-300 py-2 pl-9 pr-9 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setActiveIndex(0)
                  inputRef.current?.focus()
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {categories.length > 1 && (
              <select className={filterSelect} value={category} onChange={(e) => {
                  setCategory(e.target.value)
                  setActiveIndex(0)
                }} aria-label="Filter by category">
                <option value="">All categories</option>
                {categories.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            )}
            {statuses.length > 1 && (
              <select className={filterSelect} value={status} onChange={(e) => {
                  setStatus(e.target.value)
                  setActiveIndex(0)
                }} aria-label="Filter by status">
                <option value="">Any status</option>
                {statuses.map((value) => (
                  <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>
                ))}
              </select>
            )}
            {locations.length > 1 && (
              <select className={filterSelect} value={location} onChange={(e) => {
                  setLocation(e.target.value)
                  setActiveIndex(0)
                }} aria-label="Filter by location">
                <option value="">All locations</option>
                {locations.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            )}
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setCategory('')
                  setStatus('')
                  setLocation('')
                  setActiveIndex(0)
                }}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Clear filters
              </button>
            )}
            <span className="ml-auto text-xs text-gray-500">
              {results.length} of {assets.length} asset{assets.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Package className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No assets match your search.</p>
              <p className="mt-1 text-xs text-gray-400">Try a model #, serial #, tag, or clear the filters.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {visible.map((asset, index) => {
                const isSelected = selectedIds.includes(asset.id)
                const isActive = index === activeIndex
                return (
                  <li key={asset.id}>
                    <button
                      type="button"
                      data-index={index}
                      onClick={() => choose(asset)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        'flex w-full items-start gap-3 px-6 py-3 text-left transition-colors',
                        isActive ? 'bg-blue-50' : 'hover:bg-gray-50',
                        isSelected && 'bg-blue-50/60'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            <Highlight text={asset.name} terms={termsForField(tokens, 'name')} />
                          </span>
                          {asset.asset_tag && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600">
                              <Highlight text={asset.asset_tag} terms={termsForField(tokens, 'asset_tag')} />
                            </span>
                          )}
                          {asset.status && (
                            <Badge className={statusColor(asset.status)}>{asset.status.replace(/_/g, ' ')}</Badge>
                          )}
                        </div>
                        {assetMeta(asset).length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                            {assetMeta(asset).map((item) => (
                              <span key={item.field}>
                                {item.label}:{' '}
                                <span className="text-gray-700">
                                  <Highlight text={item.value} terms={termsForField(tokens, item.field)} />
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {isSelected && <Check className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          {results.length > visible.length && (
            <p className="border-t border-gray-100 px-6 py-3 text-center text-xs text-gray-500">
              Showing first {visible.length} of {results.length} matches — keep typing to narrow it down.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-6 py-3">
          <p className="hidden text-xs text-gray-500 sm:block">
            Tip: prefix a term to target one field, e.g. <code className="font-mono">model:1260</code> or{' '}
            <code className="font-mono">sn:AB1234</code>. ↑↓ to move, Enter to pick.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {multiple ? 'Done' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface AssetPickerProps {
  assets: PickerAsset[]
  value: string
  onChange: (assetId: string) => void
  label?: string
  hint?: string
  error?: string
  placeholder?: string
  allowClear?: boolean
  modalTitle?: string
  disabled?: boolean
}

/** Single-asset field: shows the linked asset and opens the search modal. */
export function AssetPicker({
  assets,
  value,
  onChange,
  label,
  hint,
  error,
  placeholder = 'Search for an asset...',
  allowClear = true,
  modalTitle = 'Find an asset',
  disabled,
}: AssetPickerProps) {
  const [open, setOpen] = useState(false)
  const selected = assets.find((a) => a.id === value)
  const meta = selected ? assetMeta(selected) : []

  return (
    <div className="space-y-1">
      {label && <span className="block text-sm font-medium text-gray-700">{label}</span>}
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm transition-colors',
          error && 'border-red-500',
          disabled && 'bg-gray-50'
        )}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-not-allowed"
        >
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          {selected ? (
            <span className="min-w-0">
              <span className="block truncate text-sm text-gray-900">
                {selected.name}
                {selected.asset_tag && <span className="ml-1 text-gray-500">({selected.asset_tag})</span>}
              </span>
              {meta.length > 0 && (
                <span className="block truncate text-xs text-gray-500">
                  {meta.map((item) => `${item.label}: ${item.value}`).join(' • ')}
                </span>
              )}
            </span>
          ) : value ? (
            <span className="text-sm text-gray-500">Linked asset (not in list)</span>
          ) : (
            <span className="truncate text-sm text-gray-400">{placeholder}</span>
          )}
        </button>
        {value && allowClear && !disabled && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Clear asset"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {value ? 'Change' : 'Search'}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}

      <AssetSearchModal
        open={open}
        onClose={() => setOpen(false)}
        assets={assets}
        selectedIds={value ? [value] : []}
        onSelect={(assetId) => onChange(assetId)}
        title={modalTitle}
      />
    </div>
  )
}

interface AssetMultiPickerProps {
  assets: PickerAsset[]
  values: string[]
  onChange: (assetIds: string[]) => void
  label?: string
  hint?: string
  modalTitle?: string
}

/** Multi-asset field (e.g. assets covered by a service contract). */
export function AssetMultiPicker({
  assets,
  values,
  onChange,
  label,
  hint,
  modalTitle = 'Find assets',
}: AssetMultiPickerProps) {
  const [open, setOpen] = useState(false)
  const selected = assets.filter((a) => values.includes(a.id))

  function toggle(assetId: string) {
    onChange(values.includes(assetId) ? values.filter((id) => id !== assetId) : [...values, assetId])
  }

  return (
    <div className="space-y-1">
      {label && <span className="block text-sm font-medium text-gray-700">{label}</span>}
      <div className="rounded-lg border border-gray-300 bg-white p-2 shadow-sm">
        {selected.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {selected.map((asset) => (
              <span
                key={asset.id}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-sm text-blue-700"
              >
                {assetLabel(asset)}
                <button
                  type="button"
                  onClick={() => toggle(asset.id)}
                  className="text-blue-500 hover:text-blue-700"
                  aria-label={`Remove ${asset.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left text-sm text-gray-500 hover:bg-gray-50"
        >
          <Search className="h-4 w-4 text-gray-400" />
          Search assets by name, tag, model #, serial #...
        </button>
      </div>
      <p className="text-xs text-gray-500">
        {hint ??
          (selected.length === 0
            ? 'No assets linked yet.'
            : `${selected.length} asset${selected.length === 1 ? '' : 's'} selected`)}
      </p>

      <AssetSearchModal
        open={open}
        onClose={() => setOpen(false)}
        assets={assets}
        selectedIds={values}
        multiple
        onSelect={toggle}
        title={modalTitle}
      />
    </div>
  )
}
